#!/usr/bin/env python
"""
Builds the synthetic reviewer-matching dataset: authors, reviewers, editors,
manuscripts, and a simulated invitation/review history, plus the hidden
ground-truth relevance/success labels used to train and evaluate the ranker.

Deterministic (SEED below) -- rerunning produces byte-identical output.
Nothing here touches Django or the database; it only writes two files:

    data/generated/dataset.json    -- everything seed_ml_dataset needs to
                                       create the Django rows and Supabase
                                       Storage PDFs
    data/generated/ground_truth.csv -- one row per (manuscript, reviewer)
                                       pair: the hidden relevance grade and
                                       a simulated success label, used only
                                       by export_matching_pairs/train_ranker
                                       to grade the ranker -- never fed into
                                       any matched text.

See ml_service/README.md for the full pipeline and corpus.py's docstring
for why this content is programmatically assembled rather than individually
hand-written.
"""
import csv
import json
import random
from pathlib import Path

from corpus import FAMILY_NAMES, GIVEN_NAMES, INSTITUTIONS, SUBTOPIC_BY_ID, SUBTOPICS, TITLE_TEMPLATES

SEED = 40006
N_AUTHORS = 200
N_REVIEWERS = 60
N_EDITORS = 3
N_MANUSCRIPTS = 120
COAUTHOR_REVIEWER_COUNT = 8

STATUS_MIX = [
    ('submitted', 30),
    ('under_review', 20),
    ('revisions_requested', 15),
    ('accepted', 20),
    ('rejected', 20),
    ('published', 15),
]

OUT_DIR = Path(__file__).parent / 'data' / 'generated'


# ---------------------------------------------------------------------------
# People
# ---------------------------------------------------------------------------

def make_person(rng, used_emails, domain='demo-paperbridge.test'):
    while True:
        given = rng.choice(GIVEN_NAMES)
        family = rng.choice(FAMILY_NAMES)
        slug = f"{given}.{family}".lower().replace(' ', '.').replace("'", '')
        email = f'{slug}@{domain}'
        if email not in used_emails:
            used_emails.add(email)
            return {'given_name': given, 'family_name': family, 'email': email}


def attach_institution(rng, person):
    inst, city, country = rng.choice(INSTITUTIONS)
    person['institution'] = inst
    person['city'] = city
    person['country'] = country
    return person


# ---------------------------------------------------------------------------
# Text generation from a subtopic's vocab bank
# ---------------------------------------------------------------------------

def _cap(s):
    return s[0].upper() + s[1:] if s else s


def _lower_first(s):
    return s[0].lower() + s[1:] if s else s


def make_title(rng, subtopics):
    primary = subtopics[0]
    vocab = primary['vocab']
    application = rng.choice(vocab['applications'])
    method = rng.choice(vocab['methods'])
    template = rng.choice(TITLE_TEMPLATES)
    method_bare = method.split(' ', 1)[1] if method.lower().startswith(('a ', 'an ')) else method
    return template.format(
        Method=_cap(method), method_bare=method_bare,
        application=application, application_bare=_cap(application),
    )


def make_abstract(rng, subtopics):
    """Two to three subtopics can be blended (interdisciplinary manuscripts);
    each contributes one sentence so the abstract genuinely reads as
    spanning multiple fields rather than picking one and ignoring the rest."""
    sentences = []
    for i, sub in enumerate(subtopics):
        vocab = sub['vocab']
        gap = rng.choice(vocab['gaps'])
        method = rng.choice(vocab['methods'])
        application = rng.choice(vocab['applications'])
        finding = rng.choice(vocab['findings'])
        if i == 0:
            sentences.append(f'In {application}, {gap}.')
            sentences.append(f'This work proposes {method} to address the problem.')
        else:
            # Uses the vocab phrase already drawn above, never the subtopic's
            # label -- labels are the hidden answer key (see corpus.py).
            sentences.append(f'The approach also draws on work in {application}, since {gap}.')
        sentences.append(f'Across the evaluation, {finding}.')
    sentences.append('These results are discussed alongside their practical and methodological implications.')
    return ' '.join(sentences)


