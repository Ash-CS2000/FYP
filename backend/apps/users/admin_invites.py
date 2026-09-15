"""
Administrator invitations — the only way to add an admin after the first one.

Admin is the most powerful role, so this deliberately does more than the editor
flow (see api/admin.js inviteAdmin for the contract):
  - the sender re-enters their own password;
  - the invitee must accept, even with an existing account (by proving it is
    them with that account's password) — nobody is made an admin silently;
  - the link is single-use and expires after AdminInvite.TTL_HOURS;
  - every other administrator is told when an admin is invited and when one
    joins, so a rogue invitation cannot go unnoticed;
  - every step is audited.
"""
import logging
import secrets
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.audit import services as audit
from apps.audit.models import AuditLog
from apps.notifications.models import Notification

from .emails import send_admin_invite_email, send_admin_security_notice
from .models import AdminInvite, EditorInvite, UserProfile, UserRole
from .permissions import IsAdmin, is_admin
from .serializers import UserSerializer
from .throttles import AdminInviteAcceptThrottle, AdminInviteSendThrottle

User = get_user_model()
logger = logging.getLogger(__name__)


def _name(user):
    return (user.get_full_name() or user.email) if user else ''


def _invite_dict(invite):
    return {
        'id': invite.id,
        'email': invite.email,
        'name': invite.name,
        'invited_by_name': _name(invite.invited_by),
        'existing_account': User.objects.filter(email__iexact=invite.email).exists(),
        'created_at': invite.created_at,
        'expires_at': invite.expires_at,
        'expired': not invite.is_valid(),
    }


def _blocked_reason(user):
    if user.is_active:
        return None
    profile = getattr(user, 'profile', None)
    state = 'suspended' if profile and profile.account_status == UserProfile.AccountStatus.SUSPENDED else 'deleted'
    return f'This address belongs to a {state} account. Restore the account first.'


def _tell_other_admins(except_users, title, body, email_subject):
    """In-app notice plus a best-effort email to every other active admin."""
    admins = (
        User.objects.filter(is_active=True, roles__role=UserProfile.Role.ADMIN, roles__status=UserRole.Status.ACTIVE)
        .exclude(pk__in=[u.pk for u in except_users if u])
        .distinct()
    )
    for admin in admins:
        Notification.objects.create(recipient=admin, category=Notification.Category.ROLE, title=title, body=body)
        try:
            send_admin_security_notice(admin, email_subject, body)
        except Exception:
            logger.exception('admin security notice failed for %s', admin.email)


