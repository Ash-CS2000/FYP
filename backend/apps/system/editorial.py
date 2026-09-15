"""
Read-only numbers on how the journal is doing, for the admin dashboard.

Oversight, not intervention: an administrator can see that reviews are overdue
or decisions are slow and raise it with the editors, but nothing here lets them
act on a paper (see the role model — editorial decisions belong to editors).
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, OuterRef, Q, Subquery
from django.utils import timezone

from apps.manuscripts.models import Decision, Manuscript
from apps.reviews.models import ReviewAssignment
from apps.users.models import UserProfile, UserRole

User = get_user_model()
S = Manuscript.Status
RA = ReviewAssignment.Status


def overview():
    now = timezone.now()
    month_ago = now - timedelta(days=30)

    counts = Manuscript.objects.aggregate(
        total=Count('id'),
        **{status: Count('id', filter=Q(status=status)) for status in S.values},
        last_30=Count('id', filter=Q(submitted_at__gte=month_ago)),
        previous_30=Count('id', filter=Q(submitted_at__gte=month_ago - timedelta(days=30), submitted_at__lt=month_ago)),
        published_30=Count('id', filter=Q(published_at__gte=month_ago)),
    )

    reviews = ReviewAssignment.objects.aggregate(
        in_progress=Count('id', filter=Q(status=RA.ACCEPTED)),
        overdue=Count('id', filter=Q(status=RA.ACCEPTED, due_at__lt=now)),
        invites_waiting=Count('id', filter=Q(status=RA.INVITED)),
        invites_overdue=Count('id', filter=Q(status=RA.INVITED, respond_by__lt=now)),
    )

    reviewer_pool = User.objects.filter(
        is_active=True, roles__role=UserProfile.Role.REVIEWER, roles__status=UserRole.Status.ACTIVE,
    )
    reviewers = {
        'active': reviewer_pool.distinct().count(),
        'reviewing': reviewer_pool.filter(review_assignments__status=RA.ACCEPTED).distinct().count(),
    }

    # A subquery rather than Min(): Django cannot average over an aggregate.
    first_decision = Decision.objects.filter(manuscript=OuterRef('pk')).order_by('decided_at').values('decided_at')[:1]
    timing = (
        Manuscript.objects.annotate(first_decided=Subquery(first_decision))
        .filter(first_decided__isnull=False)
        .aggregate(
            papers=Count('id'),
            avg=Avg(ExpressionWrapper(F('first_decided') - F('submitted_at'), output_field=DurationField())),
        )
    )
    avg_days = round(timing['avg'].total_seconds() / 86400, 1) if timing['avg'] is not None else None

    accepted = counts[S.ACCEPTED] + counts[S.PUBLISHED]
    finally_decided = accepted + counts[S.REJECTED]

    return {
        'stages': {status: counts[status] for status in (
            S.SUBMITTED, S.UNDER_REVIEW, S.REVISIONS_REQUESTED, S.ACCEPTED, S.PUBLISHED, S.REJECTED,
        )},
        'total_manuscripts': counts['total'],
        'reviews': reviews,
        'reviewers': reviewers,
        'avg_days_to_first_decision': avg_days,
        'decided_papers': timing['papers'],
        'acceptance_rate': round(100 * accepted / finally_decided) if finally_decided else None,
        'submissions': {'last_30_days': counts['last_30'], 'previous_30_days': counts['previous_30']},
        'published': {'total': counts[S.PUBLISHED], 'last_30_days': counts['published_30']},
    }