def make_keywords(rng, subtopics, n=5):
    pool = []
    for sub in subtopics:
        pool.extend(sub['keywords'])
    rng.shuffle(pool)
    seen = []
    for k in pool:
        if k not in seen:
            seen.append(k)
        if len(seen) >= n:
            break
    return seen


def make_expertise_blurb(text_rng, subtopics, weights):
    """A reviewer's self-description, written only from vocab phrases -- no
    subtopic labels and no weight words ('primary focus' etc.), both of which
    would leak the hidden ground truth into text the matcher reads. Stronger
    interests get a little more text, like a real blurb would."""
    parts = []
    ordered = sorted(subtopics, key=lambda s: -weights.get(s['id'], 0))
    for sub in ordered:
        vocab = sub['vocab']
        application = text_rng.choice(vocab['applications'])
        if weights.get(sub['id'], 0) >= 0.5:
            parts.append(f'{application} using {text_rng.choice(vocab["methods"])}')
        else:
            parts.append(application)
    return 'Research on ' + '; '.join(parts) + '.'


def make_research_areas(text_rng, subtopics):
    """Comma-separated keyword phrases (the convention text.split_keywords
    parses), drawn from each subtopic's keyword bank."""
    areas = []
    for sub in subtopics:
        for keyword in text_rng.sample(sub['keywords'], k=min(2, len(sub['keywords']))):
            if keyword not in areas:
                areas.append(keyword)
    return ', '.join(areas)


def make_publication(rng, subtopic, year):
    vocab = subtopic['vocab']
    application = rng.choice(vocab['applications'])
    method = rng.choice(vocab['methods'])
    finding = rng.choice(vocab['findings'])
    title = f'{_cap(method)} for {application}'
    abstract = f'We study {application}. We introduce {method}. Across experiments, {finding}.'
    return {
        'title': title,
        'abstract': abstract,
        'year': year,
        'venue': f'Journal of {subtopic["group"]}',
        'keywords': ', '.join(rng.sample(subtopic['keywords'], k=min(3, len(subtopic['keywords'])))),
    }


# ---------------------------------------------------------------------------
# Relevance and outcome model (the hidden ground truth)
# ---------------------------------------------------------------------------

def relevance_for(manuscript_subtopic_ids, reviewer_weights):
    best = 0
    for ms_id in manuscript_subtopic_ids:
        ms = SUBTOPIC_BY_ID[ms_id]
        for rs_id, weight in reviewer_weights.items():
            rs = SUBTOPIC_BY_ID[rs_id]
            if ms_id == rs_id:
                candidate = 3 if weight >= 0.4 else 2
            elif ms['tag'] == rs['tag']:
                candidate = 2 if weight >= 0.3 else 1
            elif ms['group'] == rs['group']:
                candidate = 1
            else:
                candidate = 0
            best = max(best, candidate)
    return best


def success_probability(relevance, reviewer, load_bucket):
    avail_penalty = {'available': 0.0, 'busy': 0.15, 'unavailable': 0.35}[reviewer['availability_status']]
    accept = 0.30 + 0.16 * relevance - 0.05 * load_bucket - avail_penalty + reviewer['acceptance_bias']
    accept = min(max(accept, 0.02), 0.95)
    on_time = 0.45 + 0.12 * relevance + 0.30 * reviewer['reliability'] - 0.04 * load_bucket
    on_time = min(max(on_time, 0.05), 0.97)
    quality = 0.25 + 0.20 * relevance + 0.25 * reviewer['reliability']
    quality = min(max(quality, 0.05), 0.95)
    return accept * on_time * quality, accept


# ---------------------------------------------------------------------------
# Main generation
# ---------------------------------------------------------------------------

def build_authors(rng, used_emails):
    authors = []
    for _ in range(N_AUTHORS):
        p = attach_institution(rng, make_person(rng, used_emails))
        authors.append(p)
    return authors


def build_editors(rng, used_emails):
    editors = []
    for _ in range(N_EDITORS):
        p = attach_institution(rng, make_person(rng, used_emails))
        editors.append(p)
    return editors


