"""
"Sign out everyone", made to take effect immediately.

A login token is checked only for a valid signature and an unexpired date — the
server keeps no list of who is signed in. So revoking the 7-day refresh tokens
alone would leave every 8-hour access token working until it ran out. Instead
the platform records the moment of revocation, and every request refuses a
token whose issue time ('iat') is earlier (RevocableJWTAuthentication, and the
refresh serializer for the renewal step).

The timestamp is cached for REVOKED_CACHE_SECONDS so the check costs no database
query on most requests. The process that performs the revocation updates its
cache at once; other server processes pick it up when their cache expires.
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.audit import services as audit
from apps.audit.models import AuditLog

from .models import PlatformState

User = get_user_model()

REVOKED_CACHE_KEY = 'system:sessions_revoked_epoch'
REVOKED_CACHE_SECONDS = 5


def revoked_epoch():
    """Epoch seconds of the last revocation, or 0 if there has never been one."""
    value = cache.get(REVOKED_CACHE_KEY)
    if value is None:
        state = PlatformState.objects.filter(pk=PlatformState.SINGLETON_PK).only('sessions_revoked_at').first()
        value = int(state.sessions_revoked_at.timestamp()) if state and state.sessions_revoked_at else 0
        cache.set(REVOKED_CACHE_KEY, value, REVOKED_CACHE_SECONDS)
    return value


def is_revoked(token):
    """True when the token was issued before the last "sign out everyone".

    'iat' has one-second resolution, so a token issued within the same second
    as the revocation survives. That window is what lets the admin's own fresh
    tokens, issued straight after, work.
    """
    cutoff = revoked_epoch()
    if not cutoff:
        return False
    issued = token.get('iat')
    return issued is None or int(issued) < cutoff


def _live_login_q(prefix=''):
    """A renewal token that still works: unexpired, not blacklisted, and issued
    after the last "sign out everyone"."""
    q = Q(**{f'{prefix}expires_at__gt': timezone.now(), f'{prefix}blacklistedtoken__isnull': True})
    state = PlatformState.objects.filter(pk=PlatformState.SINGLETON_PK).only('sessions_revoked_at').first()
    if state and state.sessions_revoked_at:
        q &= Q(**{f'{prefix}created_at__gte': state.sessions_revoked_at})
    return q


def signed_in_users(queryset=None):
    """Active users holding a working login, annotated with last_signed_in.

    The one definition of "signed in", shared by the health tile's count and the
    list behind it, so the two can never disagree.
    """
    queryset = User.objects.all() if queryset is None else queryset
    return (
        queryset.filter(is_active=True)
        .annotate(last_signed_in=Max('outstandingtoken__created_at', filter=_live_login_q('outstandingtoken__')))
        .filter(last_signed_in__isnull=False)
    )


def signed_in_user_count(exclude_user=None):
    users = signed_in_users()
    if exclude_user is not None:
        users = users.exclude(pk=exclude_user.pk)
    return users.count()


def revoke_all(actor, reason, request=None):
    """Sign everyone out now. Returns (revoked_at, signed_out_count, fresh_tokens_for_actor)."""
    with transaction.atomic():
        state = PlatformState.load()
        state = PlatformState.objects.select_for_update().get(pk=state.pk)
        signed_out = signed_in_user_count(exclude_user=actor)

        now = timezone.now()
        # Also blacklist the renewal tokens, so the record matches the rule and
        # nothing depends on the timestamp check alone.
        live = OutstandingToken.objects.filter(expires_at__gt=now, blacklistedtoken__isnull=True)
        BlacklistedToken.objects.bulk_create(
            [BlacklistedToken(token_id=pk) for pk in live.values_list('pk', flat=True)],
            ignore_conflicts=True,
        )

        state.sessions_revoked_at = now
        state.sessions_revoked_by = actor
        state.save(update_fields=['sessions_revoked_at', 'sessions_revoked_by'])

        audit.record(
            type=AuditLog.Type.SECURITY, action='revoke_all_sessions',
            summary=f'Signed out everyone — {signed_out} other {"person" if signed_out == 1 else "people"} signed out',
            actor=actor, reason=reason,
            details={'signed_out_users': signed_out, 'revoked_at': now.isoformat()},
            request=request,
        )

    # Only reached once the block above committed. This process refuses old
    # tokens from the very next request; others within REVOKED_CACHE_SECONDS.
    cache.set(REVOKED_CACHE_KEY, int(now.timestamp()), REVOKED_CACHE_SECONDS)

    # Issued after the cutoff, so the admin who pressed the button stays signed in.
    fresh = RefreshToken.for_user(actor)
    return now, signed_out, {'access': str(fresh.access_token), 'refresh': str(fresh)}
