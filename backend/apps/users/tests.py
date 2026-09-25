from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import UserProfile, UserRole


User = get_user_model()


def make_user(email, password='Passw0rd!'):
    return User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=email.split('@')[0],
    )


class ReviewerIdentityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_existing_author_applies_to_become_reviewer_on_same_account(self):
        author = make_user('author@example.test')
        UserRole.objects.create(user=author, role=UserProfile.Role.AUTHOR, status=UserRole.Status.ACTIVE)
        author.profile.orcid_id = '0000-0002-1111-2222'
        author.profile.save(update_fields=['orcid_id'])

        self.client.force_authenticate(author)
        response = self.client.post(
            reverse('apply-reviewer'),
            {'expertise_areas': 'Machine learning', 'specialty_tags': ['machine-learning']},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(User.objects.filter(email='author@example.test').count(), 1)
        reviewer_role = UserRole.objects.get(user=author, role=UserProfile.Role.REVIEWER)
        self.assertEqual(reviewer_role.status, UserRole.Status.PENDING)

    def test_reviewer_application_requires_orcid_and_remains_pending(self):
        author = make_user('no-orcid@example.test')
        UserRole.objects.create(user=author, role=UserProfile.Role.AUTHOR, status=UserRole.Status.ACTIVE)

        self.client.force_authenticate(author)
        response = self.client.post(reverse('apply-reviewer'), {'expertise_areas': 'Security'}, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(UserRole.objects.filter(user=author, role=UserProfile.Role.REVIEWER).exists())

    def test_pending_reviewer_has_no_reviewer_permissions_until_approval(self):
        author = make_user('pending@example.test')
        UserRole.objects.create(user=author, role=UserProfile.Role.AUTHOR, status=UserRole.Status.ACTIVE)
        UserRole.objects.create(user=author, role=UserProfile.Role.REVIEWER, status=UserRole.Status.PENDING)

        self.client.force_authenticate(author)
        response = self.client.get('/api/reviewer/assignments/')

        self.assertEqual(response.status_code, 403)

    def test_approved_user_gains_reviewer_permissions(self):
        admin = make_user('admin@example.test')
        admin.is_staff = True
        admin.save(update_fields=['is_staff'])
        reviewer = make_user('reviewer@example.test')
        reviewer.profile.orcid_id = '0000-0002-9999-1111'
        reviewer.profile.save(update_fields=['orcid_id'])
        UserRole.objects.create(user=reviewer, role=UserProfile.Role.REVIEWER, status=UserRole.Status.PENDING)

        self.client.force_authenticate(admin)
        approve = self.client.patch(
            reverse('reviewer-status', args=[reviewer.id]),
            {'action': 'approve'},
            format='json',
        )
        self.assertEqual(approve.status_code, 200)

        self.client.force_authenticate(reviewer)
        response = self.client.get('/api/reviewer/assignments/')
        self.assertEqual(response.status_code, 200)

    def test_same_orcid_cannot_be_linked_to_two_profiles(self):
        first = make_user('first@example.test')
        second = make_user('second@example.test')
        first.profile.orcid_id = '0000-0002-3333-4444'
        first.profile.save(update_fields=['orcid_id'])

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                second.profile.orcid_id = '0000-0002-3333-4444'
                second.profile.save(update_fields=['orcid_id'])

    def test_password_registration_cannot_create_standalone_reviewer_identity(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'full_name': 'Standalone Reviewer',
                'email': 'standalone@example.test',
                'password': 'Passw0rd!',
                'role': UserProfile.Role.REVIEWER,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='standalone@example.test').exists())

    def test_password_registration_cannot_create_author_without_orcid(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'full_name': 'Unverified Author',
                'email': 'unverified-author@example.test',
                'password': 'Passw0rd!',
                'role': UserProfile.Role.AUTHOR,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='unverified-author@example.test').exists())

    def test_password_registration_creates_author_with_orcid(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'full_name': 'Verified Author',
                'email': 'verified-author@example.test',
                'password': 'Passw0rd!',
                'role': UserProfile.Role.AUTHOR,
                'orcid_id': '0000-0002-1234-5678',
                'institution': 'PaperBridge University',
                'research_areas': 'Machine Learning',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        author = User.objects.get(email='verified-author@example.test')
        self.assertEqual(author.profile.orcid_id, '0000-0002-1234-5678')
        author_role = UserRole.objects.get(user=author, role=UserProfile.Role.AUTHOR)
        self.assertEqual(author_role.status, UserRole.Status.ACTIVE)