def build_reviewers(rng, text_rng, used_emails):
    reviewers = []
    subtopic_ids = [s['id'] for s in SUBTOPICS]

    for i in range(N_REVIEWERS):
        p = attach_institution(rng, make_person(rng, used_emails))
        p['seniority'] = rng.choice(['early-career', 'mid-career', 'senior'])
        p['reliability'] = round(rng.uniform(0.3, 0.95), 2)
        p['acceptance_bias'] = round(rng.uniform(-0.15, 0.15), 2)

        # Hard cases, deliberately placed at fixed indices so seed_ml_dataset
        # and the docs can point at them by name.
        if i == 0:
            # Over-broad: many tags, all shallow -- a good ablation case for
            # whether tag_overlap alone would over-rate this reviewer.
            chosen = rng.sample(subtopic_ids, k=10)
            weights = {sid: round(rng.uniform(0.05, 0.15), 2) for sid in chosen}
            p['specialty_tags_override'] = sorted({SUBTOPIC_BY_ID[s]['tag'] for s in chosen})
            p['availability_status'] = 'available'
        elif i in (1, 2):
            # Untagged but genuinely strong -- publications carry the signal,
            # specialty_tags stays empty on purpose.
            home = rng.choice(subtopic_ids)
            weights = {home: 0.9}
            p['specialty_tags_override'] = []
            p['availability_status'] = 'available'
        elif i in (3, 4):
            # Strong match who is unavailable -- should rank low despite
            # excellent semantic fit.
            home = rng.choice(subtopic_ids)
            weights = {home: 0.9}
            p['specialty_tags_override'] = None
            p['availability_status'] = 'unavailable'
        else:
            n_home = rng.choice([1, 1, 2])
            homes = rng.sample(subtopic_ids, k=n_home)
            weights = {h: round(rng.uniform(0.5, 0.95), 2) for h in homes}
            if rng.random() < 0.35:
                secondary = rng.choice([s for s in subtopic_ids if s not in homes])
                weights[secondary] = round(rng.uniform(0.15, 0.3), 2)
            p['specialty_tags_override'] = None
            p['availability_status'] = rng.choices(
                ['available', 'available', 'available', 'busy', 'unavailable'],
                k=1,
            )[0]

        p['subtopic_weights'] = weights
        if p['specialty_tags_override'] is None:
            p['specialty_tags'] = sorted({SUBTOPIC_BY_ID[s]['tag'] for s in weights})
        else:
            p['specialty_tags'] = p['specialty_tags_override']

        subtopics = [SUBTOPIC_BY_ID[s] for s in weights]
        p['expertise_areas'] = make_expertise_blurb(text_rng, subtopics, weights)
        p['research_areas'] = make_research_areas(text_rng, subtopics)
        n_pubs = rng.randint(3, 8)
        pubs = []
        for _ in range(n_pubs):
            home_id = rng.choices(list(weights.keys()), weights=list(weights.values()), k=1)[0]
            year = rng.randint(2019, 2026)
            pubs.append(make_publication(rng, SUBTOPIC_BY_ID[home_id], year))
        p['publications'] = sorted(pubs, key=lambda x: -x['year'])
        p['is_coauthor'] = False
        reviewers.append(p)

    for idx in rng.sample(range(5, N_REVIEWERS), k=COAUTHOR_REVIEWER_COUNT):
        reviewers[idx]['is_coauthor'] = True

    return reviewers


def pick_manuscript_subtopics(rng, index):
    # ~15% interdisciplinary: two subtopics from different tags/groups.
    if rng.random() < 0.15:
        a, b = rng.sample(SUBTOPICS, k=2)
        return [a, b]
    return [rng.choice(SUBTOPICS)]


