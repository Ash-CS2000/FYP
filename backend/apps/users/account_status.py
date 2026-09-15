"""
Account suspension and soft deletion.

Both stop someone using the platform, and both have the same immediate effects:
sign-in refused, dropped from the reviewer candidate pool, and every review they
are holding released back to its editor, so no manuscript stalls waiting on a
person who cannot log in. What differs is intent, which the rest of the platform
reads from UserProfile.account_status:

  suspended    temporary. Shown with its end date and lifted automatically on
               that date (see lift_expired_suspensions).
  deactivated  a soft delete. No end date, hidden from the default user list.

Neither removes any row. Submitted reviews, decisions and published papers stay
on the record.
"""
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.audit import services as audit
from apps.audit.models import AuditLog
from apps.notifications.models import Notification
from apps.reviews.models import ReviewAssignment

from .models import UserProfile

User = get_user_model()
AccountStatus = UserProfile.AccountStatus

RELEASE_NOTE = {
    AccountStatus.SUSPENDED: "Released by an administrator: the reviewer's account was suspended.",
    AccountStatus.DEACTIVATED: "Released: the reviewer's account was deleted.",
}


def _profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def release_held_reviews(user, account_status):
    """Close every review this user has not finished, and tell each editor.

    Closed as 'declined' rather than a new status — the same idiom recusal uses
    — so every existing editor screen already treats the slot as open and lets
    the editor invite someone else. The note says what really happened.
    """
    held = list(
        ReviewAssignment.objects
        # of=('self',): lock only the assignment rows. Postgres refuses to lock
        # the nullable side of the outer join that invited_by produces.
        .select_for_update(of=('self',))
        .filter(
            reviewer=user,
            status__in=[ReviewAssignment.Status.INVITED, ReviewAssignment.Status.ACCEPTED],
        )
        .select_related('manuscript', 'invited_by')
    )
    now = timezone.now()
    name = user.get_full_name() or user.email
    for assignment in held:
        assignment.status = ReviewAssignment.Status.DECLINED
        assignment.decline_reason = ReviewAssignment.DeclineReason.OTHER
        assignment.decline_note = RELEASE_NOTE[account_status]
        assignment.responded_at = assignment.responded_at or now
        assignment.save(update_fields=['status', 'decline_reason', 'decline_note', 'responded_at'])
        if assignment.invited_by_id:
            Notification.objects.create(
                recipient=assignment.invited_by,
                category=Notification.Category.REVIEW_RESPONSE,
                title='A reviewer was released',
                body=(f'{name} can no longer review "{assignment.manuscript.title}" because their '
                      'account is no longer active. Invite another reviewer to keep it moving.'),
                manuscript=assignment.manuscript,
            )
    return held


def set_account_status(user, new_status, *, actor=None, reason='', until=None, request=None,
                       summary=None):
    """Move an account between active, suspended and deactivated.

    Returns (changed, released_assignments). Writes one audit entry when anything
    changed. Call inside no transaction or an outer one; it opens its own.
    """
    with transaction.atomic():
        profile = _profile(user)
        previous = profile.account_status if not user.is_active else AccountStatus.ACTIVE
        previous_until = profile.suspended_until if previous == AccountStatus.SUSPENDED else None
        until = until if new_status == AccountStatus.SUSPENDED else None

        if previous == new_status and previous_until == until:
            return False, []

        active = new_status == AccountStatus.ACTIVE
        user.is_active = active
        user.save(update_fields=['is_active'])
        profile.account_status = new_status
        profile.suspended_until = until
        # Kept in step for the older login check that reads profile.status.
        profile.status = UserProfile.Status.ACTIVE if active else UserProfile.Status.REJECTED
        profile.save(update_fields=['account_status', 'suspended_until', 'status'])

        released = [] if active else release_held_reviews(user, new_status)

        name = user.get_full_name() or user.email
        if summary is None:
            if active:
                summary = f'Reactivated the account of {name}'
            elif new_status == AccountStatus.SUSPENDED:
                ends = f' until {timezone.localtime(until):%d %b %Y}' if until else ' with no end date'
                summary = f'Suspended the account of {name}{ends}'
            else:
                summary = f'Deleted the account of {name}'
        if released:
            summary += f' — {len(released)} held review{"s" if len(released) != 1 else ""} released'

        audit.record(
            type=AuditLog.Type.ACCOUNT_STATUS,
            action='reactivated' if active else new_status,
            summary=summary, actor=actor, target=user, reason=reason,
            details={
                'from': previous,
                'to': new_status,
                'suspended_until': until.isoformat() if until else None,
                'released_assignment_ids': [a.pk for a in released],
            },
            request=request,
        )
    return True, released


def lift_expired_suspensions(users=None):
    """Reactivate every suspension whose end date has passed.

    There is no task scheduler, so this runs lazily wherever it matters — at
    sign-in and when the admin user list loads — and from the
    lift_expired_suspensions management command for a cron job.
    """
    expired = UserProfile.objects.filter(
        account_status=AccountStatus.SUSPENDED,
        suspended_until__isnull=False,
        suspended_until__lte=timezone.now(),
    ).select_related('user')
    if users is not None:
        expired = expired.filter(user__in=users)

    lifted = []
    for profile in expired:
        user = profile.user
        changed, _ = set_account_status(
            user, AccountStatus.ACTIVE,
            summary=f'Suspension of {user.get_full_name() or user.email} ended automatically',
        )
        if changed:
            lifted.append(user)
    return lifted
