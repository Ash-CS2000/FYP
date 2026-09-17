"""
Pure unit tests for apps/matching/tagging.py's TagSuggester -- no database.
"""
from apps.matching.tagging import TagSuggester

LABELS = {
    'hydrology': 'Hydrology',
    'nlp': 'Natural Language Processing',
    'finance': 'Finance',
}


def _corpus():
    texts, tags = [], []
    for i in range(4):
        texts.append(f'watershed runoff model for river basin flood forecasting study {i}')
        tags.append(['hydrology'])
        texts.append(f'machine translation of low resource languages with transformers study {i}')
        tags.append(['nlp'])
    return texts, tags


def test_classifier_suggests_the_tag_whose_papers_use_the_same_words():
    suggester = TagSuggester(LABELS).fit(*_corpus())
    slugs = [slug for slug, _ in suggester.suggest('a new runoff model for flood forecasting in a river basin')]
    assert slugs and slugs[0] == 'hydrology'
    assert 'nlp' not in slugs


def test_tags_without_enough_examples_get_no_classifier_but_can_still_match_by_label():
    suggester = TagSuggester(LABELS).fit(*_corpus())
    assert 'finance' not in suggester.models
    slugs = [slug for slug, _ in suggester.suggest('Finance: corporate finance and bank lending decisions')]
    assert 'finance' in slugs


def test_unfitted_suggester_falls_back_to_label_matching_and_empty_text_is_safe():
    suggester = TagSuggester(LABELS).fit([], [])
    assert suggester.vectorizer is None
    assert [s for s, _ in suggester.suggest('natural language processing for chatbots')] == ['nlp']
    assert suggester.suggest('') == []
    assert suggester.suggest('the of and') == []


def test_unknown_tag_slugs_in_training_data_are_ignored():
    texts, tags = _corpus()
    tags = [t + ['not-a-real-tag'] for t in tags]
    suggester = TagSuggester(LABELS).fit(texts, tags)
    assert set(suggester.models) <= set(LABELS)
