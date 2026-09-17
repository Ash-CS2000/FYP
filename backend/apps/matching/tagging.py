"""
Specialty-tag suggestion: a TF-IDF + logistic-regression text classifier
trained on text that already carries tags (tagged manuscripts, and tagged
reviewers' profiles and publications), with label matching as a fallback.

Why a classifier: comparing an abstract against the 2-4 words of a tag's
name only fires when the abstract happens to use those exact words -- on the
synthetic dataset it put a correct tag in the top 3 for about a quarter of
manuscripts, vs ~96% for the classifier (ml_service/reports/evaluation.md).
Learning which words
tagged papers actually use is still basic ML (one vectorizer, one linear
model per tag), needs no stored vectors, and refits in well under a second.

TagSuggester is pure (no Django) so ml_service/train_ranker.py can evaluate
it offline; suggest_tags() is the live entry point used by the
suggest-tags endpoint and caches a fitted suggester per process.
"""
import time

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

from . import features

MIN_EXAMPLES = 3            # a tag needs this many tagged texts to get a classifier
PROBABILITY_THRESHOLD = 0.6  # chosen on the offline evaluation (see reports/evaluation.md)
LABEL_MATCH_THRESHOLD = 0.1  # fallback: TF-IDF cosine against the tag's name
MAX_SUGGESTIONS = 3
REFRESH_SECONDS = 600


class TagSuggester:
    def __init__(self, tag_labels):
        """`tag_labels` is {slug: label} for the whole taxonomy."""
        self.tag_labels = dict(tag_labels)
        self.vectorizer = None
        self.models = {}

    def fit(self, texts, tag_lists):
        """`texts[i]` is labelled with the tags in `tag_lists[i]`."""
        pairs = [(t, set(tags) & set(self.tag_labels)) for t, tags in zip(texts, tag_lists) if t and t.strip()]
        self.vectorizer, self.models = None, {}
        if len(pairs) < MIN_EXAMPLES:
            return self
        self.vectorizer = TfidfVectorizer(stop_words='english', sublinear_tf=True)
        try:
            X = self.vectorizer.fit_transform([t for t, _ in pairs])
        except ValueError:  # empty vocabulary
            self.vectorizer = None
            return self
        for slug in sorted(self.tag_labels):
            y = [1 if slug in tags else 0 for _, tags in pairs]
            if MIN_EXAMPLES <= sum(y) < len(y):
                self.models[slug] = LogisticRegression(class_weight='balanced', max_iter=1000).fit(X, y)
        return self

    def suggest(self, text, limit=MAX_SUGGESTIONS):
        """[(slug, score)] best first. Classifier probabilities when any tag
        clears the threshold; otherwise label matching, so tags with no
        training examples yet can still be suggested."""
        if not text or not text.strip():
            return []
        if self.vectorizer is not None and self.models:
            x = self.vectorizer.transform([text])
            scored = sorted(
                ((slug, float(model.predict_proba(x)[0, 1])) for slug, model in self.models.items()),
                key=lambda pair: -pair[1],
            )
            confident = [(slug, p) for slug, p in scored if p >= PROBABILITY_THRESHOLD][:limit]
            if confident:
                return confident
        slugs = sorted(self.tag_labels)
        sims = features.tfidf_similarities(text, [self.tag_labels[s] for s in slugs])
        matched = sorted(zip(slugs, sims), key=lambda pair: -pair[1])
        return [(slug, s) for slug, s in matched if s >= LABEL_MATCH_THRESHOLD][:limit]


_cache = {'suggester': None, 'fitted_at': 0.0}


def _training_data():
    """Tagged text from the database. Reviewer profiles are used WITHOUT the
    tag labels text.profile_text() appends -- otherwise the classifier would
    just learn to read the tag names back."""
    from apps.manuscripts.models import Manuscript
    from apps.users.models import UserProfile

    from .models import ReviewerPublication
    from .text import manuscript_text, publication_text

    texts, tag_lists = [], []
    for m in Manuscript.objects.exclude(specialty_tags=[]).only('title', 'abstract', 'keywords', 'specialty_tags'):
        texts.append(manuscript_text(m))
        tag_lists.append(m.specialty_tags or [])

    profiles = {
        p.user_id: p
        for p in UserProfile.objects.exclude(specialty_tags=[]).only('user_id', 'expertise_areas', 'research_areas', 'specialty_tags')
    }
    for p in profiles.values():
        texts.append('. '.join(filter(None, [p.expertise_areas, p.research_areas])))
        tag_lists.append(p.specialty_tags or [])
    for pub in ReviewerPublication.objects.filter(reviewer_id__in=profiles).only('reviewer_id', 'title', 'abstract', 'keywords'):
        texts.append(publication_text(pub))
        tag_lists.append(profiles[pub.reviewer_id].specialty_tags or [])
    return texts, tag_lists


def suggest_tags(text):
    """Live suggestions: [(slug, score)]. Refits from the database at most
    every REFRESH_SECONDS per process."""
    from apps.users.taxonomy import SPECIALTY_TAG_LABELS

    now = time.monotonic()
    if _cache['suggester'] is None or now - _cache['fitted_at'] > REFRESH_SECONDS:
        texts, tag_lists = _training_data()
        _cache['suggester'] = TagSuggester(SPECIALTY_TAG_LABELS).fit(texts, tag_lists)
        _cache['fitted_at'] = now
    return _cache['suggester'].suggest(text)
