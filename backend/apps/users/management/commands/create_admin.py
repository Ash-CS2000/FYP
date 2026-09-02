# create_admin.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.users.models import UserProfile, UserRole

User = get_user_model()


class Command(BaseCommand):
    help = 'Create (or promote) a PaperBridge admin account'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True)
        parser.add_argument('--password', required=True)
        parser.add_argument('--name', default='Admin')

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        password = options['password']
        name = options['name'].split(maxsplit=1)

        user, user_created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': name[0],
                'last_name': name[1] if len(name) > 1 else '',
            },
        )

        # Always (re)set the password + staff flags so the command doubles as a
        # password reset for an existing account.
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()

        UserProfile.objects.update_or_create(
            user=user,
            defaults={'role': UserProfile.Role.ADMIN, 'status': UserProfile.Status.ACTIVE},
        )

        # The multi-role system reads access off UserRole, not UserProfile.role,
        # so the admin needs an active admin role row too.
        UserRole.objects.update_or_create(
            user=user,
            role=UserProfile.Role.ADMIN,
            defaults={'status': UserRole.Status.ACTIVE},
        )

        verb = 'created' if user_created else 'updated'
        self.stdout.write(self.style.SUCCESS(f'Admin {verb}: {email}'))
