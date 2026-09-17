"""
Pure unit tests for apps/matching/features.py -- no Django ORM, no
database. See backend/pytest.ini.
"""
import math

import pytest

from apps.matching import features


def test_tfidf_identical_text_is_one():
    text = 'hydrological watershed model for water scarcity under climate change'
    assert features.tfidf_similarities(text, [text]) == [pytest.approx(1.0)]


def test_tfidf_unrelated_text_is_zero():
    sims = features.tfidf_similarities('quantum error correction codes', ['supply chain marketing strategy'])
    assert sims == [pytest.approx(0.0)]


def test_tfidf_empty_documents_score_zero_without_error():
    assert features.tfidf_similarities('graph neural networks', ['', '']) == [0.0, 0.0]
    # Stop words only -> empty vocabulary -> all zeros rather than a ValueError.
    assert features.tfidf_similarities('the and of', ['it is']) == [0.0]
    assert features.tfidf_similarities('anything', []) == []


def test_tfidf_ranks_the_closer_document_higher():
    sims = features.tfidf_similarities(
        'deep learning for medical image segmentation',
        ['survey of supply chain finance', 'deep learning medical image segmentation benchmark'],
    )
    assert sims[1] > sims[0]


def test_keyword_fit_is_fraction_of_distinct_manuscript_keywords_shared():
    score, pairs = features.keyword_fit(
        ['Hydrology', 'climate change', 'remote sensing'],
        ['hydrology', 'Climate  Change', 'epidemiology'],
    )
    assert score == pytest.approx(2 / 3)
    assert pairs == [('Hydrology', 'hydrology'), ('climate change', 'Climate  Change')]


def test_keyword_fit_dedupes_case_variants_of_the_same_keyword():
    # 'Hydrology' and 'hydrology' are one keyword, not two matches out of three.
    score, pairs = features.keyword_fit(['Hydrology', 'hydrology', 'x'], ['hydrology'])
    assert score == pytest.approx(1 / 2)
    assert len(pairs) == 1


def test_keyword_fit_empty_side_is_zero():
    assert features.keyword_fit([], ['hydrology']) == (0.0, [])
    assert features.keyword_fit(['hydrology'], []) == (0.0, [])


def test_tag_overlap_penalises_over_tagging():
    # A reviewer who lists every tag in the taxonomy should NOT score as
    # well as one who lists exactly the manuscript's tags.
    manuscript_tags = {'machine-learning', 'nlp'}
    focused_reviewer_tags = {'machine-learning', 'nlp'}
    broad_reviewer_tags = {'machine-learning', 'nlp'} | {f'tag-{i}' for i in range(20)}

    assert features.tag_overlap(manuscript_tags, focused_reviewer_tags) == pytest.approx(1.0)
    assert features.tag_overlap(manuscript_tags, broad_reviewer_tags) < 1.0


def test_tag_overlap_counts_distinct_tags():
    assert features.tag_overlap(['a', 'a'], ['a']) == pytest.approx(1.0)


def test_tag_overlap_zero_when_either_side_untagged_or_nothing_shared():
    assert features.tag_overlap([], ['machine-learning']) == 0.0
    assert features.tag_overlap(None, None) == 0.0
    assert features.tag_overlap(['machine-learning'], ['epidemiology']) == 0.0


def test_beta_smoothed_rate_neutral_prior_with_no_data():
    assert features.beta_smoothed_rate(0, 0) == pytest.approx(0.5)


def test_beta_smoothed_rate_pulls_extreme_rates_toward_center():
    assert features.beta_smoothed_rate(1, 1) == pytest.approx(3 / 5)


def _features(**overrides):
    values = dict(text_sim=0.5, kw_fit=0.5, tag_ov=0.5, active_load=0, acceptance_rate=0.5, is_busy=False, is_unavailable=False)
    values.update(overrides)
    return features.build_features(**values)


def test_build_features_has_exactly_the_model_features():
    assert list(_features()) == features.FEATURE_NAMES


