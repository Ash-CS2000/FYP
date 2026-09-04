"""
The shared specialty-tag vocabulary used to match manuscripts to reviewers.

A fixed list rather than a DB table — same lightweight-constants idiom as
Decision.Type/SCREENING_ACTIONS elsewhere in this codebase. Both
Manuscript.specialty_tags and UserProfile.specialty_tags store a list of
slugs from here, validated against SPECIALTY_TAG_SLUGS.
"""

SPECIALTY_TAGS = [
    {'slug': 'machine-learning', 'label': 'Machine Learning', 'group': 'Computer Science'},
    {'slug': 'deep-learning', 'label': 'Deep Learning', 'group': 'Computer Science'},
    {'slug': 'computer-vision', 'label': 'Computer Vision', 'group': 'Computer Science'},
    {'slug': 'nlp', 'label': 'Natural Language Processing', 'group': 'Computer Science'},
    {'slug': 'data-mining', 'label': 'Data Mining', 'group': 'Computer Science'},
    {'slug': 'software-engineering', 'label': 'Software Engineering', 'group': 'Computer Science'},
    {'slug': 'cybersecurity', 'label': 'Cybersecurity', 'group': 'Computer Science'},
    {'slug': 'hci', 'label': 'Human-Computer Interaction', 'group': 'Computer Science'},
    {'slug': 'databases', 'label': 'Databases', 'group': 'Computer Science'},
    {'slug': 'distributed-systems', 'label': 'Distributed Systems', 'group': 'Computer Science'},
    {'slug': 'medical-imaging', 'label': 'Medical Imaging', 'group': 'Medicine & Health'},
    {'slug': 'health-informatics', 'label': 'Health Informatics', 'group': 'Medicine & Health'},
    {'slug': 'clinical-trials', 'label': 'Clinical Trials', 'group': 'Medicine & Health'},
    {'slug': 'epidemiology', 'label': 'Epidemiology', 'group': 'Medicine & Health'},
    {'slug': 'biomedical-engineering', 'label': 'Biomedical Engineering', 'group': 'Medicine & Health'},
    {'slug': 'public-health', 'label': 'Public Health', 'group': 'Medicine & Health'},
    {'slug': 'electronics', 'label': 'Electronics', 'group': 'Engineering'},
    {'slug': 'renewable-energy', 'label': 'Renewable Energy', 'group': 'Engineering'},
    {'slug': 'robotics', 'label': 'Robotics', 'group': 'Engineering'},
    {'slug': 'signal-processing', 'label': 'Signal Processing', 'group': 'Engineering'},
    {'slug': 'materials-science', 'label': 'Materials Science', 'group': 'Engineering'},
    {'slug': 'civil-engineering', 'label': 'Civil Engineering', 'group': 'Engineering'},
    {'slug': 'quantum-computing', 'label': 'Quantum Computing', 'group': 'Physics'},
    {'slug': 'condensed-matter', 'label': 'Condensed Matter Physics', 'group': 'Physics'},
    {'slug': 'astrophysics', 'label': 'Astrophysics', 'group': 'Physics'},
    {'slug': 'optics', 'label': 'Optics', 'group': 'Physics'},
    {'slug': 'supply-chain', 'label': 'Supply Chain Management', 'group': 'Business & Economics'},
    {'slug': 'finance', 'label': 'Finance', 'group': 'Business & Economics'},
    {'slug': 'marketing', 'label': 'Marketing', 'group': 'Business & Economics'},
    {'slug': 'entrepreneurship', 'label': 'Entrepreneurship', 'group': 'Business & Economics'},
    {'slug': 'blockchain-business', 'label': 'Blockchain & Digital Assets', 'group': 'Business & Economics'},
    {'slug': 'computational-linguistics', 'label': 'Computational Linguistics', 'group': 'Linguistics & Social Science'},
    {'slug': 'sociolinguistics', 'label': 'Sociolinguistics', 'group': 'Linguistics & Social Science'},
    {'slug': 'psychology', 'label': 'Psychology', 'group': 'Linguistics & Social Science'},
    {'slug': 'education', 'label': 'Education Research', 'group': 'Linguistics & Social Science'},
    {'slug': 'statistics', 'label': 'Statistics', 'group': 'Mathematics & Statistics'},
    {'slug': 'applied-mathematics', 'label': 'Applied Mathematics', 'group': 'Mathematics & Statistics'},
    {'slug': 'optimization', 'label': 'Optimization', 'group': 'Mathematics & Statistics'},
    {'slug': 'climate-science', 'label': 'Climate Science', 'group': 'Environmental Science'},
    {'slug': 'sustainability', 'label': 'Sustainability', 'group': 'Environmental Science'},
    {'slug': 'agriculture', 'label': 'Agricultural Science', 'group': 'Environmental Science'},
]

SPECIALTY_TAG_SLUGS = {t['slug'] for t in SPECIALTY_TAGS}
SPECIALTY_TAG_LABELS = {t['slug']: t['label'] for t in SPECIALTY_TAGS}


def validate_specialty_tags(value):
    """Raise ValueError listing any slugs not in the taxonomy. Used by both
    UserProfile.specialty_tags and Manuscript.specialty_tags validators."""
    unknown = sorted(set(value) - SPECIALTY_TAG_SLUGS)
    if unknown:
        raise ValueError(f'Unknown specialty tag(s): {", ".join(unknown)}')
