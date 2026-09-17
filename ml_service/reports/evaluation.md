# Reviewer-matching model evaluation — ranker_v1

Trained on `ml_service\data\generated\pairs.csv`: 7192 (manuscript, reviewer) pairs across
120 manuscripts; 749 positive ("would accept and deliver a good, on-time
review") labels (10.4%).

**Labels are simulated, not from real completed reviews** — see ml_service/README.md and
matching_system.md. Relevance and success come from hidden subtopics that are never written into
any text the matcher reads (checked by `ml_service/check_dataset.py`); specialty tags are
deliberately noisy, like real self-picked tags.

The learned ranker is 5-fold cross-validated, grouped by manuscript (a manuscript's pairs never
appear in both train and test). The rule-based, TF-IDF-only and random rows need no training and
are computed once over all pairs. Precision@3 / NDCG@5 average over the 120 manuscripts
that have at least one relevant candidate (relevance ≥ 2: shares the manuscript's hidden
topic or its tag-level area); the rest cannot be ranked well or badly.

## Ranker vs baselines

| Approach | AUC | Precision@3 | NDCG@5 |
|---|---|---|---|
| Random order | 0.500 | 0.105 | 0.113 |
| Rule-based (old tag-overlap scorer) | 0.681 | 0.775 | 0.654 |
| TF-IDF text similarity only | 0.665 | 0.872 | 0.869 |
| **Learned ranker** (7 features) | 0.776 | 0.897 | 0.868 |

Train AUC 0.780 vs cross-validated 0.776 — a small gap means no
meaningful overfitting.

## Tag ablation

| Approach | AUC | Precision@3 | NDCG@5 |
|---|---|---|---|
| Learned ranker (7 features) | 0.776 | 0.897 | 0.868 |
| Without `tag_overlap` (6 features) | 0.758 | 0.839 | 0.820 |

**Finding:** removing tag_overlap lowers NDCG@5 by more than 0.01 — noisy tags still add signal the text features miss.

## Cold start: manuscript or reviewer has no tags

1590 pairs; scored with out-of-fold predictions.

| Approach | Precision@3 | NDCG@5 | Manuscripts |
|---|---|---|---|
| Random order | 0.138 | 0.324 | 59 |
| Learned ranker | 0.390 | 0.676 | 59 |

## Model

- Logistic regression, `class_weight='balanced'`, features standardised (means/stds stored in the
  model JSON so serving reproduces training exactly).
- Weights: {'text_sim': 0.37, 'keyword_fit': 0.233, 'tag_overlap': 0.385, 'load': -0.164, 'acceptance_rate': 0.236, 'is_busy': -0.258, 'is_unavailable': -0.704}
- Intercept: -0.429
- Penalty features dropped for a positive weight: none
- Scores are relative match scores for ranking, not probabilities: balanced class weights push
  the average score well above the 10.4% success rate.

## Tag suggestion

110 tagged manuscripts, 5-fold. Trained on the other manuscripts'
(noisy) tags plus reviewer profiles and publications; graded against each held-out manuscript's
true tags.

| Approach | Correct tag in top 3 | Suggested tags that are correct | No suggestion shown |
|---|---|---|---|
| Label matching only | 23.6% | 28.4% | 45.5% |
| TF-IDF classifier (probability ≥ 0.6) | 96.4% | 76.2% | 1.8% |

The synthetic abstracts reuse each topic's vocabulary, which flatters any word-based method.

Reproduce (manage.py from `backend/`): `python manage.py migrate` →
`python ml_service/generate_dataset.py` → `python ml_service/check_dataset.py` →
`python manage.py repair_ml_dataset --confirm` (or `seed_ml_dataset` on an empty database) →
`python manage.py export_matching_pairs` → `python ml_service/train_ranker.py`
