#!/usr/bin/env python
"""
Sanity checks for data/generated/dataset.json:

1. No hidden ground truth leaks into text the matcher reads: no subtopic
   label and no old weight words ('primary research focus' etc.) in
   titles, abstracts, keywords, sub_category, expertise blurbs, research
   areas, or publications.
2. Manuscript titles are unique (export_matching_pairs maps rows by title).
3. If data/generated/dataset.prev.json exists (the version the live database
   was seeded from), everything differs from it ONLY in the fields
   repair_ml_dataset rewrites -- so the in-place repair keeps the database
   consistent with the new dataset.

Exits non-zero on any failure.
"""
import json
import sys
from pathlib import Path

from corpus import SUBTOPICS

DATA = Path(__file__).parent / 'data' / 'generated'

REPAIRABLE_REVIEWER_KEYS = {'expertise_areas', 'research_areas', 'specialty_tags', 'true_specialty_tags'}
REPAIRABLE_MANUSCRIPT_KEYS = {'title', 'abstract', 'sub_category', 'specialty_tags', 'true_specialty_tags', 'assignments'}
LEAK_PHRASES = ('primary research focus', 'active interest', 'occasional collaboration')


def check_no_leaks(dataset):
    labels = [s['label'].lower() for s in SUBTOPICS]
    problems = []

    def scan(where, text):
        low = (text or '').lower()
        for label in labels:
            if label in low:
                problems.append(f'{where}: contains subtopic label {label!r}')
        for phrase in LEAK_PHRASES:
            if phrase in low:
                problems.append(f'{where}: contains weight phrase {phrase!r}')

    for i, m in enumerate(dataset['manuscripts']):
        for key in ('title', 'abstract', 'keywords', 'sub_category'):
            scan(f'manuscript {i} {key}', m.get(key))
        for a in m.get('assignments', []):
            if 'review' in a:
                scan(f'manuscript {i} review summary', a['review']['summary'])
    for i, r in enumerate(dataset['reviewers']):
        for key in ('expertise_areas', 'research_areas'):
            scan(f'reviewer {i} {key}', r.get(key))
        for j, p in enumerate(r['publications']):
            for key in ('title', 'abstract', 'keywords'):
                scan(f'reviewer {i} publication {j} {key}', p.get(key))
    return problems


def check_unique_titles(dataset):
    titles = [m['title'] for m in dataset['manuscripts']]
    dupes = sorted({t for t in titles if titles.count(t) > 1})
    return [f'duplicate title: {t!r}' for t in dupes]


def _strip_summaries(assignments):
    out = []
    for a in assignments:
        a = dict(a)
        if 'review' in a:
            a['review'] = {k: v for k, v in a['review'].items() if k != 'summary'}
        out.append(a)
    return out


def check_against_previous(prev, new):
    problems = []
    for key in ('seed', 'authors', 'editors'):
        if prev.get(key) != new.get(key):
            problems.append(f'{key} changed')
    for i, (a, b) in enumerate(zip(prev['reviewers'], new['reviewers'])):
        for key in set(a) | set(b):
            if key not in REPAIRABLE_REVIEWER_KEYS and a.get(key) != b.get(key):
                problems.append(f'reviewer {i}: unexpected change in {key}')
    for i, (a, b) in enumerate(zip(prev['manuscripts'], new['manuscripts'])):
        for key in set(a) | set(b):
            if key not in REPAIRABLE_MANUSCRIPT_KEYS and a.get(key) != b.get(key):
                problems.append(f'manuscript {i}: unexpected change in {key}')
        if _strip_summaries(a['assignments']) != _strip_summaries(b['assignments']):
            problems.append(f'manuscript {i}: assignments changed beyond review summaries')
    if len(prev['reviewers']) != len(new['reviewers']) or len(prev['manuscripts']) != len(new['manuscripts']):
        problems.append('row counts changed')
    return problems


def main():
    dataset = json.load(open(DATA / 'dataset.json', encoding='utf-8'))
    problems = check_no_leaks(dataset) + check_unique_titles(dataset)
    prev_path = DATA / 'dataset.prev.json'
    if prev_path.exists():
        problems += check_against_previous(json.load(open(prev_path, encoding='utf-8')), dataset)
    if problems:
        print(f'{len(problems)} problem(s):')
        for p in problems[:50]:
            print(' -', p)
        sys.exit(1)
    print('dataset OK: no label leakage, unique titles'
          + (', differs from dataset.prev.json only in repairable fields' if prev_path.exists() else ''))


if __name__ == '__main__':
    main()
