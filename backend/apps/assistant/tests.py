from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.audit.models import AuditLog
from apps.manuscripts.models import Manuscript, PlagiarismCheck
from apps.reviews.models import Review, ReviewAssignment
from apps.system.views import HEALTH_CACHE_KEY
from apps.users.models import UserProfile, UserRole

User = get_user_model()

URL = '/api/assistant/admin-chat/'
BODY = {'messages': [{'role': 'user', 'content': 'What needs my attention?'}]}


def make_user(email, role):
    user = User.objects.create_user(username=email, email=email, password='pw-12345!')
    UserRole.objects.get_or_create(user=user, role=role, defaults={'status': UserRole.Status.ACTIVE})
    return user


class AdminAssistantTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user('admin@example.org', UserProfile.Role.ADMIN)

    def test_requires_authentication(self):
        self.assertIn(self.client.post(URL, BODY, format='json').status_code, (401, 403))

    def test_non_admin_is_forbidden(self):
        for role in (UserProfile.Role.AUTHOR, UserProfile.Role.REVIEWER, UserProfile.Role.EDITOR):
            self.client.force_authenticate(make_user(f'{role}@example.org', role))
            with mock.patch('apps.assistant.views.chat') as fake:
                res = self.client.post(URL, BODY, format='json')
            self.assertEqual(res.status_code, 403, role)
            fake.assert_not_called()

    def test_admin_gets_reply_with_platform_snapshot_in_prompt(self):
        AuditLog.objects.create(type=AuditLog.Type.SECURITY, action='revoke_all', summary='All sessions were revoked.')
        cache.set(HEALTH_CACHE_KEY, {
            'overall': 'operational', 'checked_at': '2026-09-20T00:00:00Z',
            'checks': [{'key': 'database', 'label': 'Database', 'status': 'ok', 'value': '12 ms', 'detail': 'Fine'}],
        })
        self.client.force_authenticate(self.admin)

        with mock.patch('apps.assistant.views.chat', return_value='All quiet.') as fake:
            res = self.client.post(URL, BODY, format='json')

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'reply': 'All quiet.'})
        system_instruction, turns = fake.call_args.args
        self.assertIn('Admin Assistant', system_instruction)
        self.assertIn('All sessions were revoked.', system_instruction)
        self.assertIn('"Database"', system_instruction)
        self.assertIn('reviewer_applications', system_instruction)
        self.assertEqual(turns, [{'role': 'user', 'parts': [{'text': 'What needs my attention?'}]}])

    def test_health_is_not_run_when_uncached(self):
        self.client.force_authenticate(self.admin)
        with mock.patch('apps.assistant.views.chat', return_value='ok') as fake, \
                mock.patch('apps.system.health.run_checks') as run_checks:
            self.client.post(URL, BODY, format='json')
        run_checks.assert_not_called()
        self.assertIn('not checked recently', fake.call_args.args[0])

    def test_rejects_bad_history(self):
        self.client.force_authenticate(self.admin)
        for body in ({}, {'messages': []}, {'messages': [{'role': 'assistant', 'content': 'hi'}]}):
            self.assertEqual(self.client.post(URL, body, format='json').status_code, 400)

    def test_gemini_failure_is_a_502(self):
        from .gemini_client import GeminiError
        self.client.force_authenticate(self.admin)
        with mock.patch('apps.assistant.views.chat', side_effect=GeminiError('boom')):
            res = self.client.post(URL, BODY, format='json')
        self.assertEqual(res.status_code, 502)
        self.assertNotIn('boom', res.json()['detail'])


