"""
Exports one row per (manuscript, reviewer) pair with live feature values
computed from the database (via apps.matching.ranking.compute_candidate_features
-- the exact same function ranking.py uses to serve real requests) joined
against the hidden ground-truth relevance/success labels from
ml_service/generate_dataset.py.

Hard-authorship pairs are dropped entirely: an author's own paper would
look like a near-perfect semantic match and has no business being a
training example, positive or negative (see matching_system.md
'Authorship protection').

Matches DB rows back to dataset.json's 0-indexed authors/reviewers lists by
email (reviewers) and by exact title (manuscripts) -- the seed data has no
other stable link back to the generator's indices.

Usage:
    python manage.py export_matching_pairs
"""
import csv
import json
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.manuscripts.models import Manuscript
from apps.matching.baseline import baseline_score
from apps.matching.features import FEATURE_NAMES
from apps.matching.ranking import compute_candidate_features
from apps.users.models import UserProfile, UserRole

DATASET_PATH = Path(settings.BASE_DIR).parent / 'ml_service' / 'data' / 'generated' / 'dataset.json'
GROUND_TRUTH_PATH = Path(settings.BASE_DIR).parent / 'ml_service' / 'data' / 'generated' / 'ground_truth.csv'
OUT_PATH = Path(settings.BASE_DIR).parent / 'ml_service' / 'data' / 'generated' / 'pairs.csv'


class Command(BaseCommand):
    help = 'Export (manuscript, reviewer) feature rows joined with ground-truth labels for training.'

    def handle(self, *args, **options):
        if not DATASET_PATH.exists() or not GROUND_TRUTH_PATH.exists():
            raise CommandError(f'{DATASET_PATH} / {GROUND_TRUTH_PATH} not found -- run generate_dataset.py first.')

        with open(DATASET_PATH, encoding='utf-8') as f:
            dataset = json.load(f)

        ground_truth = {}
        with open(GROUND_TRUTH_PATH, encoding='utf-8', newline='') as f:
            for row in csv.DictReader(f):
                key = (int(row['manuscript_index']), int(row['reviewer_index']))
                ground_truth[key] = {
                    'relevance': int(row['relevance']),
                    'success': int(row['success']),
                }

        User = get_user_model()
        reviewer_email_to_index = {r['email']: i for i, r in enumerate(dataset['reviewers'])}
        reviewer_id_to_index = {
            u.id: reviewer_email_to_index[u.email]
            for u in User.objects.filter(email__in=reviewer_email_to_index)
        }

        title_to_index = {m['title']: i for i, m in enumerate(dataset['manuscripts'])}
        if len(title_to_index) != len(dataset['manuscripts']):
            raise CommandError(
                'dataset.json has duplicate manuscript titles -- rows could be matched to the wrong '
                'labels. Regenerate with ml_service/generate_dataset.py (which makes titles unique).'
            )
        manuscripts = list(Manuscript.objects.filter(title__in=title_to_index).order_by('id'))

        active_reviewer_ids = set(
            User.objects.filter(roles__role=UserProfile.Role.REVIEWER, roles__status=UserRole.Status.ACTIVE)
            .values_list('id', flat=True)
        )

        rows_written = 0
        dropped_no_label = 0
        with open(OUT_PATH, 'w', newline='', encoding='utf-8') as out:
            writer = csv.writer(out)
            writer.writerow([
                'manuscript_id', 'reviewer_id', *FEATURE_NAMES, 'baseline_score',
                'manuscript_tag_count', 'reviewer_tag_count', 'relevance', 'success',
            ])

            for i, manuscript in enumerate(manuscripts, 1):
                manuscript_index = title_to_index[manuscript.title]
                manuscript_text = ' '.join(filter(None, [manuscript.category, manuscript.sub_category, manuscript.keywords]))
                rows, _excluded = compute_candidate_features(manuscript)
                for row in rows:
                    reviewer_index = reviewer_id_to_index.get(row['user'].id)
                    if reviewer_index is None:
                        continue  # a kept/pre-existing reviewer not in the generated set
                    label = ground_truth.get((manuscript_index, reviewer_index))
                    if label is None:
                        dropped_no_label += 1
                        continue
                    profile = row['profile']
                    reviewer_text = ' '.join(filter(None, [profile.expertise_areas, profile.research_areas]))
                    old_score, _reason = baseline_score(
                        manuscript.specialty_tags, profile.specialty_tags, manuscript_text, reviewer_text,
                    )
                    writer.writerow([
                        manuscript.id, row['user'].id,
                        *[row['features'][name] for name in FEATURE_NAMES],
                        old_score, len(set(manuscript.specialty_tags or [])), len(set(profile.specialty_tags or [])),
                        label['relevance'], label['success'],
                    ])
                    rows_written += 1
                if i % 20 == 0 or i == len(manuscripts):
                    self.stdout.write(f'  {i}/{len(manuscripts)} manuscripts processed')

        self.stdout.write(self.style.SUCCESS(
            f'Wrote {rows_written} rows to {OUT_PATH} ({dropped_no_label} pairs had no ground-truth label -- '
            f'expected for any reviewer outside the generated set, e.g. a kept account).'
        ))