def build_manuscripts(rng, statuses):
    manuscripts = []
    for i in range(N_MANUSCRIPTS):
        subtopics = pick_manuscript_subtopics(rng, i)
        title = make_title(rng, subtopics)
        abstract = make_abstract(rng, subtopics)
        keywords = make_keywords(rng, subtopics)
        # ~8% left untagged, to keep exercising the cold-start / tag-fallback
        # path even with text features doing most of the work now.
        tags = [] if rng.random() < 0.08 else sorted({s['tag'] for s in subtopics})
        manuscripts.append({
            'title': title,
            'abstract': abstract,
            'keywords': ', '.join(keywords),
            'category': subtopics[0]['group'],
            # Left blank: the subtopic label here was the hidden answer key.
            'sub_category': '',
            'article_type': rng.choices(['Research Article', 'Review Article', 'Case Study'], weights=[80, 12, 8])[0],
            'specialty_tags': tags,
            'subtopic_ids': [s['id'] for s in subtopics],
            'status': statuses[i],
        })
    return manuscripts


def assign_authors(rng, manuscripts, authors):
    author_pool = list(range(len(authors)))
    for m in manuscripts:
        n = rng.choices([1, 2, 3, 4], weights=[25, 35, 25, 15])[0]
        idxs = rng.sample(author_pool, k=n)
        m['author_indices'] = idxs
        m['owner_index'] = idxs[0]
        m['corresponding_index'] = idxs[0]
    return manuscripts


def inject_coauthor_reviewers(rng, manuscripts, reviewers):
    """Adds each coauthor-flagged reviewer as an extra byline on one
    manuscript they are NOT already reviewing, so the authorship guard has
    real (manuscript, reviewer) hard-conflict pairs to protect against."""
    coauthor_idxs = [i for i, r in enumerate(reviewers) if r['is_coauthor']]
    candidate_manuscripts = [i for i, m in enumerate(manuscripts) if m['status'] != 'submitted']
    chosen_manuscripts = rng.sample(candidate_manuscripts, k=len(coauthor_idxs))
    for reviewer_idx, manuscript_idx in zip(coauthor_idxs, chosen_manuscripts):
        manuscripts[manuscript_idx].setdefault('reviewer_coauthor_indices', []).append(reviewer_idx)
    return manuscripts


def inject_editor_coauthor(rng, manuscripts, editors):
    """One editor co-authors a submitted manuscript, to demonstrate the
    editor-side authorship guard (they must not be able to screen/decide on
    their own submission)."""
    submitted = [i for i, m in enumerate(manuscripts) if m['status'] == 'submitted']
    target = rng.choice(submitted)
    manuscripts[target]['editor_coauthor_index'] = 0
    return manuscripts


