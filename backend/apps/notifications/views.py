from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reviews.reminders import send_due_reminders
from apps.users.permissions import is_reviewer

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/ → the authenticated user's own notifications, newest first.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Deadline reminders are generated on read (there is no scheduler), so a
        # reviewer who opens the bell first still sees them.
        if is_reviewer(self.request.user):
            send_due_reminders(reviewer=self.request.user)
        return Notification.objects.filter(recipient=self.request.user).select_related('manuscript')


class NotificationMarkReadView(APIView):
    """
    POST /api/notifications/<int:pk>/read/ → mark one notification read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
        notification.read = True
        notification.save(update_fields=['read'])
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    """
    POST /api/notifications/read-all/ → mark every unread notification read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, read=False).update(read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
