from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Category(models.TextChoices):
        DECISION = 'decision', 'Decision'
        REVISION_SUBMITTED = 'revision_submitted', 'Revision Submitted'
        SCREENING = 'screening', 'Screening'
        REVIEW_INVITE = 'review_invite', 'Review Invitation'
        REVIEW_RESPONSE = 'review_response', 'Review Response'
        REVIEW_EXTENSION = 'review_extension', 'Review Extension'
        REVIEW_SUBMITTED = 'review_submitted', 'Review Submitted'
        ROLE = 'role', 'Role change'

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    category = models.CharField(max_length=30, choices=Category.choices, default=Category.DECISION)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    manuscript = models.ForeignKey(
        'manuscripts.Manuscript', on_delete=models.CASCADE, null=True, blank=True, related_name='notifications',
    )
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Notification(recipient={self.recipient_id}, category={self.category}, read={self.read})'