class AuthorAssistantStillWorksTests(APITestCase):
    def test_author_endpoint_unchanged_and_admin_endpoint_closed_to_authors(self):
        author = make_user('author@example.org', UserProfile.Role.AUTHOR)
        self.client.force_authenticate(author)
        with mock.patch('apps.assistant.views.chat', return_value='hello') as fake:
            res = self.client.post('/api/assistant/chat/', BODY, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('Author Assistant', fake.call_args.args[0])


# ── Editor and reviewer assistants ───────────────────────────────────────────

ENDPOINTS = {
    UserProfile.Role.AUTHOR: '/api/assistant/chat/',
    UserProfile.Role.REVIEWER: '/api/assistant/reviewer-chat/',
    UserProfile.Role.EDITOR: '/api/assistant/editor-chat/',
    UserProfile.Role.ADMIN: '/api/assistant/admin-chat/',
}


def make_manuscript(owner, title, **kwargs):
    return Manuscript.objects.create(owner=owner, title=title, abstract='abs', file_key='k', **kwargs)


def assign(manuscript, reviewer, editor, status=ReviewAssignment.Status.ACCEPTED, **kwargs):
    now = timezone.now()
    return ReviewAssignment.objects.create(
        manuscript=manuscript, reviewer=reviewer, invited_by=editor, status=status,
        respond_by=now + timedelta(days=5), due_days=21, **kwargs,
    )


class RoleIsolationTests(APITestCase):
    def test_each_assistant_is_closed_to_every_other_role(self):
        users = {role: make_user(f'{role}@example.org', role) for role in ENDPOINTS}
        for role, user in users.items():
            self.client.force_authenticate(user)
            for target, url in ENDPOINTS.items():
                with mock.patch('apps.assistant.views.chat', return_value='ok'):
                    res = self.client.post(url, BODY, format='json')
                self.assertEqual(res.status_code, 200 if role == target else 403, f'{role} -> {target}')

    def test_admin_without_editor_role_cannot_use_editor_assistant(self):
        # Screening and decisions are editorial judgement; admins only oversee.
        self.client.force_authenticate(make_user('a@example.org', UserProfile.Role.ADMIN))
        self.assertEqual(self.client.post(ENDPOINTS[UserProfile.Role.EDITOR], BODY, format='json').status_code, 403)


class EditorAssistantTests(APITestCase):
    def test_prompt_carries_queue_flags_overdue_and_extensions(self):
        editor = make_user('editor@example.org', UserProfile.Role.EDITOR)
        author = make_user('author@example.org', UserProfile.Role.AUTHOR)
        reviewer = make_user('rev@example.org', UserProfile.Role.REVIEWER)
        paper = make_manuscript(author, 'Deep Flagged Paper', status=Manuscript.Status.UNDER_REVIEW)
        PlagiarismCheck.objects.create(manuscript=paper, status='completed', similarity_score=61.0)
        past = timezone.now() - timedelta(days=4)
        assign(paper, reviewer, editor, due_at=past, extension_status='pending',
                   extension_requested_days=7, extension_reason='Family emergency')

        self.client.force_authenticate(editor)
        with mock.patch('apps.assistant.views.chat', return_value='ok') as fake:
            res = self.client.post(ENDPOINTS[UserProfile.Role.EDITOR], BODY, format='json')

        self.assertEqual(res.status_code, 200)
        prompt = fake.call_args.args[0]
        self.assertIn('Editor Assistant', prompt)
        self.assertIn('Deep Flagged Paper', prompt)
        self.assertIn('"band":"flagged"', prompt)
        self.assertIn('Flagged similarity reports with no screening outcome yet', prompt)
        self.assertIn('"days_overdue":4', prompt)
        self.assertIn('Family emergency', prompt)
        self.assertIn(f'"manuscript_id":{paper.id}', prompt)

    def test_prompt_never_includes_review_text(self):
        editor = make_user('editor@example.org', UserProfile.Role.EDITOR)
        author = make_user('author@example.org', UserProfile.Role.AUTHOR)
        reviewer = make_user('rev@example.org', UserProfile.Role.REVIEWER)
        paper = make_manuscript(author, 'Reviewed Paper', status=Manuscript.Status.UNDER_REVIEW)
        a = assign(paper, reviewer, editor, status=ReviewAssignment.Status.SUBMITTED)
        Review.objects.create(
            assignment=a, originality=4, technical=4, clarity=4, relevance=4, recommendation='minor',
            summary='SUMMARY-SECRET', strengths='STRENGTH-SECRET', weaknesses='WEAK-SECRET',
            confidential_to_editor='CONFIDENTIAL-SECRET',
        )
        self.client.force_authenticate(editor)
        with mock.patch('apps.assistant.views.chat', return_value='ok') as fake:
            self.client.post(ENDPOINTS[UserProfile.Role.EDITOR], BODY, format='json')
        prompt = fake.call_args.args[0]
        self.assertIn('"recommendations":["minor"]', prompt)
        for secret in ('SUMMARY-SECRET', 'STRENGTH-SECRET', 'WEAK-SECRET', 'CONFIDENTIAL-SECRET'):
            self.assertNotIn(secret, prompt)

    def test_empty_platform_still_answers(self):
        self.client.force_authenticate(make_user('editor@example.org', UserProfile.Role.EDITOR))
        with mock.patch('apps.assistant.views.chat', return_value='ok'):
            self.assertEqual(self.client.post(ENDPOINTS[UserProfile.Role.EDITOR], BODY, format='json').status_code, 200)


class ReviewerAssistantTests(APITestCase):
    def setUp(self):
        self.editor = make_user('editor@example.org', UserProfile.Role.EDITOR)
        self.author = User.objects.create_user(
            username='ada@example.org', email='ada@example.org', first_name='Ada', last_name='Authorson',
        )
        self.me = make_user('me@example.org', UserProfile.Role.REVIEWER)
        self.other = User.objects.create_user(
            username='other@example.org', email='other@example.org', first_name='Otto', last_name='Otherreviewer',
        )
        UserRole.objects.create(user=self.other, role=UserProfile.Role.REVIEWER, status=UserRole.Status.ACTIVE)

    def test_only_own_assignments_and_double_blind_holds(self):
        mine = make_manuscript(self.author, 'My Assigned Paper', status=Manuscript.Status.UNDER_REVIEW)
        theirs = make_manuscript(self.author, 'Someone Elses Paper', status=Manuscript.Status.UNDER_REVIEW)
        assign(mine, self.me, self.editor, due_at=timezone.now() + timedelta(days=10))
        assign(mine, self.other, self.editor)
        assign(theirs, self.other, self.editor)

        self.client.force_authenticate(self.me)
        with mock.patch('apps.assistant.views.chat', return_value='ok') as fake:
            res = self.client.post(ENDPOINTS[UserProfile.Role.REVIEWER], BODY, format='json')

        self.assertEqual(res.status_code, 200)
        prompt = fake.call_args.args[0]
        self.assertIn('My Assigned Paper', prompt)
        self.assertIn('"days_left":9', prompt)
        self.assertNotIn('Someone Elses Paper', prompt)
        for hidden in ('Ada', 'Authorson', 'ada@example.org', 'Otto', 'Otherreviewer', 'other@example.org',
                       'editor@example.org'):
            self.assertNotIn(hidden, prompt)

    def test_shows_own_submitted_recommendation_and_invite_deadline(self):
        done = make_manuscript(self.author, 'Done Paper', status=Manuscript.Status.UNDER_REVIEW)
        a = assign(done, self.me, self.editor, status=ReviewAssignment.Status.SUBMITTED)
        Review.objects.create(
            assignment=a, originality=3, technical=3, clarity=3, relevance=3, recommendation='major',
            summary='s', strengths='s', weaknesses='w',
        )
        invited = make_manuscript(self.author, 'Invited Paper', status=Manuscript.Status.UNDER_REVIEW)
        assign(invited, self.me, self.editor, status=ReviewAssignment.Status.INVITED)

        self.client.force_authenticate(self.me)
        with mock.patch('apps.assistant.views.chat', return_value='ok') as fake:
            self.client.post(ENDPOINTS[UserProfile.Role.REVIEWER], BODY, format='json')
        prompt = fake.call_args.args[0]
        self.assertIn('"my_recommendation":"major"', prompt)
        self.assertIn('"reply_by"', prompt)
        self.assertIn('"review_window_days_if_accepted":21', prompt)

    def test_no_assignments(self):
        self.client.force_authenticate(self.me)
        with mock.patch('apps.assistant.views.chat', return_value='ok') as fake:
            self.client.post(ENDPOINTS[UserProfile.Role.REVIEWER], BODY, format='json')
        self.assertIn('no invitations or assignments yet', fake.call_args.args[0])
