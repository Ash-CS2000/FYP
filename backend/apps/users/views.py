import logging
import secrets
from datetime import timedelta

from rest_framework import generics, permissions, status
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
from django.utils import timezone

from apps.notifications.models import Notification

from . import orcid_service
from .emails import send_editor_invite_email, send_editor_role_added_email
from .permissions import IsAdmin, is_admin
from .taxonomy import SPECIALTY_TAG_SLUGS
from .serializers import (
    AdminUserListSerializer,
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .throttles import AuthRateThrottle
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


def _set_account_active(user, active):
    """Soft delete / restore: flips login access, keeps the row and its history."""
    user.is_active = active
    user.save(update_fields=['is_active'])
    profile = getattr(user, 'profile', None)
    if profile is not None:
        profile.status = (
            UserProfile.Status.ACTIVE if active else UserProfile.Status.REJECTED
        )
        profile.save(update_fields=['status'])


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
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            for throttle in self.get_throttles():
                if hasattr(throttle, 'on_success'):
                    throttle.on_success(request)

        return response


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
        _set_account_active(user, False)
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
    """
    permission_classes = [permissions.IsAdminUser]
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

        new_status = (
            UserRole.Status.ACTIVE if action == 'approve' else UserRole.Status.REJECTED
        )
        UserRole.objects.update_or_create(
            user=user, role=UserProfile.Role.REVIEWER,
            defaults={'status': new_status},
        )

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
        user, created = self._get_or_create_user(profile_data, requested_role)

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
        'created_at': invite.created_at,
        'expires_at': invite.expires_at,
        'expired': not invite.is_valid(),
    }


class EditorOnboardView(APIView):
    """
    GET  /api/users/editors/   (admin only) → pending (unaccepted) editor invites
    POST /api/users/editors/   (admin only)
    Body: { email, name }

    - email already has an account → add the editor role, email them.
    - otherwise → create a pending invite and email an activation link.
    """
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    def get(self, request):
        invites = EditorInvite.objects.filter(accepted_at__isnull=True)
        return Response([_invite_dict(i) for i in invites])

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        name = (request.data.get('name') or '').strip()
        if not email or '@' not in email:
            return Response({'detail': 'A valid email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = User.objects.filter(email__iexact=email).first()
        if existing is not None:
            added = _grant_editor_role(existing)
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
        invite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Admin user management ────────────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """GET /api/users/  (admin only) → every user, newest first."""
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]
    serializer_class = AdminUserListSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            User.objects.select_related('profile')
            .prefetch_related('roles')
            .order_by('-date_joined')
        )


class AdminUserStatusView(APIView):
    """
    PATCH /api/users/<pk>/status/   (admin only)
    Body: { status: 'active' | 'deactivated' | 'suspended', reason? }

    'deactivated'/'suspended' → soft delete (no login, hidden from pools, history
    kept). 'active' → restore. Admins cannot deactivate themselves or each other.
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
        if new_status == 'active':
            _set_account_active(target, True)
        elif new_status in ('deactivated', 'suspended'):
            _set_account_active(target, False)
        else:
            return Response(
                {'detail': "status must be 'active', 'deactivated' or 'suspended'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
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
            _grant_editor_role(existing)
            invite.accepted_at = timezone.now()
            invite.save(update_fields=['accepted_at'])
            return Response(
                {'status': 'existing_account',
                 'detail': 'An account with this email already exists. Please log in instead.'},
                status=status.HTTP_200_OK,
            )

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
                defaults={'role': UserProfile.Role.EDITOR, 'status': UserProfile.Status.ACTIVE},
            )
            UserRole.objects.update_or_create(
                user=user,
                role=UserProfile.Role.EDITOR,
                defaults={'status': UserRole.Status.ACTIVE},
            )
            invite.accepted_at = timezone.now()
            invite.save(update_fields=['accepted_at'])

        return Response(_tokens_for(user), status=status.HTTP_201_CREATED)