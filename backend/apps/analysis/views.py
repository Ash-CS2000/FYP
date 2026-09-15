from django.db import transaction
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.audit import services as audit
from apps.audit.models import AuditLog
from apps.users.permissions import is_admin

from .models import ScreeningSettings
from .serializers import ScreeningSettingsSerializer

FIELD_LABELS = {
    'review_threshold': 'review threshold',
    'high_threshold': 'flag threshold',
    'exclude_quotes': 'exclude quotations',
    'exclude_bibliography': 'exclude bibliography',
    'min_words': 'minimum match length',
    'auto_flag': 'auto-flag',
}


def _fmt(field, value):
    if isinstance(value, bool):
        return 'on' if value else 'off'
    return f'{value}%' if field.endswith('_threshold') else str(value)


class ScreeningSettingsView(APIView):
    """
    GET   /api/analysis/screening-settings/   (any signed-in user)
    PATCH /api/analysis/screening-settings/   (admin only)

    See getScreeningSettings / patchScreeningSettings in api/similarity.js.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def get(self, request):
        return Response(ScreeningSettingsSerializer(ScreeningSettings.load()).data)

    def patch(self, request):
        if not is_admin(request.user):
            return Response(
                {'detail': 'Only an administrator can change screening settings.'},
                status=403,
            )

        with transaction.atomic():
            current = ScreeningSettings.objects.select_for_update().filter(
                pk=ScreeningSettings.SINGLETON_PK
            ).first() or ScreeningSettings.load()
            serializer = ScreeningSettingsSerializer(current, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)

            changes = {
                field: [getattr(current, field), value]
                for field, value in serializer.validated_data.items()
                if getattr(current, field) != value
            }
            if not changes:
                return Response(ScreeningSettingsSerializer(current).data)

            settings_obj = serializer.save(updated_by=request.user, updated_at=timezone.now())
            described = '; '.join(
                f'{FIELD_LABELS[f]} {_fmt(f, old)} → {_fmt(f, new)}' for f, (old, new) in changes.items()
            )
            audit.record(
                type=AuditLog.Type.SETTINGS_CHANGE, action='update',
                summary=f'Changed screening settings: {described}',
                actor=request.user, details={'changes': changes},
                request=request,
            )

        return Response(ScreeningSettingsSerializer(settings_obj).data)
