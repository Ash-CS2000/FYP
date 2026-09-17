#!/usr/bin/env python
"""
Trains the reviewer-matching ranker on ml_service/data/generated/pairs.csv
(built by `python manage.py export_matching_pairs` from the seeded
database), evaluates it against baselines, and writes:

    backend/apps/matching/model/ranker_v1.json  -- the model the live
        Django ranking code loads (apps/matching/ranking.py): feature
        names/means/stds/coefficients/intercept. Scoring is plain arithmetic;
        the backend uses scikit-learn only for the TF-IDF text features.
    ml_service/reports/evaluation.md             -- the metrics
        matching_system.md quotes.

It also evaluates specialty-tag suggestion (backend/apps/matching/tagging.py)
on data/generated/dataset.json.

FEATURE_NAMES and PENALTY_FEATURES are duplicated from
apps/matching/features.py (not imported) so the ranker part only ever touches
a CSV file. Keep them in sync by hand; a mismatch shows up immediately as a
KeyError reading pairs.csv's header.
"""
import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupKFold, KFold
from sklearn.preprocessing import StandardScaler

FEATURE_NAMES = [
    'text_sim', 'keyword_fit', 'tag_overlap', 'load', 'acceptance_rate', 'is_busy', 'is_unavailable',
]
PENALTY_FEATURES = ('load', 'is_busy', 'is_unavailable')

VERSION = 'ranker_v1'
N_FOLDS = 5
K_PRECISION = 3
K_NDCG = 5
RELEVANT = 2          # relevance >= 2: shares the hidden topic or its tag-level area
RANDOM_SHUFFLES = 50
SEED = 40006

BASE = Path(__file__).parent
BACKEND = BASE.parent / 'backend'
PAIRS_PATH = BASE / 'data' / 'generated' / 'pairs.csv'
DATASET_PATH = BASE / 'data' / 'generated' / 'dataset.json'
MODEL_OUT = BACKEND / 'apps' / 'matching' / 'model' / 'ranker_v1.json'
REPORT_OUT = BASE / 'reports' / 'evaluation.md'


