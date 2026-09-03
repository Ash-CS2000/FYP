from rest_framework import serializers

from .models import ReviewAssignment


class ReviewerAssignmentSerializer(serializers.Serializer):
    """
    Reviewer-facing shape — GET /api/reviewer/assignments/. No author
    identity anywhere: double-blind starts at the invitation, not the review
    form. See frontend/src/api/invitations.js.
    """
    id = serializers.IntegerField()
    manuscript_id = serializers.IntegerField()
    title = serializers.CharField(source='manuscript.title')
    category = serializers.CharField(source='manuscript.category')
    abstract = serializers.CharField(source='manuscript.abstract')
    invited_at = serializers.DateTimeField()
    respond_by = serializers.DateTimeField()
    due_at = serializers.DateTimeField(allow_null=True)
    status = serializers.CharField()
    decline_reason = serializers.CharField()
    decline_note = serializers.CharField()
    coi_declared = serializers.BooleanField()
    extension = serializers.SerializerMethodField()

    def get_extension(self, obj):
        if not obj.extension_status:
            return None
        return {
            'requested_days': obj.extension_requested_days,
            'reason': obj.extension_reason,
            'status': obj.extension_status,
        }


class ManuscriptAssignmentSerializer(serializers.Serializer):
    """
    Editor-facing shape — GET /api/manuscripts/<pk>/assignments/. Who is
    invited/reviewing this manuscript right now, for ReviewerPanel.jsx.
    """
    id = serializers.IntegerField()
    reviewer_id = serializers.IntegerField()
    name = serializers.SerializerMethodField()
    status = serializers.CharField()
    invited_at = serializers.DateTimeField()
    due_at = serializers.DateTimeField(allow_null=True)
    extension = serializers.SerializerMethodField()

    def get_name(self, obj):
        return obj.reviewer.get_full_name() or obj.reviewer.email

    def get_extension(self, obj):
        if not obj.extension_status:
            return None
        return {
            'requested_days': obj.extension_requested_days,
            'reason': obj.extension_reason,
            'status': obj.extension_status,
        }


class InviteReviewersSerializer(serializers.Serializer):
    reviewer_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    respond_by_days = serializers.IntegerField(required=False, default=7, min_value=1, max_value=60)
    due_days = serializers.IntegerField(required=False, default=21, min_value=1, max_value=180)
    force = serializers.BooleanField(required=False, default=False)


class AcceptAssignmentSerializer(serializers.Serializer):
    coi_declared = serializers.BooleanField(required=False, default=False)
    coi_note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data['coi_declared'] and not data['coi_note'].strip():
            raise serializers.ValidationError({'coi_note': 'Describe the conflict.'})
        data['coi_note'] = data['coi_note'].strip()
        return data


class DeclineAssignmentSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=ReviewAssignment.DeclineReason.choices)
    note = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        note = data.get('note', '').strip()
        if data['reason'] == ReviewAssignment.DeclineReason.OTHER and not note:
            raise serializers.ValidationError({'note': 'Say a little more when the reason is "other".'})
        data['note'] = note
        return data


class RecuseAssignmentSerializer(serializers.Serializer):
    note = serializers.CharField()

    def validate_note(self, value):
        if not value.strip():
            raise serializers.ValidationError('Say what came up.')
        return value.strip()


class ExtensionRequestSerializer(serializers.Serializer):
    days = serializers.IntegerField(min_value=1, max_value=30)
    reason = serializers.CharField()

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError('Give the editor a reason.')
        return value.strip()


class ExtensionDecisionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[ReviewAssignment.ExtensionStatus.GRANTED, ReviewAssignment.ExtensionStatus.REFUSED])
