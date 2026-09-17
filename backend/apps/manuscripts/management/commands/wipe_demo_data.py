"""
Clears out ad-hoc demo/test data ahead of reseeding a fresh ML training
dataset (see ml_service/ and seed_ml_dataset). Deliberately conservative:
runs as a dry run by default and only touches the database with --confirm.

Kept accounts (never deleted, regardless of email):
  - every Django superuser
  - the KEEP_EMAILS list below (teammate-looking non-demo accounts)

Everything else -- including all @demo-paperbridge.test accounts and every
other test/throwaway account accumulated over the project -- is deleted,
along with everything that FKs to it (manuscripts, authors, affiliations,
assignments, reviews, notifications, decisions, revisions, screening
actions, plagiarism checks) and the corresponding Supabase Storage objects
(manuscript files, supplementary files, revisions, avatars).

Usage:
    python manage.py wipe_demo_data              # dry run -- prints counts only
    python manage.py wipe_demo_data --confirm    # actually deletes
"""
from pathlib import Path

import openpyxl
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.manuscripts import storage
from apps.manuscripts.models import (
    Decision, Manuscript, ManuscriptAffiliation, ManuscriptAuthor,
    ManuscriptRevision, ManuscriptSupplementaryFile, PlagiarismCheck, ScreeningAction,
)
from apps.notifications.models import Notification
from apps.reviews.models import Review, ReviewAssignment
from apps.users.models import EditorInvite, UserProfile, UserRole

KEEP_EMAILS = {
    "shizuo.hirota@gmail.com",
    "darrshann@gmail.com",
    "yehtetkyaw.yegyi@gmail.com",
    "aungsihein2000@gmail.com",
    "hahaha2000@gmail.com",
}

XLSX_PATH = Path(settings.BASE_DIR).parent / "PaperBridge Demo Data.xlsx"


