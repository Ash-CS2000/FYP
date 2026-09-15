from rest_framework import serializers

from .models import ScreeningSettings


class ScreeningSettingsSerializer(serializers.ModelSerializer):
    review_threshold = serializers.IntegerField(min_value=0, max_value=100)
    high_threshold = serializers.IntegerField(min_value=0, max_value=100)
    min_words = serializers.IntegerField(min_value=0, max_value=200)
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ScreeningSettings
        fields = ScreeningSettings.EDITABLE_FIELDS + ('updated_at', 'updated_by_name')
        read_only_fields = ('updated_at', 'updated_by_name')

    def get_updated_by_name(self, obj):
        user = obj.updated_by
        return (user.get_full_name() or user.email) if user else ''

    def validate(self, attrs):
        # Validate against the values as they will be after a partial patch, so
        # sending only one threshold cannot slip past the ordering rule.
        review = attrs.get('review_threshold', getattr(self.instance, 'review_threshold', None))
        high = attrs.get('high_threshold', getattr(self.instance, 'high_threshold', None))
        if review is not None and high is not None and review >= high:
            raise serializers.ValidationError(
                {'review_threshold': ['The review threshold must be lower than the flag threshold.']}
            )
        return attrs
