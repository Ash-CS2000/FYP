"""
The facts behind the admin dashboard's "Needs attention" card: things only an
administrator can resolve. Editorial backlogs (overdue reviews, unscreened
papers) are deliberately absent — an admin cannot act on those.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.users.models import EditorInvite, UserProfile, UserRole

User = get_user_model()

THRESHOLDS = {
    'application_days': 3,     # a reviewer application waiting longer is overdue
    'invite_hours': 24,        # an editor invite expiring sooner is flagged
    'suspension_days': 7,      # a suspension lifting sooner is flagged
    'failed_total': 10,        # failed sign-ins in 24 h, across everyone
    'failed_one_account': 5,   # failed sign-ins in 24 h, against one address
    'spike_ratio': 3,          # new accounts this week vs last week
    'spike_min': 10,           # ...and at least this many, so 1 → 3 is not a "spike"
}


def _name(user):
    return user.get_full_name() or user.email


def reviewer_applications(now):
    pending = (
        UserRole.objects
        .filter(role=UserProfile.Role.REVIEWER, status=UserRole.Status.PENDING, user__is_active=True)
        .select_related('user')
        .order_by('created_at')
    )
    count = pending.count()
    first = pending.first()
    oldest = None
    if first:
        waiting = (now - first.created_at).days
        oldest = {'name': _name(first.user), 'applied_at': first.created_at.isoformat(), 'waiting_days': waiting}
    return {
        'count': count,
        'overdue': bool(oldest and oldest['waiting_days'] > THRESHOLDS['application_days']),
        'oldest': oldest,
    }


def editor_invites(now):
    unaccepted = EditorInvite.objects.filter(accepted_at__isnull=True)
    soon = now + timedelta(hours=THRESHOLDS['invite_hours'])
    expiring = unaccepted.filter(expires_at__gt=now, expires_at__lte=soon).order_by('expires_at')
    first = expiring.first()
    return {
        'expired': unaccepted.filter(expires_at__lte=now).count(),
        'expiring_soon': expiring.count(),
        'soonest_expiry': first.expires_at.isoformat() if first else None,
    }


def suspensions_ending(now):
    ending = (
        UserProfile.objects
        .filter(
            account_status=UserProfile.AccountStatus.SUSPENDED, user__is_active=False,
            suspended_until__gt=now, suspended_until__lte=now + timedelta(days=THRESHOLDS['suspension_days']),
        )
        .select_related('user')
        .order_by('suspended_until')
    )
    first = ending.first()
    return {
        'count': ending.count(),
        'next': {
            'id': first.user_id, 'name': _name(first.user), 'suspended_until': first.suspended_until.isoformat(),
        } if first else None,
    }


def failed_sign_ins(now):
    recent = AuditLog.objects.filter(type=AuditLog.Type.LOGIN_FAILURE, created_at__gte=now - timedelta(hours=24))
    total = recent.count()
    top = (
        recent.exclude(target_email='')
        .values('target_email').annotate(n=Count('id')).order_by('-n', 'target_email').first()
    )
    top_account = {'email': top['target_email'], 'count': top['n']} if top else None
    return {
        'last_24h': total,
        'top_account': top_account,
        'alert': total >= THRESHOLDS['failed_total']
                 or bool(top_account and top_account['count'] >= THRESHOLDS['failed_one_account']),
    }


def new_accounts(now):
    week_ago = now - timedelta(days=7)
    this_week = User.objects.filter(date_joined__gte=week_ago).count()
    last_week = User.objects.filter(date_joined__gte=week_ago - timedelta(days=7), date_joined__lt=week_ago).count()
    return {
        'this_week': this_week,
        'last_week': last_week,
        'spike': this_week >= THRESHOLDS['spike_min']
                 and this_week >= THRESHOLDS['spike_ratio'] * max(last_week, 1),
    }


def collect():
    now = timezone.now()
    return {
        'generated_at': now.isoformat(),
        'reviewer_applications': reviewer_applications(now),
        'editor_invites': editor_invites(now),
        'suspensions_ending': suspensions_ending(now),
        'failed_sign_ins': failed_sign_ins(now),
        'new_accounts': new_accounts(now),
        'thresholds': THRESHOLDS,
    }
