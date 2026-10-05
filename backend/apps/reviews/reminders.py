"""
Automatic deadline reminders for accepted reviews.

There is no scheduler on the web dyno, so this follows the
lift_expired_suspensions pattern (apps/users/account_status.py): a plain
function the reviewer-facing views call lazily for the requesting reviewer,
plus the send_review_reminders management command for a cron job.

ReviewAssignment.reminded_at is the one "last reminded" marker, shared with the
editor's manual reminder (ManuscriptAssignmentRemindView), so an editor nudge
and an automatic one never land on the same day:

  due soon  due within DUE_SOON, and not reminded since that window opened
  overdue   past due, and not reminded since the deadline or for OVERDUE_EVERY
"""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.notifications.models import Notification

from .models import ReviewAssignment
from .notifications import (
    REVIEW_DUE_SOON_BODY, REVIEW_DUE_SOON_TITLE, REVIEW_OVERDUE_BODY, REVIEW_OVERDUE_TITLE,
)

DUE_SOON = timedelta(days=3)
OVERDUE_EVERY = timedelta(days=7)


def _reminder_for(assignment, now):
    """(title, body template) if this assignment is due a reminder now, else None."""
    due, last = assignment.due_at, assignment.reminded_at
    if due <= now:
        if last is None or last < due or now - last >= OVERDUE_EVERY:
            return REVIEW_OVERDUE_TITLE, REVIEW_OVERDUE_BODY
    elif due - now <= DUE_SOON:
        if last is None or last < due - DUE_SOON:
            return REVIEW_DUE_SOON_TITLE, REVIEW_DUE_SOON_BODY
    return None


def send_due_reminders(reviewer=None, now=None):
    """Notify reviewers whose accepted reviews are due soon or overdue. Returns the reminded assignments."""
    now = now or timezone.now()
    reminded = []
    with transaction.atomic():
        candidates = (
            ReviewAssignment.objects
            .filter(status=ReviewAssignment.Status.ACCEPTED, due_at__isnull=False, due_at__lte=now + DUE_SOON)
            .select_related('manuscript')
            # Two requests at once (the assignment list and the notification
            # list load together) must not both send: the second skips rows
            # the first is holding.
            .select_for_update(skip_locked=True, of=('self',))
        )
        if reviewer is not None:
            candidates = candidates.filter(reviewer=reviewer)

        for assignment in candidates:
            reminder = _reminder_for(assignment, now)
            if reminder is None:
                continue
            title, body = reminder
            Notification.objects.create(
                recipient_id=assignment.reviewer_id,
                category=Notification.Category.REVIEW_INVITE,
                title=title,
                body=body.format(
                    title=assignment.manuscript.title,
                    due=timezone.localtime(assignment.due_at).strftime('%d %b %Y'),
                ),
                manuscript=assignment.manuscript,
            )
            assignment.reminded_at = now
            assignment.save(update_fields=['reminded_at'])
            reminded.append(assignment)
    return reminded
