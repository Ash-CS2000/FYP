"""
Pure feature engineering for reviewer matching -- no Django imports, so this
module is the single source of truth shared between the live ranking code
(apps/matching/ranking.py) and the offline training pipeline (which exports
features through that same ranking code). Training and serving computing a
feature differently is exactly how a model silently stops matching what it
was trained on, so nothing feature-related should exist in two places.

Every function here takes plain values (strings, lists, ints, floats) --
never a Django model instance -- and returns plain values back.

The text features use TF-IDF + cosine similarity (scikit-learn), fitted in
memory per ranking request. Nothing is stored.
"""
import math

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

FEATURE_NAMES = [
    'text_sim',
    'keyword_fit',
    'tag_overlap',
    'load',
    'acceptance_rate',
    'is_busy',
    'is_unavailable',
]

# Features where a higher value can only ever count against a reviewer. The
# training script drops any of these whose learned weight comes out positive
# rather than ship a model that rewards being overloaded.
PENALTY_FEATURES = ('load', 'is_busy', 'is_unavailable')


def feature_label(name, value):
    """Human-readable label for one feature, phrased for the value it
    actually has -- so a reviewer who is NOT busy is never described as
    "Marked as heavy load" just because that feature nudged their score up."""
    if name == 'text_sim':
        return 'Overall topic fit'
    if name == 'keyword_fit':
        return 'Keyword overlap'
    if name == 'tag_overlap':
        return 'Specialty tag overlap'
    if name == 'load':
        return 'No current review load' if value == 0 else 'Current review load'
    if name == 'acceptance_rate':
        return 'Track record of accepting invitations'
    if name == 'is_busy':
        return 'Marked as heavy load' if value else 'Not marked as heavy load'
    if name == 'is_unavailable':
        return 'Marked as unavailable' if value else 'Not marked as unavailable'
    return name


def tfidf_similarities(query, documents):
    """Cosine similarity between `query` and each string in `documents`,
    using one TfidfVectorizer fitted on all of them together. Empty
    documents score 0. If there is no usable vocabulary at all (every string
    empty or stop words only) every score is 0 rather than an error."""
    if not documents:
        return []
    try:
        matrix = TfidfVectorizer(stop_words='english').fit_transform([query or ''] + [d or '' for d in documents])
    except ValueError:  # empty vocabulary
        return [0.0] * len(documents)
    return [float(s) for s in cosine_similarity(matrix[0], matrix[1:])[0]]


def normalize_keyword(k):
    return ' '.join(k.strip().lower().split())


def keyword_fit(manuscript_keywords, reviewer_keywords):
    """Plain keyword overlap: the fraction of the manuscript's distinct
    keywords (case/whitespace-insensitive) that the reviewer also lists.
    Returns (score, matched_pairs) where matched_pairs is a list of
    (manuscript_keyword, reviewer_keyword) for the UI's matched-keyword chips."""
    reviewer_by_norm = {}
    for k in reviewer_keywords or []:
        if k.strip():
            reviewer_by_norm.setdefault(normalize_keyword(k), k)
    manuscript_by_norm = {}
    for k in manuscript_keywords or []:
        if k.strip():
            manuscript_by_norm.setdefault(normalize_keyword(k), k)
    if not manuscript_by_norm or not reviewer_by_norm:
        return 0.0, []
    pairs = [(k, reviewer_by_norm[norm]) for norm, k in manuscript_by_norm.items() if norm in reviewer_by_norm]
    return len(pairs) / len(manuscript_by_norm), pairs


def tag_overlap(manuscript_tags, reviewer_tags):
    """Cosine-style overlap over tag SETS: |shared| / sqrt(|m|*|r|). Unlike
    the old |shared|/|manuscript tags| formula (apps/matching/baseline.py),
    this penalises a reviewer who lists every tag in the taxonomy -- tagging
    broadly no longer buys a free ride. 0 when either side has no tags at
    all, so an untagged reviewer or manuscript relies on the text features."""
    manuscript_tags, reviewer_tags = set(manuscript_tags or []), set(reviewer_tags or [])
    if not manuscript_tags or not reviewer_tags:
        return 0.0
    shared = manuscript_tags & reviewer_tags
    if not shared:
        return 0.0
    return len(shared) / math.sqrt(len(manuscript_tags) * len(reviewer_tags))


def beta_smoothed_rate(successes, total, alpha=2, beta=2):
    """Beta(alpha, beta)-smoothed rate -- a reviewer with 0 invitations gets
    0.5 (a neutral prior) instead of an undefined 0/0, and a reviewer with 1
    accepted invitation out of 1 doesn't get treated as a guaranteed 100%."""
    return (successes + alpha) / (total + alpha + beta)


def build_features(*, text_sim, kw_fit, tag_ov, active_load, acceptance_rate, is_busy, is_unavailable):
    return {
        'text_sim': float(text_sim),
        'keyword_fit': float(kw_fit),
        'tag_overlap': float(tag_ov),
        'load': float(math.log1p(max(active_load, 0))),
        'acceptance_rate': float(acceptance_rate),
        'is_busy': 1.0 if is_busy else 0.0,
        'is_unavailable': 1.0 if is_unavailable else 0.0,
    }


def score_details(features, model):
    """Applies a trained model (the dict shape written by
    ml_service/train_ranker.py to apps/matching/model/ranker_v1.json) to one
    feature dict. Returns (score_0_100, contributions, probability) where
    contributions is a list of (feature_name, standardised_value,
    contribution) sorted by |contribution| descending -- contribution IS
    weight * standardised_value, so it sums exactly (plus the intercept) to
    the pre-sigmoid logit. That exactness is the whole point of using
    logistic regression here: the explanation is not an approximation of the
    score, it computed the score.

    The score is a RELATIVE match score for ranking, not a calibrated
    probability of success: the model is trained with balanced class weights.
    """
    names = model['feature_names']
    means = model['means']
    stds = model['stds']
    coefficients = model['coefficients']
    intercept = model['intercept']

    logit = intercept
    contributions = []
    for name, mean, std, coef in zip(names, means, stds, coefficients):
        value = features.get(name, mean)  # impute with training mean if missing
        z = (value - mean) / std if std > 0 else 0.0
        contribution = coef * z
        logit += contribution
        contributions.append((name, z, contribution))

    contributions.sort(key=lambda c: -abs(c[2]))
    probability = 1.0 / (1.0 + math.exp(-logit))
    return round(probability * 100), contributions, probability


def score_with_model(features, model):
    score, contributions, _probability = score_details(features, model)
    return score, contributions


def match_reasons(features, contributions, responded_invitations, limit=3):
    """The short "why" shown next to a candidate. Only positive, genuinely
    present fit evidence counts -- never a penalty feature that merely
    nudged the score up by being absent, and never a history-based reason
    for a reviewer with no history:
      - tag_overlap / keyword_fit: something was actually shared (> 0)
      - text_sim: above the training average (z > 0)
      - acceptance_rate: above average AND at least one past response
    """
    reasons = []
    for name, z, contribution in sorted(contributions, key=lambda c: -c[2]):
        if contribution <= 0:
            continue
        if name in ('tag_overlap', 'keyword_fit') and features.get(name, 0) > 0:
            reasons.append(feature_label(name, features[name]))
        elif name == 'text_sim' and z > 0:
            reasons.append(feature_label(name, features[name]))
        elif name == 'acceptance_rate' and z > 0 and responded_invitations > 0:
            reasons.append(feature_label(name, features[name]))
        if len(reasons) == limit:
            break
    return reasons
