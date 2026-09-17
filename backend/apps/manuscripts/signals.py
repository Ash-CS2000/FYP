"""
Keeps reviewer assignments honest when a manuscript's byline changes after
invitations already went out.

ManuscriptAuthor.save()/delete() run through Django admin, the submission
serializer, and revision handling -- there is no single call site to hook
instead of a signal. Wired up in ManuscriptsConfig.ready() (apps.py).

See ReviewAssignment.save()'s own guard for the other half of this: that
one stops a NEW assignment from ever being created for someone who is
already an author at creation time. This signal covers the other
direction -- an author added AFTER the assignment already exists -- and
conflicts.authorship_block() covers a reviewer who becomes a matching author
from their own side (e.g. linking an ORCID), checked on accept/submit/view.
"""
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.notifications.models import Notification
from apps.reviews.models import ReviewAssignment
from apps.reviews.notifications import (
    REVIEW_AUTOCANCELLED_BODY, REVIEW_AUTOCANCELLED_EDITOR_BODY,
    REVIEW_AUTOCANCELLED_EDITOR_TITLE, REVIEW_AUTOCANCELLED_TITLE,
)

from .conflicts import AuthorIndex, authorship_reason
from .models import Manuscript, ManuscriptAuthor


def auto_decline_for_authorship(assignment):
    """Declines a live assignment whose reviewer is an author of the
    manuscript, and notifies the reviewer and the inviting editor."""
    manuscript = assignment.manuscript
    assignment.status = ReviewAssignment.Status.DECLINED
    assignment.decline_reason = ReviewAssignment.DeclineReason.CONFLICT
    assignment.decline_note = 'Auto-cancelled: reviewer is now listed as an author on this manuscript.'
    assignment.responded_at = timezone.now()
    assignment.save(update_fields=['status', 'decline_reason', 'decline_note', 'responded_at'])

    Notification.objects.create(
        recipient=assignment.reviewer,
        category=Notification.Category.REVIEW_RESPONSE,
        title=REVIEW_AUTOCANCELLED_TITLE,
        body=REVIEW_AUTOCANCELLED_BODY.format(title=manuscript.title),
        manuscript=manuscript,
    )
    if assignment.invited_by_id:
        Notification.objects.create(
            recipient_id=assignment.invited_by_id,
            category=Notification.Category.REVIEW_RESPONSE,
            title=REVIEW_AUTOCANCELLED_EDITOR_TITLE,
            body=REVIEW_AUTOCANCELLED_EDITOR_BODY.format(
                reviewer=assignment.reviewer.get_full_name() or assignment.reviewer.email,
                title=manuscript.title,
            ),
            manuscript=manuscript,
        )


def _recheck_assignments(manuscript):
    assignments = list(
        manuscript.review_assignments
        .filter(status__in=[
            ReviewAssignment.Status.INVITED, ReviewAssignment.Status.ACCEPTED, ReviewAssignment.Status.SUBMITTED,
        ])
        .select_related('reviewer__profile')
    )
    if not assignments:
        return  # e.g. a fresh submission -- nothing to re-check
    index = AuthorIndex.for_manuscript(manuscript)

    for assignment in assignments:
        is_author = authorship_reason(index, assignment.reviewer) is not None
        if assignment.status == ReviewAssignment.Status.SUBMITTED:
            # A review already submitted by someone who is now an author isn't
            # un-submitted -- it's flagged for the editor and excluded from
            # author release (see ManuscriptAuthorReviewsView), but kept for
            # the record. If that author is later removed from the byline
            # (a mistaken edit), the flag is lifted again.
            if is_author and assignment.authorship_conflict_at is None:
                assignment.authorship_conflict_at = timezone.now()
                assignment.save(update_fields=['authorship_conflict_at'])
            elif not is_author and assignment.authorship_conflict_at is not None:
                assignment.authorship_conflict_at = None
                assignment.save(update_fields=['authorship_conflict_at'])
        elif is_author:
            assignment.manuscript = manuscript
            auto_decline_for_authorship(assignment)


@receiver(post_save, sender=ManuscriptAuthor)
def on_author_added_or_changed(sender, instance, raw=False, **kwargs):
    if raw:
        return
    _recheck_assignments(instance.manuscript)


@receiver(post_delete, sender=ManuscriptAuthor)
def on_author_removed(sender, instance, **kwargs):
    # Also fires while a whole manuscript is being cascade-deleted; there is
    # nothing left to re-check then.
    manuscript = Manuscript.objects.filter(pk=instance.manuscript_id).first()
    if manuscript is not None:
        _recheck_assignments(manuscript)
