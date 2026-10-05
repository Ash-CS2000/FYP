from django.utils import timezone

from .models import ReviewAssignment


def _pct(part, total):
    if total == 0:
        return None
    return round((part / total) * 100)


def _score_band(score):
    if score >= 90:
        return 'excellent'
    if score >= 75:
        return 'strong'
    if score >= 60:
        return 'developing'
    return 'needs_attention'


def reviewer_kpi_for(user):
    assignments = (
        ReviewAssignment.objects
        .filter(reviewer=user)
        .select_related('review', 'review__assessment')
        .order_by('-invited_at')
    )

    submitted = [a for a in assignments if a.status == ReviewAssignment.Status.SUBMITTED and hasattr(a, 'review')]
    invited_total = assignments.count()
    responded = [a for a in assignments if a.responded_at is not None]
    accepted = [a for a in assignments if a.status in (ReviewAssignment.Status.ACCEPTED, ReviewAssignment.Status.SUBMITTED)]
    open_accepted = [a for a in accepted if a.status == ReviewAssignment.Status.ACCEPTED]

    on_time = [
        a for a in submitted
        if a.due_at is None or a.review.submitted_at <= a.due_at
    ]
    overdue_open = [
        a for a in open_accepted
        if a.due_at is not None and timezone.now() > a.due_at
    ]
    no_extension_submitted = [
        a for a in submitted
        if not a.extension_status
    ]
    assessed = [a.review.assessment for a in submitted if hasattr(a.review, 'assessment')]

    response_rate = _pct(len(responded), invited_total)
    acceptance_rate = _pct(len(accepted), len(responded))
    completion_rate = _pct(len(submitted), len(accepted))
    on_time_rate = _pct(len(on_time), len(submitted))
    no_extension_rate = _pct(len(no_extension_submitted), len(submitted))

    if assessed:
        avg_quality = round(sum(a.quality for a in assessed) / len(assessed), 1)
        avg_accuracy = round(sum(a.accuracy for a in assessed) / len(assessed), 1)
        total_errors = sum(a.errors for a in assessed)
        error_penalty = min(20, total_errors * 4)
        human_score = round(((avg_quality + avg_accuracy) / 10) * 100) - error_penalty
    else:
        avg_quality = None
        avg_accuracy = None
        total_errors = 0
        human_score = None

    components = []
    if on_time_rate is not None:
        components.append((on_time_rate, 0.35))
    if completion_rate is not None:
        components.append((completion_rate, 0.20))
    if response_rate is not None:
        components.append((response_rate, 0.15))
    if no_extension_rate is not None:
        components.append((no_extension_rate, 0.10))
    if human_score is not None:
        components.append((max(0, min(100, human_score)), 0.20))

    if components:
        total_weight = sum(weight for _, weight in components)
        score = round(sum(value * weight for value, weight in components) / total_weight)
    else:
        score = 0

    # Portable Python calculation keeps this independent of database-specific
    # duration extraction while the dataset is small.
    turnaround_days = []
    for assignment in submitted:
        if assignment.responded_at:
            delta = assignment.review.submitted_at - assignment.responded_at
            turnaround_days.append(max(0, delta.total_seconds() / 86400))

    avg_turnaround_days = round(sum(turnaround_days) / len(turnaround_days), 1) if turnaround_days else None

    # Newest submission first — invited_at order (the queryset's) can disagree.
    by_submission = sorted(submitted, key=lambda a: a.review.submitted_at, reverse=True)
    recent = []
    for assignment in by_submission[:5]:
        assessment = getattr(assignment.review, 'assessment', None)
        recent.append({
            'assignment_id': assignment.id,
            'manuscript_id': assignment.manuscript_id,
            'title': assignment.manuscript.title,
            'submitted_at': assignment.review.submitted_at,
            'on_time': assignment.due_at is None or assignment.review.submitted_at <= assignment.due_at,
            'recommendation': assignment.review.recommendation,
            'assessment': {
                'quality': assessment.quality,
                'accuracy': assessment.accuracy,
                'errors': assessment.errors,
                'note': assessment.note,
                'assessed_at': assessment.assessed_at,
            } if assessment else None,
        })

    return {
        'score': score,
        'band': _score_band(score),
        'summary': {
            'invited': invited_total,
            'responded': len(responded),
            'accepted': len(accepted),
            'submitted': len(submitted),
            'overdue_open': len(overdue_open),
            'assessed_reviews': len(assessed),
            'total_errors': total_errors,
        },
        'metrics': {
            'response_rate': response_rate,
            'acceptance_rate': acceptance_rate,
            'completion_rate': completion_rate,
            'on_time_rate': on_time_rate,
            'no_extension_rate': no_extension_rate,
            'avg_quality': avg_quality,
            'avg_accuracy': avg_accuracy,
            'avg_turnaround_days': avg_turnaround_days,
        },
        'recent_reviews': recent,
    }
