from django.core.management.base import BaseCommand

from apps.users.account_status import lift_expired_suspensions


class Command(BaseCommand):
    help = 'Reactivate every account whose suspension end date has passed. Safe to run on a schedule.'

    def handle(self, *args, **options):
        lifted = lift_expired_suspensions()
        for user in lifted:
            self.stdout.write(f'Lifted suspension: {user.email}')
        self.stdout.write(self.style.SUCCESS(f'{len(lifted)} suspension(s) lifted.'))
