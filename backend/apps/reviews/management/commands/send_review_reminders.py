from django.core.management.base import BaseCommand

from apps.reviews.reminders import send_due_reminders


class Command(BaseCommand):
    help = 'Notify reviewers whose accepted reviews are due soon or overdue. Safe to run on a schedule.'

    def handle(self, *args, **options):
        reminded = send_due_reminders()
        for assignment in reminded:
            self.stdout.write(f'Reminded {assignment.reviewer.email} about manuscript #{assignment.manuscript_id}')
        self.stdout.write(self.style.SUCCESS(f'{len(reminded)} reminder(s) sent.'))
