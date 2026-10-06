import logging
import secrets
from datetime import date, datetime, time, timedelta

from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import CharField, Count, Q, Value
from django.db.models.functions import Concat
from django.http import Http404
from django.shortcuts import redirect
from django.utils import timezone

from apps.audit import services as audit
from apps.audit.models import AuditLog
from apps.manuscripts import storage
from apps.notifications.models import Notification

from . import orcid_service
from .emails import send_editor_invite_email, send_editor_role_added_email, send_reviewer_approved_email
from .permissions import IsAdmin, is_admin
from .taxonomy import SPECIALTY_TAG_SLUGS
from .serializers import (
    AdminUserListSerializer,
    ChangePasswordSerializer,
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .account_status import lift_expired_suspensions, set_account_status
from .throttles import AuthRateThrottle, PasswordChangeThrottle
from .models import EditorInvite, UserProfile, UserRole

User = get_user_model()
logger = logging.getLogger(__name__)

# Editor invite links stay valid for three days.
EDITOR_INVITE_TTL = timedelta(hours=72)


# ── Account deactivation (soft delete) ───────────────────────────────────────

def _active_admin_count():
    return (
        User.objects.filter(
            is_active=True,
            roles__role=UserProfile.Role.ADMIN,
            roles__status=UserRole.Status.ACTIVE,
        )
        .distinct()
        .count()
    )



class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Body: { full_name, email, password, role, institution? }
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]  # 5/minute

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)

        # A completed registration resets the progressive auth counter, the same
        # way a successful login does — so the client's immediate auto-login
        # call isn't blocked by the spacing rule.
        if response.status_code == status.HTTP_201_CREATED:
            for throttle in self.get_throttles():
                if hasattr(throttle, 'on_success'):
                    throttle.on_success(request)

        return response


class EmailTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Body: { email, password }
    Returns: { access, refresh, user }
    """
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [AuthRateThrottle]

    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
        except Exception as exc:
            if getattr(exc, 'status_code', None) == status.HTTP_401_UNAUTHORIZED:
                self._record_failure(request)
            raise

        if response.status_code == 200:
            for throttle in self.get_throttles():
                if hasattr(throttle, 'on_success'):
                    throttle.on_success(request)
        elif response.status_code == status.HTTP_401_UNAUTHORIZED:
            self._record_failure(request)

        return response

    @staticmethod
    def _record_failure(request):
        # Only the address typed is kept, never the password. A failure to write
        # the entry must not turn a wrong-password reply into a server error.
        email = str(request.data.get('email', '')).strip().lower()[:254]
        known = User.objects.filter(email__iexact=email).first() if email else None
        try:
            audit.record(
                type=AuditLog.Type.LOGIN_FAILURE, action='failed',
                summary=f'Failed sign-in for {email or "(no email given)"}',
                target=known, target_email=email if '@' in email else '',
                details={} if known else {'account_exists': False},
                request=request,
            )
        except Exception:
            logger.exception('could not record failed sign-in')


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body: { refresh }
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'detail': 'Refresh token is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {'detail': 'Successfully logged out.'},
                status=status.HTTP_200_OK
            )
        except TokenError:
            return Response(
                {'detail': 'Invalid or expired refresh token.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class MeView(APIView):
    """
    GET   /api/users/me/  → return own profile
    PATCH /api/users/me/  → update own profile
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request):
        """Self-service account deletion — soft delete (deactivate). The row and
        its history stay; the user can no longer sign in."""
        user = request.user
        if is_admin(user) and _active_admin_count() <= 1:
            return Response(
                {'detail': 'You are the only active admin. Assign another admin before deleting your account.'},
                status=status.HTTP_409_CONFLICT,
            )
        set_account_status(
            user, UserProfile.AccountStatus.DEACTIVATED, actor=user,
            reason='Deleted by the account holder.', request=request,
            summary=f'{user.get_full_name() or user.email} deleted their own account',
        )
        return Response({'detail': 'Your account has been deleted.'}, status=status.HTTP_200_OK)


# ── Reviewer application ──────────────────────────────────────────────────────

