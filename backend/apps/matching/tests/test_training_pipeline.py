"""
Unit tests for the offline pieces in ml_service/: ranking metrics in
train_ranker.py, and the synthetic-dataset guarantees generate_dataset.py
promises (unique titles, no hidden labels in matched text, tag noise).
No database; imports ml_service/ modules directly.
"""
import random
import sys
from pathlib import Path

import numpy as np
import pytest

ML_SERVICE = Path(__file__).resolve().parents[4] / 'ml_service'
sys.path.insert(0, str(ML_SERVICE))

import generate_dataset  # noqa: E402
import train_ranker  # noqa: E402
from corpus import SUBTOPICS  # noqa: E402


def test_ndcg_is_one_for_the_ideal_order_and_ties_resolve_stably():
    relevance = np.array([3, 0, 2, 0])
    assert train_ranker.ndcg_at_k(np.array([4.0, 1.0, 3.0, 0.0]), relevance, 5) == pytest.approx(1.0)
    # Equal scores keep file order, so the first row wins the tie.
    assert list(train_ranker._top(np.array([1.0, 1.0, 1.0]), 2)) == [0, 1]


def test_evaluate_ranking_skips_manuscripts_with_nothing_relevant():
    manuscript_ids = np.array([1, 1, 1, 2, 2, 2])
    relevance = np.array([3, 0, 0, 0, 0, 1])   # manuscript 2 has no relevance >= 2
    scores = np.array([0.9, 0.1, 0.2, 0.5, 0.4, 0.3])
    precision, ndcg, used = train_ranker.evaluate_ranking(manuscript_ids, scores, relevance)
    assert used == 1
    assert precision == pytest.approx(1 / 3)
    assert ndcg == pytest.approx(1.0)


def test_random_baseline_is_close_to_the_share_of_relevant_candidates():
    manuscript_ids = np.repeat(np.arange(20), 10)
    relevance = np.tile(np.array([2] * 3 + [0] * 7), 20)
    result = train_ranker.random_baseline(manuscript_ids, relevance, np.zeros(200))
    assert result['precision_at_3'] == pytest.approx(0.3, abs=0.05)


def test_titles_are_made_unique_without_random_draws():
    manuscripts = [{'title': 'Same'}, {'title': 'Other'}, {'title': 'Same'}]
    generate_dataset.make_titles_unique(manuscripts)
    assert [m['title'] for m in manuscripts] == ['Same', 'Other', 'Same: follow-up study 2']


def test_expertise_text_never_contains_hidden_labels_or_weight_words():
    rng = random.Random(1)
    subtopics = SUBTOPICS[:3]
    weights = {subtopics[0]['id']: 0.9, subtopics[1]['id']: 0.3, subtopics[2]['id']: 0.1}
    text = (generate_dataset.make_expertise_blurb(rng, subtopics, weights) + ' '
            + generate_dataset.make_research_areas(rng, subtopics)).lower()
    for sub in subtopics:
        assert sub['label'].lower() not in text
    for phrase in ('primary research focus', 'active interest', 'occasional collaboration'):
        assert phrase not in text


def test_tag_noise_keeps_hard_case_reviewers_and_records_true_tags():
    reviewers = [{'specialty_tags': ['machine-learning']} for _ in range(40)]
    manuscripts = [{'specialty_tags': ['nlp']} for _ in range(40)]
    generate_dataset.apply_tag_noise(random.Random(2), manuscripts, reviewers)
    assert all(r['specialty_tags'] == ['machine-learning'] for r in reviewers[:5])
    assert all(r['true_specialty_tags'] == ['machine-learning'] for r in reviewers)
    assert any(r['specialty_tags'] != r['true_specialty_tags'] for r in reviewers[5:])
    assert any(m['specialty_tags'] != m['true_specialty_tags'] for m in manuscripts)
