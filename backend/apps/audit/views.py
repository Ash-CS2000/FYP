from datetime import date, datetime, time, timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.users.permissions import IsAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


def _parse_int(raw, default, lo, hi):
    try:
        return max(lo, min(hi, int(raw)))
    except (TypeError, ValueError):
        return default


class AuditLogListView(APIView):
    """
    GET /api/audit-logs/?type=&actor=&from=&to=&limit=&offset=   (admin only)

    Read-only by construction: only GET is routed. See api/admin.js
    listFullAuditLog for the contract.
    """
    permission_classes = [IsAdmin]
    throttle_classes = [UserRateThrottle]
    http_method_names = ['get', 'head', 'options']

    def get(self, request):
        qs = AuditLog.objects.all()

        types = [t.strip() for t in request.query_params.get('type', '').split(',') if t.strip()]
        unknown = [t for t in types if t not in AuditLog.Type.values]
        if unknown:
            return Response({'detail': f'Unknown audit type: {", ".join(unknown)}'}, status=400)
        if types:
            qs = qs.filter(type__in=types)

        actions = [a.strip() for a in request.query_params.get('action', '').split(',') if a.strip()]
        if actions:
            qs = qs.filter(action__in=actions)

        role = request.query_params.get('role', '').strip()
        if role:
            qs = qs.filter(role=role)

        actor = request.query_params.get('actor', '').strip()
        if actor:
            qs = qs.filter(Q(actor_name__icontains=actor) | Q(actor_email__icontains=actor))

        tz = timezone.get_current_timezone()
        for param, lookup, shift in (('from', 'created_at__gte', 0), ('to', 'created_at__lt', 1)):
            raw = request.query_params.get(param, '').strip()
            if not raw:
                continue
            try:
                day = date.fromisoformat(raw)
            except ValueError:
                return Response({'detail': f"'{param}' must be a date in YYYY-MM-DD form."}, status=400)
            # 'to' is inclusive of the whole day, so compare against the next midnight.
            bound = timezone.make_aware(datetime.combine(day + timedelta(days=shift), time.min), tz)
            qs = qs.filter(**{lookup: bound})

        limit = _parse_int(request.query_params.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT)
        offset = _parse_int(request.query_params.get('offset'), 0, 0, 10**9)
        total = qs.count()
        rows = qs[offset:offset + limit]
        return Response({
            'results': AuditLogSerializer(rows, many=True).data,
            'total': total,
            'limit': limit,
            'offset': offset,
        })