class Command(BaseCommand):
    help = "Dry-run (default) or execute (--confirm) a wipe of all non-kept demo/test data."

    def add_arguments(self, parser):
        parser.add_argument("--confirm", action="store_true", help="Actually delete. Without this flag, only prints counts.")

    def handle(self, *args, **options):
        User = get_user_model()
        confirm = options["confirm"]

        keep_ids = set(
            User.objects.filter(is_superuser=True).values_list("id", flat=True)
        ) | set(
            User.objects.filter(email__in=KEEP_EMAILS).values_list("id", flat=True)
        )
        kept_qs = User.objects.filter(id__in=keep_ids)
        self.stdout.write(self.style.NOTICE(f"Keeping {kept_qs.count()} user(s):"))
        for u in kept_qs.order_by("email"):
            self.stdout.write(f"    {u.email} (superuser={u.is_superuser})")

        delete_users = User.objects.exclude(id__in=keep_ids)
        delete_user_ids = list(delete_users.values_list("id", flat=True))

        delete_manuscripts = Manuscript.objects.exclude(owner_id__in=keep_ids)
        delete_manuscript_ids = list(delete_manuscripts.values_list("id", flat=True))

        # Assignments/reviews touching a kept user's manuscript but invited a
        # non-kept reviewer -- these are removed when the reviewer User cascades,
        # counted here separately so the dry-run total isn't misleading.
        stray_assignments = ReviewAssignment.objects.filter(
            manuscript_id__in=Manuscript.objects.filter(owner_id__in=keep_ids).values_list("id", flat=True),
            reviewer_id__in=delete_user_ids,
        )

        counts = {
            "users (deleted)": delete_users.count(),
            "manuscripts (owner deleted)": len(delete_manuscript_ids),
            "authors": ManuscriptAuthor.objects.filter(manuscript_id__in=delete_manuscript_ids).count(),
            "affiliations": ManuscriptAffiliation.objects.filter(author__manuscript_id__in=delete_manuscript_ids).count(),
            "supplementary files": ManuscriptSupplementaryFile.objects.filter(manuscript_id__in=delete_manuscript_ids).count(),
            "plagiarism checks": PlagiarismCheck.objects.filter(manuscript_id__in=delete_manuscript_ids).count(),
            "decisions": Decision.objects.filter(manuscript_id__in=delete_manuscript_ids).count(),
            "screening actions": ScreeningAction.objects.filter(manuscript_id__in=delete_manuscript_ids).count(),
            "revisions": ManuscriptRevision.objects.filter(manuscript_id__in=delete_manuscript_ids).count(),
            "review assignments (via manuscript)": ReviewAssignment.objects.filter(manuscript_id__in=delete_manuscript_ids).count(),
            "review assignments (via reviewer, on a KEPT manuscript)": stray_assignments.count(),
            "reviews": Review.objects.filter(assignment__manuscript_id__in=delete_manuscript_ids).count()
                       + Review.objects.filter(assignment__in=stray_assignments).count(),
            "notifications (via manuscript)": Notification.objects.filter(manuscript_id__in=delete_manuscript_ids).count(),
            "notifications (via deleted recipient)": Notification.objects.filter(recipient_id__in=delete_user_ids).exclude(manuscript_id__in=delete_manuscript_ids).count(),
            "editor invites (non-kept email)": EditorInvite.objects.exclude(email__in=KEEP_EMAILS).count(),
            "user profiles": UserProfile.objects.filter(user_id__in=delete_user_ids).count(),
            "user roles": UserRole.objects.filter(user_id__in=delete_user_ids).count(),
        }

        # Storage keys that will need deleting from Supabase Storage.
        manuscript_keys = list(Manuscript.objects.filter(id__in=delete_manuscript_ids).exclude(file_key="").values_list("file_key", flat=True))
        supp_keys = list(ManuscriptSupplementaryFile.objects.filter(manuscript_id__in=delete_manuscript_ids).exclude(file_key="").values_list("file_key", flat=True))
        revision_keys = list(ManuscriptRevision.objects.filter(manuscript_id__in=delete_manuscript_ids).exclude(file_key="").values_list("file_key", flat=True))
        avatar_keys = list(UserProfile.objects.filter(user_id__in=delete_user_ids).exclude(avatar_key="").values_list("avatar_key", flat=True))
        all_storage_keys = manuscript_keys + supp_keys + revision_keys + avatar_keys

        self.stdout.write("")
        self.stdout.write(self.style.NOTICE("Rows that would be deleted:"))
        width = max(len(k) for k in counts)
        for k, v in counts.items():
            self.stdout.write(f"    {k.ljust(width)}  {v}")
        self.stdout.write("")
        self.stdout.write(self.style.NOTICE(f"Supabase Storage objects that would be deleted: {len(all_storage_keys)}"))
        self.stdout.write(f"    manuscripts: {len(manuscript_keys)}, supplementary: {len(supp_keys)}, revisions: {len(revision_keys)}, avatars: {len(avatar_keys)}")
        self.stdout.write("")
        self.stdout.write(self.style.NOTICE(f"xlsx sheets that would be cleared (headers kept): {XLSX_PATH}"))

        if not confirm:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("DRY RUN -- nothing was deleted. Re-run with --confirm to execute."))
            return

        self.stdout.write("")
        self.stdout.write(self.style.WARNING("--confirm passed -- deleting now."))

        with transaction.atomic():
            # Order matters for the storage-key snapshot but not for DB FK
            # integrity (Django resolves cascades regardless of call order).
            delete_manuscripts.delete()
            delete_users.delete()
            EditorInvite.objects.exclude(email__in=KEEP_EMAILS).delete()

        if all_storage_keys:
            storage.delete_files(all_storage_keys)
            self.stdout.write(self.style.SUCCESS(f"Deleted {len(all_storage_keys)} Supabase Storage object(s)."))

        self._clear_xlsx()
        self.stdout.write(self.style.SUCCESS("Wipe complete."))

    def _clear_xlsx(self):
        if not XLSX_PATH.exists():
            self.stdout.write(self.style.WARNING(f"{XLSX_PATH} not found -- skipping."))
            return
        wb = openpyxl.load_workbook(XLSX_PATH)
        for sheet_name in ("Authors", "Reviewers", "Manuscripts"):
            if sheet_name not in wb.sheetnames:
                continue
            ws = wb[sheet_name]
            if ws.max_row > 1:
                ws.delete_rows(2, ws.max_row - 1)
        wb.save(XLSX_PATH)
        self.stdout.write(self.style.SUCCESS(f"Cleared data rows in {XLSX_PATH.name} (headers kept)."))
