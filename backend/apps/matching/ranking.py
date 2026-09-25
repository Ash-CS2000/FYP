"""
The reviewer-candidate ranking service. Replaces the tag-overlap-only
apps/reviews/matching.py (kept now as a thin re-export -- see that file)
with a TF-IDF text features + learned-ranker pipeline (see
matching_system.md for the full design and ml_service/README.md for how the
model is trained).

rank_candidates(manuscript) is the one entry point the rest of the backend
calls (ManuscriptReviewerCandidatesView, ManuscriptAssignmentListCreateView).
It returns {'candidates': [...], 'excluded': {'authorship': n}} -- see the
docstring on that function for the full candidate shape.
"""
import json
import logging
from pathlib import Path

from django.db.models import Count

from apps.manuscripts.conflicts import AuthorIndex, authorship_reason, soft_conflicts
from apps.reviews.models import ReviewAssignment
from apps.reviews.performance import reviewer_kpi_for
from apps.users.models import UserProfile, UserRole

from . import baseline, features, text
from .models import ReviewerPublication

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / 'model' / 'ranker_v1.json'

_model_cache = None
_model_mtime = None


def _load_model():
    """The trained ranker, reloaded when the file changes. Returns None (and
    ranking falls back to the rule-based baseline) if the file is missing,
    unreadable, or doesn't match the features this code computes -- a
    corrupted or stale model must degrade, never 500."""
    global _model_cache, _model_mtime
    if not MODEL_PATH.exists():
        return None
    mtime = MODEL_PATH.stat().st_mtime
    if _model_cache is not None and mtime == _model_mtime:
        return _model_cache
    try:
        with open(MODEL_PATH, encoding='utf-8') as f:
            model = json.load(f)
        names = model['feature_names']
        if not (
            set(names) <= set(features.FEATURE_NAMES)
            and len(names) == len(model['means']) == len(model['stds']) == len(model['coefficients'])
            and isinstance(model['intercept'], (int, float))
        ):
            raise ValueError(f'feature names/arrays do not match this code: {names}')
    except (OSError, ValueError, KeyError, TypeError) as exc:
        logger.error('Ignoring invalid ranker model %s (%s); using the rule-based baseline.', MODEL_PATH, exc)
        return None
    _model_cache, _model_mtime = model, mtime
    return model


def _availability_for(profile):
    # Blank/unrecognised -> 'available'. See
    # users/0011_availability_status_choices for why blank must not mean
    # "cannot be invited".
    value = profile.availability_status
    return value if value in ('available', 'busy', 'unavailable') else 'available'


def _history_stats(reviewer_ids, exclude_manuscript_id):
    """One query for every reviewer's history, excluding the manuscript
    being ranked ('leave this manuscript out', so ranking a manuscript never
    uses that manuscript's own outcome as a feature about itself).

    `responded` counts only invitations the reviewer actually answered:
    still-pending invitations aren't declines, and an automatic authorship
    decline (decline_reason='conflict', not a recusal) isn't the reviewer's
    choice. A recusal after accepting counts as an acceptance.

    Returns {reviewer_id: {responded, accepted, turnaround_days: [...]}}."""
    rows = (
        ReviewAssignment.objects
        .filter(reviewer_id__in=reviewer_ids)
        .exclude(manuscript_id=exclude_manuscript_id)
        .values('reviewer_id', 'status', 'decline_reason', 'recused_at', 'responded_at', 'review__submitted_at')
    )
    stats = {rid: {'responded': 0, 'accepted': 0, 'turnaround_days': []} for rid in reviewer_ids}
    for row in rows:
        s = stats[row['reviewer_id']]
        status = row['status']
        if status == ReviewAssignment.Status.INVITED:
            continue
        if status == ReviewAssignment.Status.DECLINED and row['recused_at'] is None:
            if row['decline_reason'] == ReviewAssignment.DeclineReason.CONFLICT:
                continue
            s['responded'] += 1
        else:  # accepted, submitted, or accepted-then-recused
            s['responded'] += 1
            s['accepted'] += 1
        submitted_at = row['review__submitted_at']
        if submitted_at and row['responded_at']:
            s['turnaround_days'].append((submitted_at - row['responded_at']).total_seconds() / 86400)
    return stats