class ApplyReviewerView(APIView):
    """
    POST /api/users/apply-reviewer/
    Lets an authenticated author apply to also become a reviewer.
    Body (optional): { expertise_areas, qualifications }
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        # Reuse request.user.profile (creating it if missing) rather than a
        # separate get_or_create() query — see the same fix/comment in
        # RegisterSerializer.create() for why a separately-fetched object can
        # leave a stale cached profile behind for the response serializer.
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=request.user)

        if not profile.orcid_id:
            return Response(
                {'detail': 'Link your ORCID iD before applying to become a reviewer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_role = UserRole.objects.filter(user=request.user, role=UserProfile.Role.REVIEWER).first()
        if existing_role and existing_role.status == UserRole.Status.ACTIVE:
            return Response(
                {'detail': 'You already hold the reviewer role.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if existing_role and existing_role.status == UserRole.Status.PENDING:
            return Response(
                {'detail': 'Your reviewer application is already pending review.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expertise = request.data.get('expertise_areas', '').strip()
        if expertise:
            profile.expertise_areas = expertise
            profile.save(update_fields=['expertise_areas'])

        tags = request.data.get('specialty_tags')
        if tags is not None:
            unknown = sorted(set(tags) - SPECIALTY_TAG_SLUGS)
            if unknown:
                return Response(
                    {'detail': f'Unknown specialty tag(s): {", ".join(unknown)}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.specialty_tags = tags
            profile.save(update_fields=['specialty_tags'])

        UserRole.objects.update_or_create(
            user=request.user, role=UserProfile.Role.REVIEWER,
            defaults={'status': UserRole.Status.PENDING},
        )

        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class ReviewerApprovalView(APIView):
    """
    PATCH /api/users/<pk>/reviewer-status/
    Admin only. Body: { "action": "approve" | "reject" }

    On approve: activates the reviewer role, and notifies the applicant
    in-app and by email that their account is active and they can log in.
    """
    # IsAdmin (the UserRole table), not DRF's IsAdminUser (Django's is_staff flag):
    # an admin invited later is not staff, and would otherwise be refused here
    # while every other admin screen let them in.
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    def patch(self, request, pk):
        action = request.data.get('action')
        if action not in ('approve', 'reject'):
            return Response(
                {'detail': 'action must be "approve" or "reject".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = UserProfile.objects.get_or_create(user=user)
        if action == 'approve' and not profile.orcid_id:
            return Response(
                {'detail': 'Reviewer approval requires a linked ORCID iD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = (
            UserRole.Status.ACTIVE if action == 'approve' else UserRole.Status.REJECTED
        )
        with transaction.atomic():
            UserRole.objects.update_or_create(
                user=user, role=UserProfile.Role.REVIEWER,
                defaults={'status': new_status},
            )
            name = user.get_full_name() or user.email
            audit.record(
                type=AuditLog.Type.ROLE_CHANGE, action=action,
                summary=(f'Approved {name} as a reviewer' if action == 'approve'
                         else f'Rejected the reviewer application from {name}'),
                actor=request.user, target=user, role=UserProfile.Role.REVIEWER,
                request=request,
            )

        if action == 'approve':
            Notification.objects.create(
                recipient=user,
                category=Notification.Category.ROLE,
                title='Your reviewer account is active',
                body='An administrator approved your reviewer application. You can now receive review invitations.',
            )
            try:
                send_reviewer_approved_email(user)
            except Exception:
                logger.exception('reviewer-approved email failed for %s', user.email)

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


# ── ORCID ─────────────────────────────────────────────────────────────────────

class OrcidAuthUrlView(APIView):
    """
    GET /api/users/orcid/url/?role=author|reviewer
    Returns the ORCID authorization URL + a state token.
    The frontend must store `state` (e.g. sessionStorage) and send it
    back in the callback request.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def get(self, request):
        role = request.query_params.get('role', UserProfile.Role.AUTHOR)
        if role not in {UserProfile.Role.AUTHOR, UserProfile.Role.REVIEWER}:
            role = UserProfile.Role.AUTHOR

        state = orcid_service.generate_state()
        state_hash = orcid_service.hash_state(state)

        # Store the requested role alongside the state hash — 10 min, one-time use
        cache.set(f'orcid_state:{state_hash}', role, timeout=600)

        return Response({
            'auth_url': orcid_service.build_auth_url(state),
            'state': state,
        })


