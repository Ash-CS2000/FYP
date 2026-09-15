from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = (
            'id', 'type', 'action', 'summary',
            'actor_name', 'actor_email', 'target_name', 'target_email',
            'role', 'reason', 'details', 'ip_address', 'created_at',
        )
        read_only_fields = fields
