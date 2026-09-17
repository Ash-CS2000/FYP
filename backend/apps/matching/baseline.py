"""
The original rule-based scorer (tag overlap, with a capped free-text
fallback), ported unchanged from the original apps/reviews/matching.py
so it can still serve two purposes:

  1. a baseline the trained ranker is compared against in
     ml_service/train_ranker.py's evaluation report -- "is the ML system
     actually better than what it replaced?" needs the old system runnable
     side by side, not just described in a doc;
  2. a fallback in apps/matching/ranking.py if the trained model file is
     ever missing (a fresh clone before running the training pipeline, a
     corrupted artifact, etc.) -- ranking degrades to the old behaviour
     rather than throwing.

Pure function of plain values (tag lists, free text) -- no Django models,
so ml_service can import it with no Django setup at all.
"""
import re

from apps.users.taxonomy import SPECIALTY_TAG_LABELS

FALLBACK_SCORE_CAP = 35
FALLBACK_SCORE_PER_TOKEN = 10
MIN_TOKEN_LENGTH = 4

_TOKEN_RE = re.compile(r'[a-z0-9]+')


def _tokenize(text):
    if not text:
        return set()
    return {t for t in _TOKEN_RE.findall(text.lower()) if len(t) >= MIN_TOKEN_LENGTH}


def baseline_score(manuscript_tags, reviewer_tags, manuscript_text, reviewer_text):
    """Returns (score_0_100, reason_string_or_None), exactly the original
    apps/reviews/matching.py logic."""
    manuscript_tags = manuscript_tags or []
    reviewer_tags = reviewer_tags or []

    if manuscript_tags:
        shared = sorted(set(manuscript_tags) & set(reviewer_tags))
        if shared:
            tag_score = round(100 * len(shared) / len(manuscript_tags))
            labels = ', '.join(SPECIALTY_TAG_LABELS.get(s, s) for s in shared)
            reason = f'Overlaps on {labels} ({len(shared)} of {len(manuscript_tags)} tags)'
            return tag_score, reason

    shared_tokens = sorted(_tokenize(manuscript_text) & _tokenize(reviewer_text))
    if shared_tokens:
        text_score = min(FALLBACK_SCORE_CAP, FALLBACK_SCORE_PER_TOKEN * len(shared_tokens))
        preview = ', '.join(f"'{t}'" for t in shared_tokens[:3])
        reason = f'Possible fit — expertise text mentions {preview}'
        return text_score, reason

    return 0, None
