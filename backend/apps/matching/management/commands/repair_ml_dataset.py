"""
Brings already-seeded ML dataset rows in the database up to date with a
regenerated ml_service/data/generated/dataset.json, IN PLACE -- no wipe, no
reseed, so ids, review history, PDFs and every non-demo account stay as they
are.

It rewrites only the fields generate_dataset.py changed to stop the hidden
ground truth leaking into matched text (see ml_service/check_dataset.py):
reviewer expertise_areas / research_areas / specialty_tags, manuscript
title / abstract / sub_category / specialty_tags, and Review.summary.

Rows are located through dataset.prev.json -- the exact dataset the database
was seeded from: reviewers by email, manuscripts by their previous
(title, abstract), which also tells apart two manuscripts that used to share
a title. Only @demo-paperbridge.test data is touched. Run
`python ml_service/check_dataset.py` first; it verifies the two datasets
differ only in these fields.

Usage:
    python manage.py repair_ml_dataset            # dry run: report what would change
    python manage.py repair_ml_dataset --confirm  # apply, in one transaction
"""
import json
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.manuscripts.models import Manuscript
from apps.reviews.models import Review
from apps.users.models import UserProfile

DATA_DIR = Path(settings.BASE_DIR).parent / 'ml_service' / 'data' / 'generated'
DEMO_DOMAIN = '@demo-paperbridge.test'


class Command(BaseCommand):
    help = 'Update seeded ML dataset rows in place from a regenerated dataset.json.'

    def add_arguments(self, parser):
        parser.add_argument('--confirm', action='store_true', help='Apply the changes (default is a dry run).')

    def handle(self, *args, **options):
        new_path, prev_path = DATA_DIR / 'dataset.json', DATA_DIR / 'dataset.prev.json'
        if not new_path.exists() or not prev_path.exists():
            raise CommandError(f'Need both {new_path.name} and {prev_path.name} in {DATA_DIR}.')
        new = json.load(open(new_path, encoding='utf-8'))
        prev = json.load(open(prev_path, encoding='utf-8'))
        if len(new['reviewers']) != len(prev['reviewers']) or len(new['manuscripts']) != len(prev['manuscripts']):
            raise CommandError('dataset.json and dataset.prev.json have different row counts -- not the same seed.')

        profile_updates = self._plan_reviewers(prev, new)
        manuscript_updates, review_updates, missing = self._plan_manuscripts(prev, new)

        self.stdout.write(
            f'reviewer profiles to update: {len(profile_updates)}\n'
            f'manuscripts to update: {len(manuscript_updates)}\n'
            f'review summaries to update: {len(review_updates)}'
        )
        for line in missing:
            self.stdout.write(self.style.WARNING(f'  not found in database: {line}'))

        if not options['confirm']:
            self.stdout.write('Dry run -- nothing changed. Re-run with --confirm to apply.')
            return

        with transaction.atomic():
            for profile_id, fields in profile_updates:
                UserProfile.objects.filter(pk=profile_id).update(**fields)
            for manuscript_id, fields in manuscript_updates:
                # .update() on purpose: no signals, no auto_now bump -- this is
                # a data correction, not an author edit.
                Manuscript.objects.filter(pk=manuscript_id).update(**fields)
            for review_id, summary in review_updates:
                Review.objects.filter(pk=review_id).update(summary=summary)
        self.stdout.write(self.style.SUCCESS('Repair applied.'))

    def _plan_reviewers(self, prev, new):
        User = get_user_model()
        emails = [r['email'] for r in new['reviewers']]
        profiles = {
            p.user.email: p
            for p in UserProfile.objects.filter(user__email__in=emails).select_related('user')
        }
        updates = []
        for old, fresh in zip(prev['reviewers'], new['reviewers']):
            if old['email'] != fresh['email'] or not fresh['email'].endswith(DEMO_DOMAIN):
                raise CommandError(f'reviewer order/email mismatch at {fresh["email"]}')
            profile = profiles.get(fresh['email'])
            if profile is None:
                continue
            fields = {
                key: fresh[key]
                for key in ('expertise_areas', 'research_areas', 'specialty_tags')
                if getattr(profile, key) != fresh[key]
            }
            if fields:
                updates.append((profile.pk, fields))
        return updates

    def _plan_manuscripts(self, prev, new):
        reviewer_emails = [r['email'] for r in new['reviewers']]
        manuscript_updates, review_updates, missing = [], [], []

        for index, (old, fresh) in enumerate(zip(prev['manuscripts'], new['manuscripts'])):
            candidates = []
            # The previous (title, abstract) finds a not-yet-repaired row; the
            # new one finds a row an earlier run already repaired, so the
            # command is safe to re-run.
            for key in ({(old['title'], old['abstract']), (fresh['title'], fresh['abstract'])}):
                candidates += Manuscript.objects.filter(
                    title=key[0], abstract=key[1], owner__email__iendswith=DEMO_DOMAIN,
                ).values_list('pk', flat=True)
            candidates = sorted(set(candidates))
            if len(candidates) != 1:
                missing.append(f'manuscript {index} ({len(candidates)} matches) {old["title"][:60]!r}')
                continue
            manuscript = Manuscript.objects.get(pk=candidates[0])

            fields = {
                key: fresh[key]
                for key in ('title', 'abstract', 'sub_category', 'specialty_tags')
                if getattr(manuscript, key) != fresh[key]
            }
            if fields:
                manuscript_updates.append((manuscript.pk, fields))

            reviews = {
                review.assignment.reviewer.email: review
                for review in Review.objects.filter(assignment__manuscript=manuscript).select_related('assignment__reviewer')
            }
            for assignment in fresh['assignments']:
                if 'review' not in assignment:
                    continue
                review = reviews.get(reviewer_emails[assignment['reviewer_index']])
                if review is not None and review.summary != assignment['review']['summary']:
                    review_updates.append((review.pk, assignment['review']['summary']))

        return manuscript_updates, review_updates, missing
