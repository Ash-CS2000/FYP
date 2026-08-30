from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    manuscript_id = serializers.IntegerField(read_only=True)
    manuscript_title = serializers.CharField(source='manuscript.title', read_only=True, default='')

    class Meta:
        model = Notification
        fields = ('id', 'category', 'title', 'body', 'manuscript_id', 'manuscript_title', 'read', 'created_at')