def load_pairs():
    columns = {k: [] for k in ('manuscript_id', 'baseline', 'm_tags', 'r_tags', 'relevance', 'success')}
    X = []
    with open(PAIRS_PATH, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            columns['manuscript_id'].append(int(row['manuscript_id']))
            X.append([float(row[name]) for name in FEATURE_NAMES])
            columns['baseline'].append(float(row['baseline_score']))
            columns['m_tags'].append(int(row['manuscript_tag_count']))
            columns['r_tags'].append(int(row['reviewer_tag_count']))
            columns['relevance'].append(int(row['relevance']))
            columns['success'].append(int(row['success']))
    data = {k: np.array(v) for k, v in columns.items()}
    data['X'] = np.array(X, dtype=np.float64)
    return data


# -- ranking metrics ----------------------------------------------------------

def _top(scores, k):
    # Stable sort: ties keep file order, so results don't depend on sort internals.
    return np.argsort(-scores, kind='stable')[:k]


def precision_at_k(scores, relevance, k):
    order = _top(scores, k)
    return float(np.mean(relevance[order] >= RELEVANT))


def ndcg_at_k(scores, relevance, k):
    order = _top(scores, k)
    discounts = np.log2(np.arange(2, len(order) + 2))
    actual = float(np.sum((2.0 ** relevance[order] - 1) / discounts))
    ideal_rel = np.sort(relevance)[::-1][:k]
    ideal = float(np.sum((2.0 ** ideal_rel - 1) / np.log2(np.arange(2, len(ideal_rel) + 2))))
    return actual / ideal


def evaluate_ranking(manuscript_ids, scores, relevance):
    """Averages Precision@K / NDCG@K over manuscripts (each manuscript is one
    ranking problem). Manuscripts with no relevant candidate at all are
    skipped: every method scores 0 there, which says nothing about ranking.
    Returns (precision, ndcg, manuscripts_used)."""
    precisions, ndcgs = [], []
    for mid in np.unique(manuscript_ids):
        mask = manuscript_ids == mid
        if mask.sum() < 2 or not np.any(relevance[mask] >= RELEVANT):
            continue
        precisions.append(precision_at_k(scores[mask], relevance[mask], K_PRECISION))
        ndcgs.append(ndcg_at_k(scores[mask], relevance[mask], K_NDCG))
    if not precisions:
        return None, None, 0
    return float(np.mean(precisions)), float(np.mean(ndcgs)), len(precisions)


def metrics(manuscript_ids, scores, relevance, success):
    p, n, used = evaluate_ranking(manuscript_ids, scores, relevance)
    auc = roc_auc_score(success, scores) if len(np.unique(success)) > 1 else None
    return {'auc': auc, 'precision_at_3': p, 'ndcg_at_5': n, 'manuscripts': used}


def random_baseline(manuscript_ids, relevance, success):
    rng = np.random.default_rng(SEED)
    runs = [evaluate_ranking(manuscript_ids, rng.random(len(relevance)), relevance) for _ in range(RANDOM_SHUFFLES)]
    return {
        'auc': 0.5,
        'precision_at_3': float(np.mean([r[0] for r in runs])),
        'ndcg_at_5': float(np.mean([r[1] for r in runs])),
        'manuscripts': runs[0][2],
    }


# -- model ---------------------------------------------------------------------

def fit(X, y):
    scaler = StandardScaler().fit(X)
    clf = LogisticRegression(class_weight='balanced', max_iter=1000).fit(scaler.transform(X), y)
    return scaler, clf


def cross_validate(data, feature_idx):
    """GroupKFold by manuscript -- a manuscript's pairs never span train and
    test. Returns (metrics averaged over folds, out-of-fold predictions)."""
    X, y, groups = data['X'][:, feature_idx], data['success'], data['manuscript_id']
    oof = np.zeros(len(y))
    aucs, precisions, ndcgs, train_aucs = [], [], [], []
    for train_idx, test_idx in GroupKFold(n_splits=N_FOLDS).split(X, y, groups=groups):
        scaler, clf = fit(X[train_idx], y[train_idx])
        proba = clf.predict_proba(scaler.transform(X[test_idx]))[:, 1]
        oof[test_idx] = proba
        train_aucs.append(roc_auc_score(y[train_idx], clf.predict_proba(scaler.transform(X[train_idx]))[:, 1]))
        if len(np.unique(y[test_idx])) > 1:
            aucs.append(roc_auc_score(y[test_idx], proba))
        p, n, _ = evaluate_ranking(groups[test_idx], proba, data['relevance'][test_idx])
        precisions.append(p)
        ndcgs.append(n)
    return {
        'auc': float(np.mean(aucs)) if aucs else None,
        'train_auc': float(np.mean(train_aucs)),
        'precision_at_3': float(np.mean([p for p in precisions if p is not None])),
        'ndcg_at_5': float(np.mean([n for n in ndcgs if n is not None])),
    }, oof


def select_features(data):
    """Fits on all features, then drops any penalty feature whose weight came
    out positive (a model must never reward being overloaded or unavailable)
    and refits, until every penalty weight is <= 0."""
    names = list(FEATURE_NAMES)
    dropped = []
    while True:
        idx = [FEATURE_NAMES.index(n) for n in names]
        scaler, clf = fit(data['X'][:, idx], data['success'])
        wrong = [n for n, w in zip(names, clf.coef_[0]) if n in PENALTY_FEATURES and w > 0]
        if not wrong:
            return names, scaler, clf, dropped
        worst = max(wrong, key=lambda n: clf.coef_[0][names.index(n)])
        dropped.append((worst, float(clf.coef_[0][names.index(worst)])))
        names.remove(worst)


def model_to_json(scaler, clf, feature_names, model_metrics):
    return {
        'version': VERSION,
        'trained_at': datetime.now(timezone.utc).isoformat(),
        'text_features': 'tfidf',
        'feature_names': feature_names,
        'means': scaler.mean_.tolist(),
        'stds': scaler.scale_.tolist(),
        'coefficients': clf.coef_[0].tolist(),
        'intercept': float(clf.intercept_[0]),
        'metrics': model_metrics,
    }


# -- tag suggestion --------------------------------------------------------------

def evaluate_tag_suggestion():
    """5-fold over manuscripts: fit TagSuggester on the other manuscripts plus
    every reviewer's profile and publications (with their noisy, self-picked
    tags, as the live app would), then score suggestions for held-out
    manuscripts against their TRUE (pre-noise) tags. Compared with matching
    the abstract against tag names alone."""
    sys.path.insert(0, str(BACKEND))
    from apps.matching.tagging import TagSuggester
    from apps.matching import tagging
    from apps.users.taxonomy import SPECIALTY_TAG_LABELS

    dataset = json.load(open(DATASET_PATH, encoding='utf-8'))
    manuscripts = [m for m in dataset['manuscripts'] if m.get('true_specialty_tags')]
    reviewer_texts, reviewer_tags = [], []
    for r in dataset['reviewers']:
        if not r['specialty_tags']:
            continue
        reviewer_texts.append(f"{r['expertise_areas']}. {r['research_areas']}")
        reviewer_tags.append(r['specialty_tags'])
        for p in r['publications']:
            reviewer_texts.append(f"{p['title']}. {p['abstract']}. {p['keywords']}")
            reviewer_tags.append(r['specialty_tags'])

    def text_of(m):
        return f"{m['title']}. {m['abstract']}. {m['keywords']}"

    def score(suggest):
        hit = shown_right = shown = empty = 0
        for train_idx, test_idx in KFold(N_FOLDS, shuffle=True, random_state=SEED).split(manuscripts):
            suggester = suggest(train_idx)
            for i in test_idx:
                truth = set(manuscripts[i]['true_specialty_tags'])
                slugs = [slug for slug, _ in suggester.suggest(text_of(manuscripts[i]))]
                empty += not slugs
                hit += bool(truth & set(slugs))
                shown_right += len(truth & set(slugs))
                shown += len(slugs)
        n = len(manuscripts)
        return {'hit_at_3': hit / n, 'precision': shown_right / shown if shown else 0.0, 'nothing_shown': empty / n}

    def classifier(train_idx):
        texts = [text_of(manuscripts[i]) for i in train_idx] + reviewer_texts
        tags = [manuscripts[i]['specialty_tags'] for i in train_idx] + reviewer_tags
        return TagSuggester(SPECIALTY_TAG_LABELS).fit(texts, tags)

    def label_match_only(_train_idx):
        return TagSuggester(SPECIALTY_TAG_LABELS)  # unfitted: falls straight to label matching

    return {
        'n_manuscripts': len(manuscripts),
        'classifier': score(classifier),
        'label_match': score(label_match_only),
        'threshold': tagging.PROBABILITY_THRESHOLD,
    }


# -- report ----------------------------------------------------------------------

def fmt(value):
    return '—' if value is None else f'{value:.3f}'


def row(name, m):
    return f"| {name} | {fmt(m['auc'])} | {fmt(m['precision_at_3'])} | {fmt(m['ndcg_at_5'])} |"


def main():
    data = load_pairs()
    y, groups, rel = data['success'], data['manuscript_id'], data['relevance']
    print(f'Loaded {len(y)} pairs across {len(np.unique(groups))} manuscripts, {y.sum()} positive ({y.mean():.1%}).')

    names, scaler, clf, dropped = select_features(data)
    idx = [FEATURE_NAMES.index(n) for n in names]
    for name, weight in dropped:
        print(f'Dropped penalty feature {name}: learned weight {weight:+.3f} > 0')

    full, oof = cross_validate(data, idx)
    no_tag_idx = [FEATURE_NAMES.index(n) for n in names if n != 'tag_overlap']
    no_tag, _ = cross_validate(data, no_tag_idx)

    rule = metrics(groups, data['baseline'], rel, y)
    text_only = metrics(groups, data['X'][:, FEATURE_NAMES.index('text_sim')], rel, y)
    random_ = random_baseline(groups, rel, y)
    full_ranking = evaluate_ranking(groups, oof, rel)
    print(f'Full model (CV): {full}')
    print(f'Without tag_overlap (CV): {no_tag}')
    print(f'Rule-based: {rule}\nTF-IDF only: {text_only}\nRandom: {random_}')

    # Cold start: pairs where the manuscript or the reviewer has no tags at all,
    # scored with out-of-fold predictions (never on pairs the model trained on).
    cold = (data['m_tags'] == 0) | (data['r_tags'] == 0)
    cold_model = evaluate_ranking(groups[cold], oof[cold], rel[cold])
    cold_random = random_baseline(groups[cold], rel[cold], y[cold])

    tagging_eval = evaluate_tag_suggestion()
    print(f'Tag suggestion: {tagging_eval}')

    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_OUT, 'w', encoding='utf-8') as f:
        json.dump(model_to_json(scaler, clf, names, {
            'cv': full, 'rule_baseline': rule, 'tfidf_only_baseline': text_only, 'random_baseline': random_,
            'n_pairs': int(len(y)), 'n_manuscripts': int(len(np.unique(groups))),
            'dropped_penalty_features': dropped,
        }), f, indent=2)

    tags_help = no_tag['ndcg_at_5'] < full['ndcg_at_5'] - 0.01
    weights = dict(zip(names, [round(float(c), 3) for c in clf.coef_[0]]))
    REPORT_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_OUT, 'w', encoding='utf-8') as f:
        f.write(f"""# Reviewer-matching model evaluation — {VERSION}

Trained on `{PAIRS_PATH.relative_to(BASE.parent)}`: {len(y)} (manuscript, reviewer) pairs across
{len(np.unique(groups))} manuscripts; {y.sum()} positive ("would accept and deliver a good, on-time
review") labels ({y.mean():.1%}).

**Labels are simulated, not from real completed reviews** — see ml_service/README.md and
matching_system.md. Relevance and success come from hidden subtopics that are never written into
any text the matcher reads (checked by `ml_service/check_dataset.py`); specialty tags are
deliberately noisy, like real self-picked tags.

The learned ranker is 5-fold cross-validated, grouped by manuscript (a manuscript's pairs never
appear in both train and test). The rule-based, TF-IDF-only and random rows need no training and
are computed once over all pairs. Precision@3 / NDCG@5 average over the {full_ranking[2]} manuscripts
that have at least one relevant candidate (relevance ≥ {RELEVANT}: shares the manuscript's hidden
topic or its tag-level area); the rest cannot be ranked well or badly.

## Ranker vs baselines

| Approach | AUC | Precision@3 | NDCG@5 |
|---|---|---|---|
{row('Random order', random_)}
{row('Rule-based (old tag-overlap scorer)', rule)}
{row('TF-IDF text similarity only', text_only)}
{row(f'**Learned ranker** ({len(names)} features)', full)}

Train AUC {full['train_auc']:.3f} vs cross-validated {fmt(full['auc'])} — a small gap means no
meaningful overfitting.

## Tag ablation

| Approach | AUC | Precision@3 | NDCG@5 |
|---|---|---|---|
{row(f'Learned ranker ({len(names)} features)', full)}
{row(f'Without `tag_overlap` ({len(no_tag_idx)} features)', no_tag)}

**Finding:** {'removing tag_overlap lowers NDCG@5 by more than 0.01 — noisy tags still add signal the text features miss.' if tags_help else 'removing tag_overlap changes NDCG@5 by less than 0.01 — with noisy tags, the text features carry the ranking.'}

## Cold start: manuscript or reviewer has no tags

{int(cold.sum())} pairs; scored with out-of-fold predictions.

| Approach | Precision@3 | NDCG@5 | Manuscripts |
|---|---|---|---|
| Random order | {fmt(cold_random['precision_at_3'])} | {fmt(cold_random['ndcg_at_5'])} | {cold_random['manuscripts']} |
| Learned ranker | {fmt(cold_model[0])} | {fmt(cold_model[1])} | {cold_model[2]} |

## Model

- Logistic regression, `class_weight='balanced'`, features standardised (means/stds stored in the
  model JSON so serving reproduces training exactly).
- Weights: {weights}
- Intercept: {round(float(clf.intercept_[0]), 3)}
- Penalty features dropped for a positive weight: {', '.join(f'{n} ({w:+.3f})' for n, w in dropped) or 'none'}
- Scores are relative match scores for ranking, not probabilities: balanced class weights push
  the average score well above the {y.mean():.1%} success rate.

## Tag suggestion

{tagging_eval['n_manuscripts']} tagged manuscripts, 5-fold. Trained on the other manuscripts'
(noisy) tags plus reviewer profiles and publications; graded against each held-out manuscript's
true tags.

| Approach | Correct tag in top 3 | Suggested tags that are correct | No suggestion shown |
|---|---|---|---|
| Label matching only | {tagging_eval['label_match']['hit_at_3']:.1%} | {tagging_eval['label_match']['precision']:.1%} | {tagging_eval['label_match']['nothing_shown']:.1%} |
| TF-IDF classifier (probability ≥ {tagging_eval['threshold']}) | {tagging_eval['classifier']['hit_at_3']:.1%} | {tagging_eval['classifier']['precision']:.1%} | {tagging_eval['classifier']['nothing_shown']:.1%} |

The synthetic abstracts reuse each topic's vocabulary, which flatters any word-based method.

Reproduce (manage.py from `backend/`): `python manage.py migrate` →
`python ml_service/generate_dataset.py` → `python ml_service/check_dataset.py` →
`python manage.py repair_ml_dataset --confirm` (or `seed_ml_dataset` on an empty database) →
`python manage.py export_matching_pairs` → `python ml_service/train_ranker.py`
""")
    print(f'Wrote {MODEL_OUT}, {REPORT_OUT}')


if __name__ == '__main__':
    main()
