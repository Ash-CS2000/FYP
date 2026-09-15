from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import CharField, Count, Q, Value
from django.db.models.functions import Concat
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.users.models import UserProfile, UserRole
from apps.users.permissions import IsAdmin

from .health import run_checks
from .models import PlatformState
from .sessions import revoke_all, signed_in_users

User = get_user_model()
ROLES = ('author', 'reviewer', 'editor', 'admin')


def _int_param(raw, default, lo, hi):
    try:
        return max(lo, min(hi, int(raw)))
    except (TypeError, ValueError):
        return default


class SignedInUsersView(APIView):
    """
    GET /api/system/signed-in-users/?page=&page_size=&search=&role=   (admin only)

    See listSignedInUsers in api/admin.js. Paged and filtered in the database,
    like the user list, so it stays one small response at any platform size.
    """
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    def get(self, request):
        params = request.query_params
        role = params.get('role', '').strip()
        if role and role not in ROLES:
            return Response({'detail': f'Unknown role: {role}'}, status=status.HTTP_400_BAD_REQUEST)

        base = User.objects.all()
        search = params.get('search', '').strip()
        if search:
            base = base.annotate(
                full_name=Concat('first_name', Value(' '), 'last_name', output_field=CharField()),
            ).filter(
                Q(email__icontains=search) | Q(first_name__icontains=search)
                | Q(last_name__icontains=search) | Q(full_name__icontains=search)
            )

        signed_in_ids = signed_in_users(base).values('pk')
        active_role = lambda r: Q(roles__role=r, roles__status=UserRole.Status.ACTIVE)
        counts = User.objects.filter(pk__in=signed_in_ids).aggregate(
            all=Count('id', distinct=True),
            **{r: Count('id', filter=active_role(r), distinct=True) for r in ROLES},
        )

        filtered = base.filter(active_role(role)) if role else base
        qs = signed_in_users(filtered)
        page_size = _int_param(params.get('page_size'), 20, 1, 100)
        page = _int_param(params.get('page'), 1, 1, 10**6)
        total = qs.count()
        start = (page - 1) * page_size
        rows = (
            qs.select_related('profile').prefetch_related('roles')
            .order_by('-last_signed_in', '-id')[start:start + page_size]
        )

        def row(user):
            profile = getattr(user, 'profile', None)
            return {
                'id': user.id,
                'name': user.get_full_name() or user.email,
                'email': user.email,
                'roles': [r.role for r in user.roles.all() if r.status == UserRole.Status.ACTIVE],
                'avatar_key': getattr(profile, 'avatar_key', '') or '',
                'institution': getattr(profile, 'institution', '') or '',
                'last_signed_in': user.last_signed_in.isoformat(),
            }

        return Response({
            'results': [row(u) for u in rows],
            'total': total,
            'page': page,
            'page_size': page_size,
            'counts': counts,
            'window_days': settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].days,
        })

HEALTH_CACHE_KEY = 'system:health'
HEALTH_CACHE_SECONDS = 30


class SystemHealthView(APIView):
    """
    GET /api/system/health/?refresh=1   (admin only)

    See getSystemHealth in api/admin.js. Results are cached for 30 seconds so a
    dashboard open in several tabs does not keep calling external services;
    ?refresh=1 runs the checks again now.
    """
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    def get(self, request):
        result = None if request.query_params.get('refresh') else cache.get(HEALTH_CACHE_KEY)
        if result is None:
            result = run_checks()
            cache.set(HEALTH_CACHE_KEY, result, HEALTH_CACHE_SECONDS)

        state = PlatformState.objects.select_related('sessions_revoked_by').filter(
            pk=PlatformState.SINGLETON_PK,
        ).first()
        revoked_by = state.sessions_revoked_by if state else None
        return Response({
            **result,
            'sessions_revoked_at': state.sessions_revoked_at.isoformat() if state and state.sessions_revoked_at else None,
            'sessions_revoked_by': (revoked_by.get_full_name() or revoked_by.email) if revoked_by else '',
        })


class RevokeAllSessionsView(APIView):
    """
    POST /api/system/sessions/revoke-all/   (admin only)
    Body: { reason }

    See signOutEveryone in api/admin.js and apps/system/sessions.py.
    """
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        reason = str(request.data.get('reason') or '').strip()
        if not reason:
            return Response(
                {'detail': 'A reason is required to sign everyone out.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        revoked_at, signed_out, tokens = revoke_all(request.user, reason, request=request)
        cache.delete(HEALTH_CACHE_KEY)  # the signed-in count just changed
        return Response({
            'revoked_at': revoked_at.isoformat(),
            'signed_out_users': signed_out,
            **tokens,
        })