def simulate_history(rng, manuscripts, reviewers):
    """Populates manuscripts with a `assignments` list for every
    non-'submitted' manuscript. Each assignment records enough to build a
    ReviewAssignment (+ Review, for completed ones) in seed_ml_dataset."""
    times_invited = [0] * len(reviewers)

    for m in manuscripts:
        if m['status'] == 'submitted':
            m['assignments'] = []
            continue

        excluded = set(m.get('reviewer_coauthor_indices', []))
        n_invite = rng.randint(3, 5)

        weights = []
        for i, r in enumerate(reviewers):
            if i in excluded:
                weights.append(0.0)
                continue
            rel = relevance_for(m['subtopic_ids'], r['subtopic_weights'])
            # Mostly favour relevant reviewers, but keep real noise so the
            # simulated "editor policy" isn't a giveaway of the ground truth.
            weights.append(0.15 + rel + rng.uniform(0, 0.5))
        total = sum(weights)
        if total <= 0:
            m['assignments'] = []
            continue
        probs = [w / total for w in weights]
        chosen = set()
        pool = list(range(len(reviewers)))
        while len(chosen) < min(n_invite, len(pool) - len(excluded)):
            pick = rng.choices(pool, weights=probs, k=1)[0]
            if pick not in excluded:
                chosen.add(pick)

        assignments = []
        for reviewer_idx in chosen:
            reviewer = reviewers[reviewer_idx]
            rel = relevance_for(m['subtopic_ids'], reviewer['subtopic_weights'])
            load_bucket = min(times_invited[reviewer_idx] // 5, 3)
            _, accept_p = success_probability(rel, reviewer, load_bucket)
            times_invited[reviewer_idx] += 1

            accepted = rng.random() < accept_p
            entry = {
                'reviewer_index': reviewer_idx,
                'relevance': rel,
                'due_days': rng.choice([14, 21, 21, 28]),
                'invited_hours_ago': rng.randint(200, 2400),
            }
            if not accepted:
                entry['status'] = 'declined'
                entry['decline_reason'] = rng.choices(
                    ['expertise', 'unavailable', 'conflict', 'other'],
                    weights=[40, 35, 10, 15],
                )[0]
                assignments.append(entry)
                continue

            on_time_p = min(max(0.45 + 0.12 * rel + 0.30 * reviewer['reliability'] - 0.04 * load_bucket, 0.05), 0.97)
            on_time = rng.random() < on_time_p
            quality_p = min(max(0.25 + 0.20 * rel + 0.25 * reviewer['reliability'], 0.05), 0.95)
            good = rng.random() < quality_p

            should_be_submitted = m['status'] != 'under_review' or rng.random() < 0.4
            if not should_be_submitted:
                entry['status'] = 'accepted'
                assignments.append(entry)
                continue

            entry['status'] = 'submitted'
            entry['on_time'] = on_time
            score_base = 3 if good else 2
            entry['review'] = {
                'originality': min(5, max(1, score_base + rng.choice([-1, 0, 0, 1]))),
                'technical': min(5, max(1, score_base + rng.choice([-1, 0, 0, 1]))),
                'clarity': min(5, max(1, score_base + rng.choice([-1, 0, 1]))),
                'relevance': min(5, max(1, score_base + rel // 2 + rng.choice([-1, 0, 1]))),
                'recommendation': rng.choices(
                    ['accept', 'minor', 'major', 'reject'],
                    weights=[35, 30, 20, 15] if good else [10, 25, 35, 30],
                )[0],
                'summary': f'This manuscript studies {_lower_first(m["title"])}.',
                'strengths': 'The methodology is clearly described and the evaluation is reasonably thorough.'
                             if good else 'The topic is relevant and the writing is clear.',
                'weaknesses': 'Minor clarifications would strengthen the discussion of limitations.'
                              if good else 'The evaluation would benefit from additional baselines and a larger sample.',
            }
            assignments.append(entry)

        m['assignments'] = assignments

    return manuscripts


def build_ground_truth(rng, manuscripts, reviewers):
    """Success label for every (manuscript, reviewer) pair. Uses the same
    workload the live `load` feature sees for that pair: the reviewer's
    accepted-but-not-yet-submitted assignments on OTHER manuscripts
    (ranking.compute_candidate_features excludes the manuscript being ranked)."""
    active = {}
    for mi, m in enumerate(manuscripts):
        for a in m['assignments']:
            if a['status'] == 'accepted':
                active.setdefault(a['reviewer_index'], set()).add(mi)

    rows = []
    for mi, m in enumerate(manuscripts):
        for ri, r in enumerate(reviewers):
            rel = relevance_for(m['subtopic_ids'], r['subtopic_weights'])
            load_bucket = min(len(active.get(ri, set()) - {mi}), 3)
            prob, _ = success_probability(rel, r, load_bucket=load_bucket)
            success = 1 if rng.random() < prob else 0
            rows.append((mi, ri, rel, round(prob, 4), success))
    return rows


def make_titles_unique(manuscripts):
    """Titles are how export_matching_pairs maps database rows back to
    generator indices, so they must be unique. Deterministic (no rng), so
    it doesn't shift the random sequence for anything generated after it."""
    seen = {}
    for m in manuscripts:
        base = m['title']
        if base in seen:
            seen[base] += 1
            m['title'] = f'{base}: follow-up study {seen[base]}'
        else:
            seen[base] = 1
    titles = [m['title'] for m in manuscripts]
    assert len(titles) == len(set(titles)), 'duplicate manuscript titles'
    return manuscripts


# Tag noise: real people pick tags imperfectly. Without this, specialty tags
# were copied straight from the hidden subtopics and tag_overlap was almost
# the answer key. Applied after everything else with its own rng so the rest
# of the dataset is unchanged. Hard-case reviewers 0-4 keep their deliberate
# tag setups.
REVIEWER_DROP_TAG = 0.20
REVIEWER_ADD_WRONG_TAG = 0.10
MANUSCRIPT_REPLACE_TAG = 0.15
MANUSCRIPT_ADD_WRONG_TAG = 0.10


def apply_tag_noise(noise_rng, manuscripts, reviewers):
    all_tags = sorted({s['tag'] for s in SUBTOPICS})

    def wrong_tag(current):
        return noise_rng.choice([t for t in all_tags if t not in current])

    for i, r in enumerate(reviewers):
        r['true_specialty_tags'] = list(r['specialty_tags'])
        if i < 5:
            continue
        tags = list(r['specialty_tags'])
        if tags and noise_rng.random() < REVIEWER_DROP_TAG:
            tags.remove(noise_rng.choice(tags))
        if noise_rng.random() < REVIEWER_ADD_WRONG_TAG:
            tags.append(wrong_tag(tags))
        r['specialty_tags'] = sorted(tags)

    for m in manuscripts:
        m['true_specialty_tags'] = list(m['specialty_tags'])
        tags = list(m['specialty_tags'])
        if not tags:
            continue
        if noise_rng.random() < MANUSCRIPT_REPLACE_TAG:
            tags.remove(noise_rng.choice(tags))
            tags.append(wrong_tag(tags))
        if noise_rng.random() < MANUSCRIPT_ADD_WRONG_TAG:
            tags.append(wrong_tag(tags))
        m['specialty_tags'] = sorted(tags)


def main():
    # `rng` drives everything structural and must keep its draw order stable
    # (seeded data in the live database was generated from it). Text-only
    # details and tag noise use their own generators.
    rng = random.Random(SEED)
    text_rng = random.Random(SEED + 1)
    noise_rng = random.Random(SEED + 2)
    used_emails = set()

    authors = build_authors(rng, used_emails)
    editors = build_editors(rng, used_emails)
    reviewers = build_reviewers(rng, text_rng, used_emails)

    statuses = []
    for status, count in STATUS_MIX:
        statuses.extend([status] * count)
    rng.shuffle(statuses)

    manuscripts = make_titles_unique(build_manuscripts(rng, statuses))
    manuscripts = assign_authors(rng, manuscripts, authors)
    manuscripts = inject_coauthor_reviewers(rng, manuscripts, reviewers)
    manuscripts = inject_editor_coauthor(rng, manuscripts, editors)
    manuscripts = simulate_history(rng, manuscripts, reviewers)
    ground_truth = build_ground_truth(rng, manuscripts, reviewers)
    apply_tag_noise(noise_rng, manuscripts, reviewers)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dataset = {
        'seed': SEED,
        'authors': authors,
        'editors': editors,
        'reviewers': reviewers,
        'manuscripts': manuscripts,
    }
    with open(OUT_DIR / 'dataset.json', 'w', encoding='utf-8') as f:
        json.dump(dataset, f, indent=2)

    with open(OUT_DIR / 'ground_truth.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['manuscript_index', 'reviewer_index', 'relevance', 'success_probability', 'success'])
        writer.writerows(ground_truth)

    n_assignments = sum(len(m['assignments']) for m in manuscripts)
    n_reviews = sum(1 for m in manuscripts for a in m['assignments'] if a['status'] == 'submitted')
    print(f'authors={len(authors)} editors={len(editors)} reviewers={len(reviewers)} manuscripts={len(manuscripts)}')
    print(f'assignments={n_assignments} submitted_reviews={n_reviews}')
    print(f'coauthor reviewers: {[i for i, r in enumerate(reviewers) if r["is_coauthor"]]}')
    print(f'ground_truth rows={len(ground_truth)} positive={sum(row[4] for row in ground_truth)}')
    print(f'wrote {OUT_DIR / "dataset.json"} and {OUT_DIR / "ground_truth.csv"}')


if __name__ == '__main__':
    main()
