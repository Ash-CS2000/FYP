"""
Reviewer-candidate ranking for a manuscript. Deliberately rule-based — no
embeddings, no trained model. There is no historical review-outcome data
anywhere in this system to train or ground anything smarter on (Peer Review
isn't built yet), and the frontend's match_reasons field exists specifically
so an editor can verify a score by eye rather than trust it. match_score is
treated as an opaque, swappable number by the frontend (see
frontend/src/api/invitations.js), so this is a deliberate starting point,
not a permanent ceiling — revisit once real review outcomes exist to learn
from.
"""
import re

from django.db.models import Count

from apps.users.models import UserProfile, UserRole
from apps.users.taxonomy import SPECIALTY_TAG_LABELS

from .models import ReviewAssignment

AVAILABILITY_MAP = {'available': 'available', 'busy': 'busy'}

# Fallback token overlap is capped well below what even a single real tag
# match scores (33+ on a 3-tag manuscript), so a fallback match can never
# outrank a genuine one.
FALLBACK_SCORE_CAP = 35
FALLBACK_SCORE_PER_TOKEN = 10
MIN_TOKEN_LENGTH = 4

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text):
    if not text:
        return set()
    return {t for t in _TOKEN_RE.findall(text.lower()) if len(t) >= MIN_TOKEN_LENGTH}


def compute_conflict(manuscript, user):
    """None unless the candidate is one of the manuscript's own authors (by
    email) or shares an institution with a listed author/affiliation.
    Returned as a populated string, never used to filter a candidate out."""
    email = (user.email or '').strip().lower()
    if email and manuscript.authors.filter(email__iexact=email).exists():
        return 'This reviewer is an author on this manuscript.'

    institution = (getattr(user.profile, 'institution', '') or '').strip().lower()
    if institution:
        for affiliation in manuscript.authors.values_list('affiliations__institution', flat=True):
            if affiliation and affiliation.strip().lower() == institution:
                return 'Same institution as a listed co-author.'
    return None


def _availability_for(profile):
    return AVAILABILITY_MAP.get(profile.availability_status, 'unavailable')


def _score_and_reasons(manuscript, profile):
    manuscript_tags = manuscript.specialty_tags or []
    reviewer_tags = profile.specialty_tags or []

    if manuscript_tags:
        shared = sorted(set(manuscript_tags) & set(reviewer_tags))
        if shared:
            tag_score = round(100 * len(shared) / len(manuscript_tags))
            labels = ', '.join(SPECIALTY_TAG_LABELS.get(s, s) for s in shared)
            reason = f'Overlaps on {labels} ({len(shared)} of {len(manuscript_tags)} tags)'
            return tag_score, [reason]

    # Fallback: free-text token overlap, only reached when there's no tag
    # overlap (including reviewers who haven't set specialty_tags at all —
    # the common case for pre-feature or ORCID-created accounts).
    manuscript_text = ' '.join(filter(None, [manuscript.category, manuscript.sub_category, manuscript.keywords]))
    reviewer_text = ' '.join(filter(None, [profile.expertise_areas, profile.research_areas]))
    shared_tokens = sorted(_tokenize(manuscript_text) & _tokenize(reviewer_text))
    if shared_tokens:
        text_score = min(FALLBACK_SCORE_CAP, FALLBACK_SCORE_PER_TOKEN * len(shared_tokens))
        preview = ', '.join(f"'{t}'" for t in shared_tokens[:3])
        reason = f'Possible fit — expertise text mentions {preview}'
        return text_score, [reason]

    return 0, []


def rank_candidates(manuscript):
    profiles = (
        UserProfile.objects
        .filter(user__roles__role=UserProfile.Role.REVIEWER, user__roles__status=UserRole.Status.ACTIVE)
        .select_related('user')
        .distinct()
    )

    active_counts = dict(
        ReviewAssignment.objects
        .filter(
            reviewer__in=[p.user_id for p in profiles],
            status__in=[ReviewAssignment.Status.INVITED, ReviewAssignment.Status.ACCEPTED],
        )
        .values_list('reviewer_id')
        .annotate(count=Count('id'))
    )

    candidates = []
    for profile in profiles:
        user = profile.user
        score, reasons = _score_and_reasons(manuscript, profile)
        active_reviews = active_counts.get(user.id, 0)
        if active_reviews == 0:
            reasons = [*reasons, 'No current review load']

        candidates.append({
            'id': user.id,
            'name': user.get_full_name() or user.email,
            'institution': profile.institution,
            'specialty_tags': profile.specialty_tags or [],
            'match_score': score,
            'match_reasons': reasons,
            'active_reviews': active_reviews,
            'avg_turnaround_days': None,  # no completed reviews exist yet — real once Peer Review ships
            'availability': _availability_for(profile),
            'conflict': compute_conflict(manuscript, user),
        })

    candidates.sort(key=lambda c: c['match_score'], reverse=True)
    return candidates