class OrcidCallbackView(APIView):
    """
    POST /api/users/orcid/callback/
    Body: { code, state }

    - If user is authenticated (Bearer token sent) → links ORCID iD and/or
      adds the requested role to their existing account.
    - If user is NOT authenticated → creates a new account using the
      ORCID record (or logs them in if that ORCID iD already exists),
      with the requested role.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        code = request.data.get('code')
        state = request.data.get('state')

        if not code or not state:
            return Response(
                {'detail': 'code and state are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify state (CSRF protection) — one-time use, also carries requested role
        state_hash = orcid_service.hash_state(state)
        requested_role = cache.get(f'orcid_state:{state_hash}')
        if not requested_role:
            return Response(
                {'detail': 'Invalid or expired state token.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        cache.delete(f'orcid_state:{state_hash}')

        # Exchange code for token
        try:
            token_data = orcid_service.exchange_code_for_token(code)
        except Exception:
            return Response(
                {'detail': 'Failed to authenticate with ORCID. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        orcid_id = token_data.get('orcid')
        access_token = token_data.get('access_token')

        if not orcid_id or not access_token:
            return Response(
                {'detail': 'Incomplete response from ORCID.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch ORCID public record (name, email)
        try:
            profile_data = orcid_service.fetch_orcid_record(orcid_id, access_token)
        except Exception:
            profile_data = {
                'orcid_id': orcid_id,
                'email': token_data.get('email'),
                'first_name': token_data.get('name', '').split()[0] if token_data.get('name') else '',
                'last_name': ' '.join(token_data.get('name', '').split()[1:]) if token_data.get('name') else '',
            }

        # ── Case 1: Logged-in user linking ORCID / adding a role ────────────
        if request.user and request.user.is_authenticated:
            existing = User.objects.filter(profile__orcid_id=orcid_id).exclude(pk=request.user.pk).first()
            if existing:
                return Response(
                    {'detail': 'This ORCID iD is already linked to another account.'},
                    status=status.HTTP_409_CONFLICT
                )

            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            already_linked = bool(profile.orcid_id)
            if profile.orcid_id and profile.orcid_id.lower() != orcid_id.lower():
                return Response(
                    {'detail': 'This account is already linked to a different ORCID iD.'},
                    status=status.HTTP_409_CONFLICT,
                )

            if not profile.orcid_id:
                profile.orcid_id = orcid_id
                profile.save(update_fields=['orcid_id'])

            role_status = (
                UserRole.Status.PENDING if requested_role == UserProfile.Role.REVIEWER
                else UserRole.Status.ACTIVE
            )
            role_obj, role_created = UserRole.objects.get_or_create(
                user=request.user, role=requested_role,
                defaults={'status': role_status},
            )

            if already_linked and not role_created:
                return Response({
                    'detail': 'This ORCID iD is already registered with this role on your account.',
                    'already_registered': True,
                    'user': UserSerializer(request.user).data,
                })

            return Response({
                'detail': 'ORCID iD linked successfully.',
                'already_registered': False,
                'user': UserSerializer(request.user).data,
            })

        # ── Case 2: Not logged in — find existing-by-orcid/email, or create ─
        try:
            user, created = self._get_or_create_user(profile_data, requested_role)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
                'created': created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @staticmethod
    def _get_or_create_user(profile_data: dict, requested_role: str):
        orcid_id = profile_data['orcid_id']
        email = profile_data.get('email')
        role_status = (
            UserRole.Status.PENDING if requested_role == UserProfile.Role.REVIEWER
            else UserRole.Status.ACTIVE
        )

        # 1. Already linked to this ORCID iD → ensure they have the requested role too
        existing = User.objects.filter(profile__orcid_id=orcid_id).first()
        if existing:
            UserRole.objects.get_or_create(
                user=existing, role=requested_role, defaults={'status': role_status},
            )
            return existing, False

        # 2. Found by email → link ORCID + add requested role
        if email:
            existing = User.objects.filter(email__iexact=email).first()
            if existing:
                profile, _ = UserProfile.objects.get_or_create(user=existing)
                if profile.orcid_id and profile.orcid_id.lower() != orcid_id.lower():
                    raise ValueError('An account with this email is already linked to a different ORCID iD.')
                if not profile.orcid_id:
                    profile.orcid_id = orcid_id
                    profile.save(update_fields=['orcid_id'])
                UserRole.objects.get_or_create(
                    user=existing, role=requested_role, defaults={'status': role_status},
                )
                return existing, False

        # 3. Brand new account
        if not email:
            email = f"orcid_{orcid_id.replace('-', '')}@orcid.placeholder"

        user = User.objects.create_user(
            username=email, email=email,
            first_name=profile_data.get('first_name', ''),
            last_name=profile_data.get('last_name', ''),
        )
        UserProfile.objects.update_or_create(
            user=user,
            defaults={'role': requested_role, 'status': UserProfile.Status.ACTIVE, 'orcid_id': orcid_id},
        )
        UserRole.objects.create(user=user, role=requested_role, status=role_status)
        return user, True


# ── Editor onboarding ────────────────────────────────────────────────────────

def _grant_editor_role(user):
    """Give an existing user an active editor role. Returns True if newly added."""
    role, created = UserRole.objects.get_or_create(
        user=user,
        role=UserProfile.Role.EDITOR,
        defaults={'status': UserRole.Status.ACTIVE},
    )
    if not created and role.status != UserRole.Status.ACTIVE:
        role.status = UserRole.Status.ACTIVE
        role.save(update_fields=['status'])
        created = True
    return created


def _tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    }


def _invite_dict(invite):
    return {
        'id': invite.id,
        'email': invite.email,
        'name': invite.name,
        'institution': invite.institution,
        'specialty_tags': invite.specialty_tags,
        'orcid_id': invite.orcid_id,
        'created_at': invite.created_at,
        'expires_at': invite.expires_at,
        'expired': not invite.is_valid(),
    }


def _clean_specialty_tags(raw):
    """Validate an incoming specialty_tags list against the shared taxonomy.
    Returns (tags, error_detail) — error_detail is None on success."""
    if raw is None:
        return [], None
    unknown = sorted(set(raw) - SPECIALTY_TAG_SLUGS)
    if unknown:
        return None, f'Unknown specialty tag(s): {", ".join(unknown)}'
    return list(raw), None


class EditorOnboardView(APIView):
    """
    GET  /api/users/editors/   (admin only) → pending (unaccepted) editor invites
    POST /api/users/editors/   (admin only)
    Body: { email, name, institution?, specialty_tags?, orcid_id? }

    - email already has an account → add the editor role, email them, and
      apply any of institution/specialty_tags/orcid_id that were supplied to
      their existing profile.
    - otherwise → create a pending invite (carrying those same fields) and
      email an activation link. The fields land on the new UserProfile when
      the invite is accepted.
    """
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    def get(self, request):
        invites = EditorInvite.objects.filter(accepted_at__isnull=True)
        return Response([_invite_dict(i) for i in invites])

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        name = (request.data.get('name') or '').strip()
        institution = (request.data.get('institution') or '').strip()
        orcid_id = (request.data.get('orcid_id') or '').strip()
        specialty_tags, tag_error = _clean_specialty_tags(request.data.get('specialty_tags'))
        if tag_error:
            return Response({'detail': tag_error}, status=status.HTTP_400_BAD_REQUEST)
        if not email or '@' not in email:
            return Response({'detail': 'A valid email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = User.objects.filter(email__iexact=email).first()
        # ORCID iDs are unique across profiles; checking here gives the admin a
        # clear message now instead of a failed activation later.
        if orcid_id:
            taken = UserProfile.objects.filter(orcid_id=orcid_id)
            if existing is not None:
                taken = taken.exclude(user=existing)
            if taken.exists():
                return Response(
                    {'detail': 'That ORCID iD already belongs to another account.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if existing is not None:
            if is_admin(existing):
                return Response(
                    {'detail': 'Administrator accounts cannot be given the editor role.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if not existing.is_active:
                return Response(
                    {'detail': 'This address belongs to a suspended or deleted account. Restore the account first.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            with transaction.atomic():
                added = _grant_editor_role(existing)
                if added:
                    audit.record(
                        type=AuditLog.Type.ROLE_CHANGE, action='grant',
                        summary=f'Promoted {existing.get_full_name() or existing.email} to editor (via editor invitation)',
                        actor=request.user, target=existing, role=UserProfile.Role.EDITOR,
                        request=request,
                    )
            if institution or specialty_tags or orcid_id:
                try:
                    profile = existing.profile
                except UserProfile.DoesNotExist:
                    profile = UserProfile.objects.create(user=existing)
                if institution:
                    profile.institution = institution
                if specialty_tags:
                    profile.specialty_tags = specialty_tags
                if orcid_id:
                    profile.orcid_id = orcid_id
                profile.save()
            if added:
                Notification.objects.create(
                    recipient=existing,
                    category=Notification.Category.ROLE,
                    title='You are now an editor',
                    body='An administrator granted your account the editor role.',
                )
                try:
                    send_editor_role_added_email(existing)
                except Exception:
                    logger.exception('editor role-added email failed for %s', email)
                return Response(
                    {'status': 'role_added', 'email': email,
                     'detail': 'Editor role added to the existing account.'},
                    status=status.HTTP_200_OK,
                )
            return Response(
                {'status': 'already_editor', 'email': email,
                 'detail': 'This account already holds the editor role.'},
                status=status.HTTP_200_OK,
            )

        # New person → issue a fresh single-use invite (supersede any pending one).
        EditorInvite.objects.filter(email__iexact=email, accepted_at__isnull=True).delete()
        invite = EditorInvite.objects.create(
            email=email,
            name=name,
            institution=institution,
            specialty_tags=specialty_tags,
            orcid_id=orcid_id,
            token=secrets.token_urlsafe(32),
            invited_by=request.user,
            expires_at=timezone.now() + EDITOR_INVITE_TTL,
        )
        try:
            send_editor_invite_email(invite)
        except Exception:
            logger.exception('editor invite email failed for %s', email)
            invite.delete()
            return Response(
                {'detail': 'Could not send the invitation email. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Recorded only once the email has gone: an invite that never left is
        # deleted above and never existed as far as the invitee is concerned.
        audit.record(
            type=AuditLog.Type.INVITATION, action='invite',
            summary=f'Invited {name or email} to become an editor',
            actor=request.user, target_email=email, role=UserProfile.Role.EDITOR,
            details={'invite_id': invite.pk, 'expires_at': invite.expires_at.isoformat()},
            request=request,
        )

        return Response(
            {'status': 'invited', **_invite_dict(invite)},
            status=status.HTTP_201_CREATED,
        )


class EditorInviteDetailView(APIView):
    """
    DELETE /api/users/editors/<invite_id>/   (admin only)
    Cancel a pending editor invite — e.g. it was sent to the wrong address. An
    already-accepted invite cannot be cancelled here (the account exists; manage
    the user instead).
    """
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    def delete(self, request, invite_id):
        invite = EditorInvite.objects.filter(pk=invite_id).first()
        if invite is None:
            return Response({'detail': 'Invite not found.'}, status=status.HTTP_404_NOT_FOUND)
        if invite.accepted_at is not None:
            return Response(
                {'detail': 'This invite has already been accepted and cannot be cancelled.'},
                status=status.HTTP_409_CONFLICT,
            )
        with transaction.atomic():
            audit.record(
                type=AuditLog.Type.INVITATION, action='cancel',
                summary=f'Cancelled the editor invitation for {invite.name or invite.email}',
                actor=request.user, target_email=invite.email, role=UserProfile.Role.EDITOR,
                details={'invite_id': invite.pk},
                request=request,
            )
            invite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Admin user management ────────────────────────────────────────────────────

def _page_param(raw, default, lo, hi):
    try:
        return max(lo, min(hi, int(raw)))
    except (TypeError, ValueError):
        return default


class AdminUserListView(APIView):
    """
    GET /api/users/?page=&page_size=&search=&role=&status=&reviewer_status=
    (admin only) → one page of users, newest first, plus filter counts.

    See listUsers in api/admin.js for the contract. Every filter and count is a
    database query, so response size and time stay flat as the user base grows.
    """
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    ROLES = (UserProfile.Role.AUTHOR, UserProfile.Role.REVIEWER, UserProfile.Role.EDITOR, UserProfile.Role.ADMIN)

    # A deleted account is blocked and not suspended. The negated Q keeps users
    # with no profile row at all, which are treated as deleted everywhere else.
    SUSPENDED = Q(is_active=False, profile__account_status=UserProfile.AccountStatus.SUSPENDED)
    DELETED = Q(is_active=False) & ~Q(profile__account_status=UserProfile.AccountStatus.SUSPENDED)
    NOT_DELETED = Q(is_active=True) | SUSPENDED

    @staticmethod
    def _holds(role, role_status=UserRole.Status.ACTIVE):
        return Q(roles__role=role, roles__status=role_status)

    def get(self, request):
        # So the list never shows a suspension as still running past its end date.
        lift_expired_suspensions()
        params = request.query_params

        role = params.get('role', '').strip()
        if role and role not in self.ROLES:
            return Response({'detail': f'Unknown role: {role}'}, status=status.HTTP_400_BAD_REQUEST)
        account = params.get('status', '').strip()
        if account and account not in UserProfile.AccountStatus.values:
            return Response({'detail': f'Unknown status: {account}'}, status=status.HTTP_400_BAD_REQUEST)
        reviewer_status = params.get('reviewer_status', '').strip()
        if reviewer_status and reviewer_status != UserRole.Status.PENDING:
            return Response({'detail': "reviewer_status must be 'pending'."}, status=status.HTTP_400_BAD_REQUEST)

        base = User.objects.all()
        search = params.get('search', '').strip()
        if search:
            base = base.annotate(
                full_name=Concat('first_name', Value(' '), 'last_name', output_field=CharField()),
            ).filter(
                Q(email__icontains=search) | Q(first_name__icontains=search)
                | Q(last_name__icontains=search) | Q(full_name__icontains=search)
            )

        # One aggregate query for every chip. distinct=True because the role
        # conditions join UserRole, which repeats a user once per role held.
        count_filters = {
            'all': self.NOT_DELETED,
            'suspended': self.SUSPENDED,
            'deleted': self.DELETED,
            **{r.value: self.NOT_DELETED & self._holds(r) for r in self.ROLES},
        }
        counts = base.aggregate(**{
            name: Count('id', filter=condition, distinct=True) for name, condition in count_filters.items()
        })

        qs = base
        if account == UserProfile.AccountStatus.ACTIVE:
            qs = qs.filter(is_active=True)
        elif account == UserProfile.AccountStatus.SUSPENDED:
            qs = qs.filter(self.SUSPENDED)
        elif account == UserProfile.AccountStatus.DEACTIVATED:
            qs = qs.filter(self.DELETED)
        else:
            qs = qs.filter(self.NOT_DELETED)
        # (user, role) is unique, so each of these joins matches at most one row
        # per user and needs no DISTINCT.
        if role:
            qs = qs.filter(self._holds(role))
        if reviewer_status:
            qs = qs.filter(self._holds(UserProfile.Role.REVIEWER, UserRole.Status.PENDING))

        page_size = _page_param(params.get('page_size'), self.DEFAULT_PAGE_SIZE, 1, self.MAX_PAGE_SIZE)
        page = _page_param(params.get('page'), 1, 1, 10**6)
        total = qs.count()
        start = (page - 1) * page_size
        rows = (
            qs.select_related('profile').prefetch_related('roles')
            .order_by('-date_joined', '-id')[start:start + page_size]
        )
        return Response({
            'results': AdminUserListSerializer(rows, many=True).data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'counts': counts,
        })


class AdminUserStatusView(APIView):
    """
    PATCH /api/users/<pk>/status/   (admin only)
    Body: { status: 'active' | 'suspended' | 'deactivated', reason, suspended_until? }

    See patchUserStatus in api/admin.js for the contract and account_status.py
    for what each state does. Admins cannot change their own status or another
    admin's.
    """
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    def patch(self, request, pk):
        target = User.objects.filter(pk=pk).first()
        if target is None:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        if target.pk == request.user.pk:
            return Response(
                {'detail': 'Use your account settings to delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if is_admin(target):
            return Response(
                {'detail': 'Administrator accounts cannot be deactivated here.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = (request.data.get('status') or '').lower()
        if new_status not in ('active', 'deactivated', 'suspended'):
            return Response(
                {'detail': "status must be 'active', 'deactivated' or 'suspended'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = str(request.data.get('reason') or '').strip()
        if new_status != 'active' and not reason:
            return Response(
                {'detail': 'A reason is required to suspend or delete an account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        until = None
        raw_until = str(request.data.get('suspended_until') or '').strip()
        if raw_until:
            if new_status != 'suspended':
                return Response(
                    {'detail': 'suspended_until only applies to a suspension.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                day = date.fromisoformat(raw_until)
            except ValueError:
                return Response(
                    {'detail': 'suspended_until must be a date in YYYY-MM-DD form.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if day <= timezone.localdate():
                return Response(
                    {'detail': 'The suspension must end on a future date.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Access comes back at the start of that day, in the platform's timezone.
            until = timezone.make_aware(datetime.combine(day, time.min))

        _, released = set_account_status(
            target, new_status, actor=request.user, reason=reason, until=until, request=request,
        )
        target.refresh_from_db()
        return Response({
            **AdminUserListSerializer(target).data,
            'released_reviews': len(released),
        })


class AdminUserRoleView(APIView):
    """
    PATCH /api/users/<pk>/roles/   (admin only)
    Body: { role: 'editor', action: 'grant' | 'revoke' }

    How editors are made from existing accounts. See patchUserRole in
    api/admin.js for the contract.
    """
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]
    PROMOTABLE_ROLES = (UserProfile.Role.EDITOR,)

    def patch(self, request, pk):
        role = request.data.get('role')
        action = request.data.get('action')
        if action not in ('grant', 'revoke'):
            return Response({'detail': "action must be 'grant' or 'revoke'."}, status=status.HTTP_400_BAD_REQUEST)
        if role not in self.PROMOTABLE_ROLES:
            return Response(
                {'detail': f"The '{role}' role cannot be granted or revoked here. Administrators are invite-only."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        target = User.objects.filter(pk=pk).first()
        if target is None:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        # Covers the caller too, since only admins reach this view. Without it an
        # admin could grant themselves editor and record decisions they are barred from.
        if is_admin(target):
            return Response(
                {'detail': 'Administrator accounts cannot have their roles changed here.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        name = target.get_full_name() or target.email
        with transaction.atomic():
            if action == 'grant':
                changed = _grant_editor_role(target)
                if changed:
                    audit.record(
                        type=AuditLog.Type.ROLE_CHANGE, action='grant',
                        summary=f'Promoted {name} to editor',
                        actor=request.user, target=target, role=role, request=request,
                    )
                    Notification.objects.create(
                        recipient=target, category=Notification.Category.ROLE,
                        title='You are now an editor',
                        body='An administrator granted your account the editor role.',
                    )
            else:
                held = target.roles.filter(role=role).first()
                changed = held is not None
                if changed:
                    others = target.roles.filter(status=UserRole.Status.ACTIVE).exclude(role=role).exists()
                    if not others:
                        return Response(
                            {'detail': f'Editor is the only role {name} holds. Deactivate the account instead.'},
                            status=status.HTTP_409_CONFLICT,
                        )
                    held.delete()
                    audit.record(
                        type=AuditLog.Type.ROLE_CHANGE, action='revoke',
                        summary=f'Removed editor access from {name}',
                        actor=request.user, target=target, role=role, request=request,
                    )
                    Notification.objects.create(
                        recipient=target, category=Notification.Category.ROLE,
                        title='Your editor role was removed',
                        body='An administrator removed the editor role from your account.',
                    )

        if action == 'grant' and changed:
            try:
                send_editor_role_added_email(target)
            except Exception:
                logger.exception('editor role-added email failed for %s', target.email)

        return Response(AdminUserListSerializer(target).data)


class EditorInviteView(APIView):
    """
    GET  /api/users/editor-invite/<token>/  → { email, name } if the invite is live
    POST /api/users/editor-invite/<token>/  → body { password }; activates the
         editor account and returns { access, refresh, user }
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]

    def _load(self, token):
        return EditorInvite.objects.filter(token=token).first()

    def get(self, request, token):
        invite = self._load(token)
        if invite is None or not invite.is_valid():
            return Response(
                {'detail': 'This invitation link is invalid or has expired.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({'email': invite.email, 'name': invite.name})

    def post(self, request, token):
        invite = self._load(token)
        if invite is None or not invite.is_valid():
            return Response(
                {'detail': 'This invitation link is invalid or has expired.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        password = request.data.get('password') or ''
        try:
            validate_password(password)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        # Someone may have registered with this email between invite and accept.
        existing = User.objects.filter(email__iexact=invite.email).first()
        if existing is not None:
            # Same rules as inviting an existing account directly.
            if is_admin(existing) or not existing.is_active:
                return Response(
                    {'detail': 'This invitation can no longer be used. Please contact an administrator.'},
                    status=status.HTTP_409_CONFLICT,
                )
            with transaction.atomic():
                if _grant_editor_role(existing):
                    audit.record(
                        type=AuditLog.Type.INVITATION, action='accept',
                        summary=f'{existing.get_full_name() or existing.email} became an editor (the invited address already had an account)',
                        actor=None, target=existing, role=UserProfile.Role.EDITOR,
                        details={'invite_id': invite.pk}, request=request,
                    )
                invite.accepted_at = timezone.now()
                invite.save(update_fields=['accepted_at'])
            return Response(
                {'status': 'existing_account',
                 'detail': 'An account with this email already exists. Please log in instead.'},
                status=status.HTTP_200_OK,
            )

        # The ORCID may have been claimed by someone else since the invite was
        # sent. Drop it rather than fail: the editor can add theirs later.
        orcid_id = invite.orcid_id
        if orcid_id and UserProfile.objects.filter(orcid_id=orcid_id).exists():
            orcid_id = ''

        name = (invite.name or '').split(maxsplit=1)
        with transaction.atomic():
            user = User.objects.create_user(
                username=invite.email,
                email=invite.email,
                first_name=name[0] if name else '',
                last_name=name[1] if len(name) > 1 else '',
                password=password,
            )
            UserProfile.objects.update_or_create(
                user=user,
                defaults={
                    'role': UserProfile.Role.EDITOR,
                    'status': UserProfile.Status.ACTIVE,
                    'institution': invite.institution,
                    'specialty_tags': invite.specialty_tags,
                    'orcid_id': orcid_id,
                },
            )
            UserRole.objects.update_or_create(
                user=user,
                role=UserProfile.Role.EDITOR,
                defaults={'status': UserRole.Status.ACTIVE},
            )
            invite.accepted_at = timezone.now()
            invite.save(update_fields=['accepted_at'])
            audit.record(
                type=AuditLog.Type.INVITATION, action='accept',
                summary=f'{user.get_full_name() or user.email} accepted the invitation and became an editor',
                actor=user, target=user, role=UserProfile.Role.EDITOR,
                details={'invite_id': invite.pk, 'orcid_dropped': bool(invite.orcid_id and not orcid_id)},
                request=request,
            )

        return Response(_tokens_for(user), status=status.HTTP_201_CREATED)

# ── Password ─────────────────────────────────────────────────────────────────

class ChangePasswordView(APIView):
    """
    POST /api/users/me/password/  → change your own password

    Returns a fresh token pair. Changing a password revokes the caller's refresh
    token, so without new credentials the user would be signed out at their next
    silent refresh — which reads as the app breaking, not as security.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PasswordChangeThrottle]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Revoke the refresh token the client is holding. SIMPLE_JWT sets
        # ROTATE_REFRESH_TOKENS but not BLACKLIST_AFTER_ROTATION, so an old
        # refresh token otherwise stays usable for its full 7 days — meaning a
        # password change would not actually lock anyone out.
        supplied_refresh = request.data.get('refresh')
        if supplied_refresh:
            try:
                RefreshToken(supplied_refresh).blacklist()
            except TokenError:
                pass  # already expired or blacklisted — nothing to revoke

        refresh = RefreshToken.for_user(user)
        return Response(
            {'access': str(refresh.access_token), 'refresh': str(refresh)},
            status=status.HTTP_200_OK,
        )


# ── Avatar ───────────────────────────────────────────────────────────────────

AVATAR_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
AVATAR_CONTENT_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
}


class AvatarView(APIView):
    """
    PUT    /api/users/me/avatar/  → set your profile photo (multipart, field `avatar`)
    DELETE /api/users/me/avatar/  → remove it and fall back to initials

    Stored in Supabase Storage under `avatars/<user id>/`, same pattern as
    manuscript files — the project has no MEDIA_ROOT and Render's disk is
    ephemeral, so a local ImageField would lose every photo on redeploy.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [UserRateThrottle]

    def put(self, request):
        upload = request.FILES.get('avatar')
        if not upload:
            return Response(
                {'avatar': 'No file was uploaded.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = (upload.content_type or '').lower()
        if content_type not in AVATAR_CONTENT_TYPES:
            return Response(
                {'avatar': 'Use a JPEG, PNG or WebP image.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > AVATAR_MAX_BYTES:
            return Response(
                {'avatar': 'That image is larger than 2 MB. Please choose a smaller one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        previous_key = profile.avatar_key

        key = storage.build_avatar_key(request.user.id, upload.name)
        try:
            storage.upload_file(upload, key, content_type=content_type)
        except Exception:
            logger.exception('Avatar upload failed for user %s', request.user.id)
            return Response(
                {'detail': 'Could not store the image. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        profile.avatar_key = key
        profile.save(update_fields=['avatar_key'])
        # request.user may already hold a cached `profile` from before the
        # update, and the serializer reads through it. Without this the response
        # carries the OLD avatar_key, so the client stores a user with no photo
        # and the new one does not appear until a reload.
        request.user.profile = profile

        # Only after the new key is committed — a failed cleanup must not cost
        # the user the photo they just uploaded.
        _discard_avatar(previous_key)

        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)

    def delete(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        previous_key = profile.avatar_key
        if previous_key:
            profile.avatar_key = ''
            profile.save(update_fields=['avatar_key'])
            _discard_avatar(previous_key)
        request.user.profile = profile  # see the note in put()
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


class DataExportView(APIView):
    """
    GET /api/users/me/export/

    Returns all personal data stored about the signed-in user as a downloadable
    JSON file — manuscripts submitted, review assignments, decisions received,
    and profile details.  Supports APP 12 (right of access to personal information).
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def get(self, request):
        import json
        from django.http import HttpResponse
        from apps.manuscripts.models import Manuscript, ManuscriptAuthor
        from apps.reviews.models import ReviewAssignment

        user = request.user
        profile = getattr(user, 'profile', None)

        # ── Profile ──────────────────────────────────────────────────────────
        profile_data = {
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'date_joined': user.date_joined.isoformat(),
        }
        if profile:
            profile_data.update({
                'role': profile.role,
                'institution': profile.institution,
                'orcid_id': profile.orcid_id,  # decrypted by EncryptedCharField
                'research_areas': profile.research_areas,
                'expertise_areas': profile.expertise_areas,
                'bio': profile.bio,
                'website': profile.website,
                'specialty_tags': profile.specialty_tags,
            })

        # ── Manuscripts submitted as owner ────────────────────────────────────
        manuscripts = []
        for m in Manuscript.objects.filter(owner=user).order_by('-submitted_at'):
            manuscripts.append({
                'id': m.id,
                'title': m.title,
                'status': m.status,
                'submitted_at': m.submitted_at.isoformat(),
            })

        # ── Manuscripts listed as a byline author ─────────────────────────────
        byline_ids = (
            ManuscriptAuthor.objects
            .filter(email=user.email)
            .exclude(manuscript__owner=user)
            .values_list('manuscript_id', flat=True)
        )
        byline = []
        for m in Manuscript.objects.filter(id__in=byline_ids).order_by('-submitted_at'):
            byline.append({'id': m.id, 'title': m.title, 'status': m.status})

        # ── Review assignments ────────────────────────────────────────────────
        assignments = []
        for a in ReviewAssignment.objects.filter(reviewer=user).select_related('manuscript').order_by('-invited_at'):
            assignments.append({
                'manuscript_title': a.manuscript.title,
                'round': a.round,
                'status': a.status,
                'invited_at': a.invited_at.isoformat(),
                'due_at': a.due_at.isoformat() if a.due_at else None,
            })

        # ── Notifications ─────────────────────────────────────────────────────
        notifs = []
        for n in Notification.objects.filter(recipient=user).order_by('-created_at')[:100]:
            notifs.append({
                'type': n.notification_type,
                'message': n.message,
                'created_at': n.created_at.isoformat(),
                'read': n.is_read,
            })

        payload = {
            'exported_at': timezone.now().isoformat(),
            'profile': profile_data,
            'manuscripts_submitted': manuscripts,
            'manuscripts_as_byline_author': byline,
            'review_assignments': assignments,
            'notifications': notifs,
        }

        response = HttpResponse(
            json.dumps(payload, indent=2, default=str),
            content_type='application/json',
        )
        response['Content-Disposition'] = 'attachment; filename="my_paperbridge_data.json"'
        return response


def _discard_avatar(key):
    """Best-effort delete of a superseded avatar. An orphaned object costs a few
    kilobytes; a raised exception here would fail a request that already
    succeeded."""
    if not key:
        return
    try:
        storage.delete_files([key])
    except Exception:
        logger.warning('Could not delete superseded avatar %s', key, exc_info=True)


class AvatarRedirectView(APIView):
    """
    GET /api/users/<pk>/avatar/  → 302 to a freshly presigned image URL

    Unauthenticated by design. The bucket is private and its presigned URLs
    expire in an hour while an access token lasts eight, and an <img> tag cannot
    carry an Authorization header at all — so the tag points here and the
    signature is regenerated per request. Avatars are shown to other users
    throughout the app, so the image itself is not a secret; the only thing this
    exposes is whether a given user id has a photo.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    def get(self, request, pk):
        profile = UserProfile.objects.filter(user_id=pk).only('avatar_key').first()
        if not profile or not profile.avatar_key:
            raise Http404('No avatar set.')
        url = storage.get_file_url(profile.avatar_key)
        if not url:
            raise Http404('No avatar set.')
        # Not cached: the target is a signed URL that goes stale in an hour, and
        # a cached redirect would outlive it and start 403-ing.
        response = redirect(url)
        response['Cache-Control'] = 'no-store'
        return response
