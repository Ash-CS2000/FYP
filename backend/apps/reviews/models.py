from django.conf import settings
from django.db import models


class ReviewAssignment(models.Model):
    class Status(models.TextChoices):
        INVITED = 'invited', 'Invited'
        ACCEPTED = 'accepted', 'Accepted'
        DECLINED = 'declined', 'Declined'
        SUBMITTED = 'submitted', 'Submitted'  # reachable once Peer Review is built

    class DeclineReason(models.TextChoices):
        CONFLICT = 'conflict', 'Conflict of interest'
        EXPERTISE = 'expertise', 'Outside my expertise'
        UNAVAILABLE = 'unavailable', 'No capacity right now'
        OTHER = 'other', 'Another reason'

    class ExtensionStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        GRANTED = 'granted', 'Granted'
        REFUSED = 'refused', 'Refused'

    manuscript = models.ForeignKey(
        'manuscripts.Manuscript', on_delete=models.CASCADE, related_name='review_assignments',
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='review_assignments',
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='review_invites_sent',
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INVITED)
    invited_at = models.DateTimeField(auto_now_add=True)
    respond_by = models.DateTimeField()
    # Review-writing window in days, captured at invite time. due_at is
    # computed as accepted_at + due_days on accept, never proposed by the
    # client — see ReviewAssignmentAcceptView.
    due_days = models.PositiveSmallIntegerField()
    due_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    coi_declared = models.BooleanField(default=False)
    coi_note = models.TextField(blank=True)
    decline_reason = models.CharField(max_length=20, choices=DeclineReason.choices, blank=True)
    decline_note = models.TextField(blank=True)
    # Distinguishes a post-acceptance recusal from a plain decline (both set
    # status back to 'declined').
    recused_at = models.DateTimeField(null=True, blank=True)
    extension_requested_days = models.PositiveSmallIntegerField(null=True, blank=True)
    extension_reason = models.TextField(blank=True)
    extension_status = models.CharField(max_length=20, choices=ExtensionStatus.choices, blank=True)
    # 24h remind throttle.
    reminded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('manuscript', 'reviewer')
        ordering = ['-invited_at']

    def __str__(self):
        return f'ReviewAssignment(manuscript={self.manuscript_id}, reviewer={self.reviewer_id}, status={self.status})'
