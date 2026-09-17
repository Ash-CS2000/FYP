"""
Thin re-export shim. The reviewer-matching implementation moved to
apps/matching/ranking.py (TF-IDF text features + a trained logistic-regression
ranker -- see matching_system.md) when the original rule-based scorer here
was replaced. Kept as a module so any remaining `from apps.reviews.matching import
rank_candidates, compute_conflict` keeps working (apps/manuscripts/views.py
now imports from apps.matching.ranking and apps.manuscripts.conflicts
directly).

Note rank_candidates() now returns {'candidates': [...], 'excluded': {...}}
rather than a bare list -- see apps/matching/ranking.py's docstring.

compute_conflict() is the SOFT-only check (same institution, name mismatch)
kept for any external caller expecting the old combined signature. The
HARD, non-overridable authorship check it never covered is
apps.manuscripts.conflicts.authorship_reason() -- see that module.
"""
from apps.manuscripts.conflicts import compute_conflict  # noqa: F401
from apps.matching.ranking import rank_candidates  # noqa: F401
