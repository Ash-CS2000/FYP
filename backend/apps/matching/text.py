"""
Text extraction for reviewer matching: turns a manuscript, a reviewer profile
and a publication into the plain strings apps/matching/features.py compares
with TF-IDF. Nothing is stored -- every string is rebuilt from the database
on each ranking request.
"""
from apps.users.taxonomy import SPECIALTY_TAG_LABELS


def split_keywords(text):
    """Manuscript.keywords / ReviewerPublication.keywords (and the profile's
    expertise/research areas) are comma-separated free text -- this is the
    one place that convention is parsed."""
    if not text:
        return []
    return [k.strip() for k in text.split(',') if k.strip()]


def manuscript_text(manuscript):
    parts = [manuscript.title or '', manuscript.abstract or '', manuscript.keywords or '']
    return '. '.join(p for p in parts if p)


def profile_text(profile):
    if profile is None:
        return ''
    tag_labels = [SPECIALTY_TAG_LABELS.get(t, t) for t in (profile.specialty_tags or [])]
    parts = [profile.expertise_areas or '', profile.research_areas or '', ', '.join(tag_labels)]
    return '. '.join(p for p in parts if p)


def publication_text(publication):
    parts = [publication.title or '', publication.abstract or '', publication.keywords or '']
    return '. '.join(p for p in parts if p)


def reviewer_text(profile, publications):
    """One TF-IDF document per reviewer: their profile plus every
    publication on file."""
    return '. '.join(filter(None, [profile_text(profile), *(publication_text(p) for p in publications)]))


def reviewer_keywords(profile, publications):
    """A reviewer's keyword set: their publications' keywords plus their
    profile's expertise/research areas, so someone who has only filled in a
    profile (every new reviewer -- there is no UI to add publications yet)
    still has keywords to match on."""
    keywords = []
    for pub in publications:
        keywords.extend(split_keywords(pub.keywords))
    if profile is not None:
        keywords.extend(split_keywords(profile.expertise_areas))
        keywords.extend(split_keywords(profile.research_areas))
    return keywords