def test_build_features_load_is_log_scaled_and_flags_are_binary():
    assert _features()['load'] == 0.0
    f = _features(active_load=7, is_busy=True, is_unavailable=True)
    assert f['load'] == pytest.approx(math.log1p(7))
    assert f['is_busy'] == 1.0 and f['is_unavailable'] == 1.0


def test_feature_label_describes_the_actual_value():
    assert features.feature_label('is_busy', 0.0) == 'Not marked as heavy load'
    assert features.feature_label('is_busy', 1.0) == 'Marked as heavy load'
    assert features.feature_label('load', 0.0) == 'No current review load'
    assert features.feature_label('is_unavailable', 1.0) == 'Marked as unavailable'


def _toy_model():
    # 2 features for a small, hand-checkable model.
    return {
        'feature_names': ['text_sim', 'load'],
        'means': [0.5, 1.0],
        'stds': [0.5, 1.0],
        'coefficients': [2.0, -1.0],
        'intercept': 0.0,
    }


def test_score_with_model_matches_hand_computed_sigmoid():
    model = _toy_model()
    # z_text = (0.75 - 0.5) / 0.5 = 0.5 ; z_load = (0.0 - 1.0) / 1.0 = -1.0
    # logit = 0 + 2.0*0.5 + (-1.0)*(-1.0) = 2.0
    score, contributions, probability = features.score_details({'text_sim': 0.75, 'load': 0.0}, model)
    assert probability == pytest.approx(1 / (1 + math.exp(-2.0)))
    assert score == round(100 * probability)
    # Contributions must actually sum (plus intercept) to the logit.
    assert sum(c for _name, _z, c in contributions) + model['intercept'] == pytest.approx(2.0)
    assert features.score_with_model({'text_sim': 0.75, 'load': 0.0}, model) == (score, contributions)


def test_score_with_model_imputes_missing_feature_with_training_mean():
    score, contributions = features.score_with_model({'text_sim': 0.5}, _toy_model())
    assert next(c for name, _z, c in contributions if name == 'load') == pytest.approx(0.0)
    assert score == 50


def test_match_reasons_never_cite_absent_penalties_or_missing_history():
    # A blank new reviewer: not busy, no load, no history. Those push the
    # score up, but none of them is fit evidence to show as a reason.
    feats = {'text_sim': 0.0, 'keyword_fit': 0.0, 'tag_overlap': 0.0, 'load': 0.0,
             'acceptance_rate': 0.5, 'is_busy': 0.0, 'is_unavailable': 0.0}
    contributions = [('is_busy', -0.5, 0.04), ('acceptance_rate', 0.4, 0.2), ('load', -0.6, 0.01)]
    assert features.match_reasons(feats, contributions, responded_invitations=0) == []


def test_match_reasons_cite_real_fit_evidence_in_contribution_order():
    feats = {'text_sim': 0.6, 'keyword_fit': 0.4, 'tag_overlap': 0.7, 'load': 0.0,
             'acceptance_rate': 0.7, 'is_busy': 0.0, 'is_unavailable': 0.0}
    contributions = [
        ('tag_overlap', 2.0, 1.1), ('text_sim', 3.0, 1.5), ('is_busy', -0.5, 0.04),
        ('acceptance_rate', 1.2, 0.6), ('keyword_fit', 2.0, 0.3),
    ]
    assert features.match_reasons(feats, contributions, responded_invitations=4) == [
        'Overall topic fit', 'Specialty tag overlap', 'Track record of accepting invitations',
    ]


def test_match_reasons_skip_below_average_text_fit_and_negative_contributions():
    feats = {'text_sim': 0.01, 'keyword_fit': 0.0, 'tag_overlap': 0.5}
    contributions = [('text_sim', -0.3, 0.2), ('tag_overlap', 1.0, -0.1)]
    assert features.match_reasons(feats, contributions, responded_invitations=2) == []