class EmailStatusView(APIView):
    """
    GET /api/users/email-status/?email=   (admin only)
    See getEmailStatus in api/admin.js.
    """
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    def get(self, request):
        email = (request.query_params.get('email') or '').strip().lower()
        if not email or '@' not in email:
            return Response({'detail': 'A valid email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email).select_related('profile').prefetch_related('roles').first()
        account_status = None
        if user:
            profile = getattr(user, 'profile', None)
            account_status = 'active' if user.is_active else (
                'suspended' if profile and profile.account_status == UserProfile.AccountStatus.SUSPENDED else 'deactivated'
            )
        now = timezone.now()
        return Response({
            'exists': bool(user),
            'name': _name(user) if user else '',
            'roles': [r.role for r in user.roles.all() if r.status == UserRole.Status.ACTIVE] if user else [],
            'account_status': account_status,
            'pending_editor_invite': EditorInvite.objects.filter(email__iexact=email, accepted_at__isnull=True, expires_at__gt=now).exists(),
            'pending_admin_invite': AdminInvite.objects.filter(email__iexact=email, accepted_at__isnull=True, expires_at__gt=now).exists(),
        })


class AdminInviteListCreateView(APIView):
    """
    GET  /api/users/admin-invites/   (admin only) → pending admin invites
    POST /api/users/admin-invites/   (admin only) → { email, name, password }
    """
    permission_classes = [IsAdmin]

    def get_throttles(self):
        # The strict limit only guards the password check on POST.
        return [AdminInviteSendThrottle()] if self.request.method == 'POST' else [UserRateThrottle()]

    def get(self, request):
        invites = AdminInvite.objects.filter(accepted_at__isnull=True).select_related('invited_by')
        return Response([_invite_dict(i) for i in invites])

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        name = (request.data.get('name') or '').strip()
        password = request.data.get('password') or ''

        if not request.user.check_password(password):
            audit.record(
                type=AuditLog.Type.SECURITY, action='admin_invite_password_failed',
                summary=f'Wrong password when trying to invite {email or "an address"} as an administrator',
                actor=request.user, target_email=email if '@' in email else '', request=request,
            )
            return Response({'detail': 'Your password is incorrect.'}, status=status.HTTP_403_FORBIDDEN)
        if not email or '@' not in email:
            return Response({'detail': 'A valid email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(name) < 2:
            return Response({'detail': "Please enter the invitee's full name."}, status=status.HTTP_400_BAD_REQUEST)

        existing = User.objects.filter(email__iexact=email).select_related('profile').first()
        if existing is not None:
            if is_admin(existing):
                return Response({'detail': 'That address already belongs to an administrator.'},
                                status=status.HTTP_409_CONFLICT)
            blocked = _blocked_reason(existing)
            if blocked:
                return Response({'detail': blocked}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            replaced = AdminInvite.objects.filter(email__iexact=email, accepted_at__isnull=True)
            replaced_count = replaced.count()
            replaced.delete()
            invite = AdminInvite.objects.create(
                email=email, name=name, token=secrets.token_urlsafe(32), invited_by=request.user,
                expires_at=timezone.now() + timedelta(hours=AdminInvite.TTL_HOURS),
            )
            try:
                send_admin_invite_email(invite)
            except Exception:
                logger.exception('admin invite email failed for %s', email)
                transaction.set_rollback(True)
                return Response({'detail': 'Could not send the invitation email, so nothing was saved. Please try again.'},
                                status=status.HTTP_502_BAD_GATEWAY)
            audit.record(
                type=AuditLog.Type.INVITATION, action='invite',
                summary=f'Invited {name} ({email}) to become an administrator'
                        + (' — replacing an earlier invite' if replaced_count else ''),
                actor=request.user, target=existing, target_email=email, role=UserProfile.Role.ADMIN,
                details={'invite_id': invite.pk, 'expires_at': invite.expires_at.isoformat(),
                         'existing_account': existing is not None},
                request=request,
            )
        _tell_other_admins(
            [request.user],
            title='A new administrator was invited',
            body=f'{_name(request.user)} invited {name} ({email}) to become an administrator.',
            email_subject='PaperBridge security notice: administrator invited',
        )
        return Response(_invite_dict(invite), status=status.HTTP_201_CREATED)


class AdminInviteDetailView(APIView):
    """DELETE /api/users/admin-invites/<id>/   (admin only) → cancel a pending invite."""
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    def delete(self, request, invite_id):
        invite = AdminInvite.objects.filter(pk=invite_id).first()
        if invite is None:
            return Response({'detail': 'Invite not found.'}, status=status.HTTP_404_NOT_FOUND)
        if invite.accepted_at is not None:
            return Response({'detail': 'This invite has already been accepted.'}, status=status.HTTP_409_CONFLICT)
        with transaction.atomic():
            audit.record(
                type=AuditLog.Type.INVITATION, action='cancel',
                summary=f'Cancelled the administrator invitation for {invite.name or invite.email}',
                actor=request.user, target_email=invite.email, role=UserProfile.Role.ADMIN,
                details={'invite_id': invite.pk}, request=request,
            )
            invite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminInviteView(APIView):
    """
    GET  /api/users/admin-invite/<token>/   → who the invite is for
    POST /api/users/admin-invite/<token>/   → { password }; accept

    Public. authentication_classes is empty so a stale token in the invitee's
    browser cannot turn a valid link into a 401.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get_throttles(self):
        return [AdminInviteAcceptThrottle()] if self.request.method == 'POST' else []

    def _load(self, token):
        invite = AdminInvite.objects.select_related('invited_by').filter(token=token).first()
        return invite if invite and invite.is_valid() else None

    def get(self, request, token):
        invite = self._load(token)
        if invite is None:
            return Response({'detail': 'This invitation link is invalid, expired or already used.'},
                            status=status.HTTP_404_NOT_FOUND)
        data = _invite_dict(invite)
        return Response({k: data[k] for k in ('email', 'name', 'invited_by_name', 'existing_account', 'expires_at')})

    def post(self, request, token):
        password = request.data.get('password') or ''
        with transaction.atomic():
            invite = AdminInvite.objects.select_for_update().filter(token=token).first()
            if invite is None or not invite.is_valid():
                return Response({'detail': 'This invitation link is invalid, expired or already used.'},
                                status=status.HTTP_404_NOT_FOUND)

            user = User.objects.filter(email__iexact=invite.email).select_related('profile').first()
            if user is not None:
                blocked = _blocked_reason(user)
                if blocked:
                    return Response({'detail': 'This account is suspended or deleted, so it cannot become an administrator.'},
                                    status=status.HTTP_409_CONFLICT)
                if authenticate(request, username=user.get_username(), password=password) is None:
                    return Response({'detail': 'That password is not correct for this account.'},
                                    status=status.HTTP_403_FORBIDDEN)
                created = False
            else:
                try:
                    validate_password(password)
                except DjangoValidationError as exc:
                    return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
                first, _, last = (invite.name or '').partition(' ')
                user = User.objects.create_user(
                    username=invite.email, email=invite.email, password=password, first_name=first, last_name=last,
                )
                UserProfile.objects.update_or_create(
                    user=user, defaults={'role': UserProfile.Role.ADMIN, 'status': UserProfile.Status.ACTIVE},
                )
                created = True

            role, _ = UserRole.objects.get_or_create(
                user=user, role=UserProfile.Role.ADMIN, defaults={'status': UserRole.Status.ACTIVE},
            )
            if role.status != UserRole.Status.ACTIVE:
                role.status = UserRole.Status.ACTIVE
                role.save(update_fields=['status'])
            invite.accepted_at = timezone.now()
            invite.save(update_fields=['accepted_at'])

            audit.record(
                type=AuditLog.Type.INVITATION, action='accept',
                summary=f'{_name(user)} accepted the invitation and became an administrator'
                        + ('' if created else ' (existing account)'),
                actor=user, target=user, role=UserProfile.Role.ADMIN,
                details={'invite_id': invite.pk, 'invited_by': _name(invite.invited_by), 'new_account': created},
                request=request,
            )

        _tell_other_admins(
            [user],
            title='A new administrator joined',
            body=f'{_name(user)} ({user.email}) accepted an invitation from {_name(invite.invited_by) or "an administrator"} '
                 'and is now an administrator.',
            email_subject='PaperBridge security notice: new administrator',
        )
        refresh = RefreshToken.for_user(user)
        return Response(
            {'access': str(refresh.access_token), 'refresh': str(refresh), 'user': UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
