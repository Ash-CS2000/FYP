from django.conf import settings
from django.core.exceptions import ValidationError
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
    # 1 for the original submission, 2 once the author has resubmitted once,
    # and so on — always manuscript.revisions.count() + 1 at invite time. This
    # is what lets an editor reassign the *same* reviewer after a revision:
    # each round is its own row, so the round-1 row (and its Review) is kept
    # as history rather than overwritten.
    round = models.PositiveSmallIntegerField(default=1)
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

    # Populated from apps.matching.ranking.rank_candidates() at invite time —
    # the score/explanation that justified this invite, kept even after the
    # candidate pool or model changes, so there's an audit trail (and future
    # training data) for why this reviewer was chosen. Null for rows created
    # before this field existed.
    match_score = models.PositiveSmallIntegerField(null=True, blank=True)
    match_breakdown = models.JSONField(default=list, blank=True)
    model_version = models.CharField(max_length=50, blank=True)

    # Set when a co-author is added to the manuscript after this reviewer
    # already submitted a review (see apps/manuscripts/signals.py). The
    # review itself is kept for the record but excluded from author release
    # and flagged for the editor — see ManuscriptAuthorReviewsView.
    authorship_conflict_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('manuscript', 'reviewer', 'round')
        ordering = ['-invited_at']

    def __str__(self):
        return (
            f'ReviewAssignment(manuscript={self.manuscript_id}, reviewer={self.reviewer_id}, '
            f'round={self.round}, status={self.status})'
        )

    def _authorship_reason(self):
        from apps.manuscripts.conflicts import AuthorIndex, authorship_reason

        return authorship_reason(AuthorIndex.for_manuscript(self.manuscript), self.reviewer)

    def _pairing_changed(self):
        """True for a new row, or when an existing row is re-pointed at a
        different reviewer or manuscript."""
        if self._state.adding or self.pk is None:
            return True
        original = type(self).objects.filter(pk=self.pk).values('reviewer_id', 'manuscript_id').first()
        return original is None or (
            original['reviewer_id'] != self.reviewer_id or original['manuscript_id'] != self.manuscript_id
        )

    def clean(self):
        super().clean()
        if self.reviewer_id and self.manuscript_id and self._pairing_changed():
            reason = self._authorship_reason()
            if reason:
                raise ValidationError(reason)

    def save(self, *args, **kwargs):
        # Hard, non-overridable guard against a reviewer judging their own
        # paper — enforced here too (not just at the view layer) so Django
        # admin, the shell, and seed/migration scripts can't create one by
        # accident. Checked whenever the (reviewer, manuscript) pairing is set
        # or changed, not on every status-update save(): an author added to
        # the manuscript *after* an assignment already exists is handled by
        # the auto-cancel signal in apps/manuscripts/signals.py, and a reviewer
        # who becomes an author from their own side by
        # conflicts.authorship_block() on accept/submit/view.
        update_fields = kwargs.get('update_fields')
        pairing_in_update = update_fields is None or {'reviewer', 'reviewer_id', 'manuscript', 'manuscript_id'} & set(update_fields)
        if pairing_in_update and self._pairing_changed():
            reason = self._authorship_reason()
            if reason:
                raise ValidationError(reason)
        super().save(*args, **kwargs)


class Review(models.Model):
    """
    The content of a submitted review. One-to-one with the ReviewAssignment it
    belongs to — a reviewer submits once per assignment, no resubmission.
    'Reviewer 1'/'Reviewer 2' labels are computed at serialization time from a
    stable ordering of the manuscript's review_assignments, never stored here.
    """
    class Recommendation(models.TextChoices):
        ACCEPT = 'accept', 'Accept'
        MINOR = 'minor', 'Minor Revision'
        MAJOR = 'major', 'Major Revision'
        REJECT = 'reject', 'Reject'

    assignment = models.OneToOneField(ReviewAssignment, on_delete=models.CASCADE, related_name='review')
    originality = models.PositiveSmallIntegerField()
    technical = models.PositiveSmallIntegerField()
    clarity = models.PositiveSmallIntegerField()
    relevance = models.PositiveSmallIntegerField()
    recommendation = models.CharField(max_length=20, choices=Recommendation.choices)
    summary = models.TextField()
    strengths = models.TextField()
    weaknesses = models.TextField()
    confidential_to_editor = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Review(assignment={self.assignment_id}, recommendation={self.recommendation})'