def compute_candidate_features(manuscript):
    """The shared core of ranking: every non-author active reviewer's raw
    feature dict against `manuscript`, with enough metadata to either score
    them (rank_candidates, below) or export them as training rows
    (apps/matching/management/commands/export_matching_pairs.py). Kept as
    one function so training and serving can never quietly diverge on how a
    feature is computed.

    Returns (rows, excluded_authorship_count) where each row is:
        {'user', 'profile', 'features': {...}, 'matched_keywords': [...],
         'active_reviews', 'responded_invitations', 'avg_turnaround_days',
         'availability', 'soft_conflicts': [...]}
    """
    author_index = AuthorIndex.for_manuscript(manuscript)
    manuscript_keywords = text.split_keywords(manuscript.keywords)

    profiles = list(
        UserProfile.objects
        .filter(user__roles__role=UserProfile.Role.REVIEWER, user__roles__status=UserRole.Status.ACTIVE)
        .select_related('user')
        .distinct()
        .order_by('user_id')
    )

    included, excluded_authorship = [], 0
    for profile in profiles:
        if authorship_reason(author_index, profile.user):
            excluded_authorship += 1
        else:
            included.append(profile)

    reviewer_ids = [p.user_id for p in included]

    # Current workload elsewhere -- an invitation to THIS manuscript isn't
    # load that should count against being invited to it.
    active_counts = dict(
        ReviewAssignment.objects
        .filter(reviewer_id__in=reviewer_ids, status__in=[ReviewAssignment.Status.INVITED, ReviewAssignment.Status.ACCEPTED])
        .exclude(manuscript_id=manuscript.id)
        .values_list('reviewer_id')
        .annotate(count=Count('id'))
    )
    history = _history_stats(reviewer_ids, exclude_manuscript_id=manuscript.id)

    publications_by_reviewer = {}
    for pub in ReviewerPublication.objects.filter(reviewer_id__in=reviewer_ids).only('reviewer_id', 'title', 'abstract', 'keywords'):
        publications_by_reviewer.setdefault(pub.reviewer_id, []).append(pub)

    # One document per reviewer: profile text + all of their publications.
    reviewer_docs = [
        text.reviewer_text(profile, publications_by_reviewer.get(profile.user_id, []))
        for profile in included
    ]
    similarities = features.tfidf_similarities(text.manuscript_text(manuscript), reviewer_docs)

    rows = []
    for profile, text_sim in zip(included, similarities):
        user = profile.user
        reviewer_id = user.id
        h = history[reviewer_id]
        active_reviews = active_counts.get(reviewer_id, 0)

        reviewer_keywords = text.reviewer_keywords(profile, publications_by_reviewer.get(reviewer_id, []))
        kw_fit, matched_pairs = features.keyword_fit(manuscript_keywords, reviewer_keywords)

        avail = _availability_for(profile)
        feature_dict = features.build_features(
            text_sim=text_sim,
            kw_fit=kw_fit,
            tag_ov=features.tag_overlap(manuscript.specialty_tags, profile.specialty_tags),
            active_load=active_reviews,
            acceptance_rate=features.beta_smoothed_rate(h['accepted'], h['responded']),
            is_busy=(avail == 'busy'),
            is_unavailable=(avail == 'unavailable'),
        )
        turnaround = h['turnaround_days']

        rows.append({
            'user': user,
            'profile': profile,
            'features': feature_dict,
            'matched_keywords': matched_pairs,
            'active_reviews': active_reviews,
            'responded_invitations': h['responded'],
            'avg_turnaround_days': round(sum(turnaround) / len(turnaround), 1) if turnaround else None,
            'availability': avail,
            'soft_conflicts': soft_conflicts(author_index, user),
        })

    return rows, excluded_authorship


def rank_candidates(manuscript):
    """Ranks every active reviewer against `manuscript`.

    Returns:
        {
          'candidates': [{
              'id', 'name', 'institution', 'specialty_tags',
              'match_score': int 0-100,   # relative match score, not a probability
              'match_reasons': [str, ...],
              'match_breakdown': [{'key','label','value','contribution'}, ...],
              'matched_keywords': [{'manuscript','reviewer'}, ...],
              'active_reviews': int,
              'avg_turnaround_days': float | None,
              'availability': 'available'|'busy'|'unavailable',
              'conflict': str | None,   # soft conflict only, overridable
              'model_version': str,
          }, ...],   # best first; ties broken by the unrounded score, then id
          'excluded': {'authorship': int},  # count hidden as hard authors
        }
    """
    model = _load_model()
    rows, excluded_authorship = compute_candidate_features(manuscript)

    ranked = []
    for row in rows:
        user, profile, feature_dict = row['user'], row['profile'], row['features']

        if model:
            score, contributions, probability = features.score_details(feature_dict, model)
            breakdown = [
                {
                    'key': name,
                    'label': features.feature_label(name, feature_dict[name]),
                    'value': round(feature_dict[name], 3),
                    'contribution': round(contribution, 3),
                }
                for name, _z, contribution in contributions
            ]
            reasons = features.match_reasons(feature_dict, contributions, row['responded_invitations'])
            model_version = model.get('version', 'unknown')
        else:
            # No usable trained model -- fall back to the original rule-based
            # scorer rather than fail the request.
            manuscript_text = ' '.join(filter(None, [manuscript.category, manuscript.sub_category, manuscript.keywords]))
            reviewer_text = ' '.join(filter(None, [profile.expertise_areas, profile.research_areas]))
            score, reason = baseline.baseline_score(
                manuscript.specialty_tags, profile.specialty_tags, manuscript_text, reviewer_text,
            )
            probability = score / 100
            breakdown = []
            reasons = [reason] if reason else []
            model_version = 'baseline-rules'

        if row['active_reviews'] == 0:
            reasons.append('No current review load')

        kpi = reviewer_kpi_for(user)
        ranked.append((probability, {
            'id': user.id,
            'name': user.get_full_name() or user.email,
            'institution': profile.institution,
            'specialty_tags': profile.specialty_tags or [],
            'match_score': score,
            'match_reasons': reasons,
            'reliability_score': kpi['score'],
            'reliability_band': kpi['band'],
            'match_breakdown': breakdown,
            'matched_keywords': [
                {'manuscript': m, 'reviewer': r} for m, r in row['matched_keywords'][:3]
            ],
            'active_reviews': row['active_reviews'],
            'avg_turnaround_days': kpi['metrics']['avg_turnaround_days'],
            'availability': row['availability'],
            'conflict': row['soft_conflicts'][0] if row['soft_conflicts'] else None,
            'model_version': model_version,
        }))

    ranked.sort(key=lambda pair: (-pair[0], pair[1]['id']))
    return {'candidates': [candidate for _p, candidate in ranked], 'excluded': {'authorship': excluded_authorship}}
