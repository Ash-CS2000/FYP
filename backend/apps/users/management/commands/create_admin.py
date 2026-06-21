# create_admin.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.users.models import UserProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Create JSREMS admin account'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True)
        parser.add_argument('--password', required=True)
        parser.add_argument('--name', default='Admin')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        name = options['name'].split(maxsplit=1)

        # Get existing user or create new one
        user, user_created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': name[0],
                'last_name': name[1] if len(name) > 1 else '',
            }
        )

        if user_created:
            user.set_password(password)
            user.save()
        else:
            self.stdout.write(self.style.WARNING(f'User {email} already exists — updating profile to admin.'))

        # update_or_create handles duplicate profile
        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                'role': 'admin',
                'status': 'active',
            }
        )

        self.stdout.write(self.style.SUCCESS(f'Admin ready: {email}'))