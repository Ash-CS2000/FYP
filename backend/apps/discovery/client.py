"""
Thin client for the OpenAlex REST API — the source behind Discover Topics.

Follows the same shape as apps/manuscripts/services/noplag_client.py: module
level functions, one exception type, an explicit timeout on every call, and a
status check that raises rather than returning junk to a serializer.

This module has no models and touches no table. Everything it returns is
external metadata about work published elsewhere.

Docs: https://docs.openalex.org
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

API_ROOT = 'https://api.openalex.org'

# OpenAlex asks API users to identify themselves, and rewards it: requests
# carrying a contact address are served from the faster, more generous "polite
# pool". This is a contact address for the deployment, not a personal one, and
# it is a setting so it can differ per environment.
POLITE_MAILTO = getattr(settings, 'OPENALEX_MAILTO', '') or 'paperbridge@example.org'
USER_AGENT = f'PaperBridge/1.0 (mailto:{POLITE_MAILTO})'

TIMEOUT = 15


class OpenAlexError(Exception):
    """OpenAlex was unreachable or answered with something unusable."""


def _get(path, params=None):
    params = dict(params or {})
    params['mailto'] = POLITE_MAILTO

    try:
        response = requests.get(
            f'{API_ROOT}/{path.lstrip("/")}',
            params=params,
            headers={'User-Agent': USER_AGENT, 'Accept': 'application/json'},
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        raise OpenAlexError(f'Could not reach OpenAlex: {exc}') from exc

    if response.status_code != 200:
        raise OpenAlexError(
            f'OpenAlex returned {response.status_code}: {response.text[:300]}'
        )

    try:
        return response.json()
    except ValueError as exc:
        raise OpenAlexError('OpenAlex returned a non-JSON body.') from exc


def short_id(value):
    """'https://openalex.org/T11714' → 'T11714'; 'fields/17' → '17'.

    OpenAlex identifies everything by full URL. Those are unusable in our own
    routes — they carry a scheme and slashes — so ids are narrowed to their last
    segment on the way out and never widened again on the way back in.
    """
    if not value:
        return ''
    return str(value).rstrip('/').rsplit('/', 1)[-1]


def reconstruct_abstract(inverted_index):
    """Rebuild readable text from OpenAlex's ``abstract_inverted_index``.

    OpenAlex does not ship abstracts as text. It ships a word → [positions] map:

        {"We": [0, 119], "propose": [1], "a": [2, 11, 45, ...], ...}

    Widely believed to be a copyright hedge — the index is a fact about the
    abstract rather than a copy of it. Whatever the reason, every consumer has to
    invert it back, and it catches people out because the field *looks* like it
    should hold a string.

    Returns '' when there is no index, which is common: plenty of records carry
    no abstract at all.
    """
    if not isinstance(inverted_index, dict) or not inverted_index:
        return ''

    positions = []
    for word, indexes in inverted_index.items():
        if not isinstance(indexes, list):
            continue
        positions.extend((i, word) for i in indexes)

    if not positions:
        return ''

    positions.sort(key=lambda pair: pair[0])
    return ' '.join(word for _, word in positions).strip()


# ── Fields ───────────────────────────────────────────────────────────────────

def list_fields():
    """The top-level research fields, A–Z. 26 of them today.

    Fetched rather than hardcoded, for the reason data/topics.js already records
    about our own categories: a vocabulary written into source is wrong the day
    upstream revises it, and OpenAlex has revised this classification before.
    `per_page=200` is a deliberate over-fetch so a change in their count does not
    silently truncate the list.
    """
    payload = _get('fields', {'per-page': 200})
    fields = [
        {
            'id': short_id(row.get('id')),
            'name': row.get('display_name') or '',
            'domain': (row.get('domain') or {}).get('display_name') or '',
            'description': row.get('description') or '',
            'works_count': row.get('works_count') or 0,
        }
        for row in payload.get('results', [])
    ]
    fields.sort(key=lambda f: f['name'].lower())
    return fields


# ── Topics ───────────────────────────────────────────────────────────────────

def list_field_topics(field_id, limit=40):
    """Topics inside one field, most-cited first.

    Ordered by citations rather than volume, for two reasons.

    The honest one: it is the better answer to the question this page exists to
    answer. Someone deciding what to write about wants the conversations that
    are being built on, not the ones with the most rows.

    The practical one: OpenAlex's automated classification has occasional
    misfires, and sorting by works_count surfaces them first. Their topic
    "Geochemistry and Geologic Mapping" (T12157) is genuinely tagged
    field.id:17, Computer Science, subfield Artificial Intelligence — 3.5M works,
    nine times the next entry. Sorted by volume it leads the Computer Science
    page with papers about rock-forming minerals. Sorted by citations it falls
    away on its own, and the top of the list is Neural Networks, NLP, Quantum
    Information — all plainly Computer Science.

    That is a side effect, not a filter: nothing is hidden, and a curated
    denylist would mean taking editorial responsibility for someone else's
    taxonomy. works_count is still returned, because it is a useful signal next
    to a topic even when it is the wrong thing to sort on.
    """
    payload = _get('topics', {
        'filter': f'field.id:{short_id(field_id)}',
        'sort': 'cited_by_count:desc',
        'per-page': max(1, min(int(limit or 40), 200)),
    })
    return [
        {
            'id': short_id(row.get('id')),
            'name': row.get('display_name') or '',
            'description': row.get('description') or '',
            'subfield': (row.get('subfield') or {}).get('display_name') or '',
            'keywords': [k for k in (row.get('keywords') or []) if k][:8],
            'works_count': row.get('works_count') or 0,
            'cited_by_count': row.get('cited_by_count') or 0,
        }
        for row in payload.get('results', [])
    ]


# ── Works ────────────────────────────────────────────────────────────────────

SORTS = {
    'cited': 'cited_by_count:desc',
    'recent': 'publication_date:desc',
}

# Asking for only the fields we render keeps the response an order of magnitude
# smaller — a full OpenAlex work carries citation graphs and per-year counts we
# have no use for.
WORK_FIELDS = ','.join([
    'id', 'display_name', 'doi', 'publication_year', 'cited_by_count',
    'abstract_inverted_index', 'authorships', 'primary_location', 'open_access',
])


def _work(row):
    authorships = row.get('authorships') or []

    authors, institutions = [], []
    for a in authorships:
        name = (a.get('author') or {}).get('display_name')
        if name:
            authors.append(name)
        for inst in (a.get('institutions') or []):
            label = inst.get('display_name')
            # Order-preserving de-duplication: the same institution usually
            # appears on several of a paper's authors.
            if label and label not in institutions:
                institutions.append(label)

    source = (row.get('primary_location') or {}).get('source') or {}

    return {
        'id': short_id(row.get('id')),
        'title': row.get('display_name') or 'Untitled',
        'abstract': reconstruct_abstract(row.get('abstract_inverted_index')),
        # The only link the UI may offer for an external work. Absent on plenty
        # of records, so the caller must handle ''.
        'doi': row.get('doi') or '',
        'year': row.get('publication_year'),
        'authors': authors[:12],
        'institutions': institutions[:6],
        'venue': source.get('display_name') or '',
        'cited_by_count': row.get('cited_by_count') or 0,
        'is_open_access': bool((row.get('open_access') or {}).get('is_oa')),
    }


def list_topic_works(topic_id, sort='cited', limit=25):
    payload = _get('works', {
        'filter': f'primary_topic.id:{short_id(topic_id)}',
        'sort': SORTS.get(sort, SORTS['cited']),
        'per-page': max(1, min(int(limit or 25), 100)),
        'select': WORK_FIELDS,
    })
    return [_work(row) for row in payload.get('results', [])]


def search_works(q, field_id='', sort='cited', limit=25):
    """Full-text-ish search over titles and abstracts, optionally within a field.

    Server-side by necessity: matchesQuery() in data/topics.js filters the whole
    corpus in memory, which is right for 22 rows and impossible for ~250 million.
    """
    params = {
        'search': q,
        'sort': SORTS.get(sort, SORTS['cited']),
        'per-page': max(1, min(int(limit or 25), 100)),
        'select': WORK_FIELDS,
    }
    if field_id:
        params['filter'] = f'primary_topic.field.id:{short_id(field_id)}'

    payload = _get('works', params)
    return [_work(row) for row in payload.get('results', [])]
