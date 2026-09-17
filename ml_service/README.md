# ml_service — reviewer-matching dataset generation and training

Offline pipeline that builds a synthetic training dataset and trains the reviewer-matching
ranker the live Django backend serves (`backend/apps/matching/`). See
`../matching_system.md` for the full system design; this README is the reproducible
command reference and the honesty note on what this pipeline is and isn't.

## Honesty note

**This model is trained entirely on simulated outcomes, not real completed reviews.**
There is no completed-review history anywhere in PaperBridge to train on yet. Rather than
wait indefinitely or fake a claim of realism, this pipeline:

1. Generates a synthetic corpus with **hidden** sub-topic labels. No subtopic name, id or
   weight is written into any text the matcher reads (titles, abstracts, keywords, expertise
   blurbs, research areas, publications) — `check_dataset.py` fails if one is. Only the
   evaluation sees them, to grade whether the text features recovered topic structure from
   words alone. (An earlier version leaked them into reviewer blurbs and `sub_category`; see
   `matching_system.md` §7.)
2. Makes specialty tags **noisy** (some true tags dropped, some wrong ones added), like real
   self-picked tags, so tag overlap isn't a copy of the answer key.
3. Simulates an invitation/review history (accept/decline, on-time/late, review quality)
   from those hidden labels plus reviewer traits (reliability, availability, workload), and
   materialises it as real `ReviewAssignment`/`Review` rows in the database.
4. Trains on **features computed from the live database** by
   `apps/matching/ranking.compute_candidate_features()` — the exact function that also
   serves real requests — joined against the hidden ground-truth labels.

Every real invitation the live app sends persists its `match_score`, `match_breakdown` and
`model_version` on the `ReviewAssignment` row — the audit trail a future retrain on genuine
outcomes will need.

## Pipeline

```
corpus.py                    34 hand-curated subtopics (phrase banks, keywords), name/institution pools
        │
        ▼
generate_dataset.py          → data/generated/dataset.json    (people, manuscripts, reviewers,
  (seed=40006, deterministic)                                    publications, simulated history,
        │                                                        noisy + true tags)
        │                     → data/generated/ground_truth.csv (hidden relevance + success labels,
        │                                                          all 7,200 pairs, workload-aware)
        ▼
check_dataset.py             no hidden labels in matched text; unique titles; vs dataset.prev.json
        │                     only repairable fields changed
        ▼
manage.py repair_ml_dataset  updates already-seeded rows in place (expertise/research text, tags,
  --confirm                   titles, abstracts, sub_category, review summaries) -- no wipe
  (or seed_ml_dataset         loads dataset.json into an EMPTY database + Supabase Storage PDFs)
        │
        ▼
manage.py export_matching_pairs
        │                     re-derives features from the DATABASE via
        │                     apps.matching.ranking.compute_candidate_features(), joins
        │                     ground_truth.csv by (manuscript title, reviewer email)
        ▼
        data/generated/pairs.csv   (manuscript_id, reviewer_id, 7 features, baseline_score,
                                     tag counts, relevance, success)
        │
        ▼
train_ranker.py               5-fold GroupKFold CV (grouped by manuscript) →
        │                        backend/apps/matching/model/ranker_v1.json  (what serving loads)
        └──────────────────►    reports/evaluation.md                       (metrics, baselines incl.
                                                                              random, tag ablation,
                                                                              cold start, tag suggestion)
```

## Reproduce

```bash
cd backend && pip install -r requirements.txt   # includes scikit-learn (TF-IDF at serving time)
cd ../ml_service && pip install -r requirements.txt

cd ../backend
python manage.py migrate
python ../ml_service/generate_dataset.py         # keep the seeded version as data/generated/dataset.prev.json first
python ../ml_service/check_dataset.py
python manage.py repair_ml_dataset               # dry run -- inspect the counts
python manage.py repair_ml_dataset --confirm
python manage.py export_matching_pairs
python ../ml_service/train_ranker.py
```

On an empty database, use `python manage.py seed_ml_dataset` (add `--skip-pdfs` to skip the
Supabase Storage uploads) instead of the repair step. **Don't run `wipe_demo_data` on a shared
database** — it deletes every account except superusers and a short keep-list.

## The corpus (`corpus.py`)

34 subtopics across 16 of the 41 specialty tags (2 per tag, all 8 tag groups represented),
each with a small phrase bank (`applications`, `methods`, `gaps`, `findings`) and keywords.
`generate_dataset.py` composes these into titles/abstracts/reviewer blurbs/publications with
sentence templates and seeded RNGs — **programmatically assembled, not individually
hand-written prose.** Deliberate hard cases: lexical near-misses across fields, ~15%
interdisciplinary manuscripts, an over-broad reviewer, untagged-but-publication-strong
reviewers, unavailable strong matches, and 8 reviewer + 1 editor co-author cases for the
authorship-guard tests (see `matching_system.md` §5).

The generator uses three random generators: the main one for everything structural (its
draw order must not change — the live database was seeded from it), and separate ones for
reviewer text and tag noise. That is what lets `repair_ml_dataset` fix text and tags in place.

## Feature definitions

See `backend/apps/matching/features.py` (the source of truth). `train_ranker.py` keeps its
own `FEATURE_NAMES` / `PENALTY_FEATURES` copy so the ranker part has no Django dependency;
keep them in sync by hand (a mismatch shows up immediately as a `KeyError` reading
`pairs.csv`). Full table in `matching_system.md` §4.

## Evaluation

`reports/evaluation.md` is regenerated on every `train_ranker.py` run: learned ranker vs.
random order, the old rule-based scorer and TF-IDF similarity alone; a tag-overlap ablation;
a cold-start subset (manuscript or reviewer untagged, out-of-fold predictions); and
specialty-tag suggestion accuracy. Any penalty feature (`load`, `is_busy`, `is_unavailable`)
that learns a positive weight is dropped before the model is saved. Current numbers and what
they mean: `matching_system.md` §8.

## What's NOT here

- No plagiarism-check simulation (the noplag engine is a separate service).
- No frontend-only demo accounts (`frontend/src/data/demoAccounts.js`) — they bypass the
  backend entirely.
- Retraining on real data: once enough real `ReviewAssignment`/`Review` history exists,
  `export_matching_pairs` would need a real-labels variant (success = did this actually turn
  into a good, on-time review) instead of joining `ground_truth.csv` — not built yet.
