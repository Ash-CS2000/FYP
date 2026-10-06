from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.manuscripts.models import Decision, Manuscript
from apps.notifications.models import Notification
from apps.users.models import UserProfile, UserRole

from .models import Review, ReviewAssignment
from .notifications import REVIEW_COI_TITLE, REVIEW_DUE_SOON_TITLE, REVIEW_OVERDUE_TITLE
from .reminders import send_due_reminders
from .serializers import MIN_REVIEW_TEXT, ManuscriptAssignmentSerializer

User = get_user_model()


def make_user(email, role):
    user = User.objects.create_user(username=email, email=email, password='pw-12345!')
    UserRole.objects.get_or_create(user=user, role=role, defaults={'status': UserRole.Status.ACTIVE})
    return user


class ReviewerTestCase(APITestCase):
    """A signed-in reviewer, plus helpers to give them assignments."""

    def setUp(self):
        self.reviewer = make_user('reviewer@example.org', UserProfile.Role.REVIEWER)
        self.editor = make_user('editor@example.org', UserProfile.Role.EDITOR)
        self.author = make_user('author@example.org', UserProfile.Role.AUTHOR)
        self.client.force_authenticate(self.reviewer)

    def assign(self, title, **kwargs):
        manuscript = Manuscript.objects.create(owner=self.author, title=title, abstract='abs', file_key='k')
        return ReviewAssignment.objects.create(
            manuscript=manuscript, reviewer=self.reviewer, invited_by=self.editor,
            respond_by=timezone.now() + timedelta(days=5), due_days=21, **kwargs,
        )

    def submit(self, assignment, submitted_at):
        review = Review.objects.create(
            assignment=assignment, originality=3, technical=3, clarity=3, relevance=3,
            recommendation=Review.Recommendation.MINOR, summary='s', strengths='s', weaknesses='w',
        )
        # submitted_at is auto_now_add, so backdate it with an update.
        Review.objects.filter(pk=review.pk).update(submitted_at=submitted_at)


class ReviewerWorkspaceTests(ReviewerTestCase):
    def test_assignments_expose_when_the_reviewer_responded(self):
        responded = timezone.now() - timedelta(days=2)
        self.assign('Accepted paper', status=ReviewAssignment.Status.ACCEPTED, responded_at=responded)
        self.assign('Open invite')

        rows = {r['title']: r for r in self.client.get('/api/reviewer/assignments/').json()}

        self.assertEqual(rows['Accepted paper']['responded_at'][:19], responded.isoformat()[:19])
        self.assertIsNone(rows['Open invite']['responded_at'])

    def test_kpi_recent_reviews_are_newest_submission_first(self):
        now = timezone.now()
        # Invited first but submitted last: invited_at order would list it second.
        early_invite = self.assign('Invited first', status=ReviewAssignment.Status.SUBMITTED)
        late_invite = self.assign('Invited second', status=ReviewAssignment.Status.SUBMITTED)
        ReviewAssignment.objects.filter(pk=early_invite.pk).update(invited_at=now - timedelta(days=30))
        ReviewAssignment.objects.filter(pk=late_invite.pk).update(invited_at=now - timedelta(days=20))
        self.submit(early_invite, now - timedelta(days=1))
        self.submit(late_invite, now - timedelta(days=10))

        recent = self.client.get('/api/reviewer/kpi/').json()['recent_reviews']

        self.assertEqual([r['title'] for r in recent], ['Invited first', 'Invited second'])


class DueReminderTests(ReviewerTestCase):
    def reminders(self):
        return Notification.objects.filter(recipient=self.reviewer)

    def accepted(self, due_in, **kwargs):
        return self.assign(
            f'Due in {due_in}', status=ReviewAssignment.Status.ACCEPTED,
            due_at=timezone.now() + timedelta(days=due_in), **kwargs,
        )

    def test_overdue_review_is_reminded_once_then_weekly(self):
        assignment = self.accepted(-10)

        send_due_reminders()
        send_due_reminders()  # same day: nothing new
        self.assertEqual(self.reminders().count(), 1)
        self.assertEqual(self.reminders().get().title, REVIEW_OVERDUE_TITLE)

        ReviewAssignment.objects.filter(pk=assignment.pk).update(reminded_at=timezone.now() - timedelta(days=8))
        send_due_reminders()
        self.assertEqual(self.reminders().count(), 2)

    def test_due_soon_is_reminded_but_not_far_off(self):
        self.accepted(2)
        self.accepted(10)

        send_due_reminders()

        self.assertEqual(list(self.reminders().values_list('title', flat=True)), [REVIEW_DUE_SOON_TITLE])

    def test_closed_assignments_are_not_reminded(self):
        past = timezone.now() - timedelta(days=5)
        self.assign('Submitted', status=ReviewAssignment.Status.SUBMITTED, due_at=past)
        self.assign('Declined', status=ReviewAssignment.Status.DECLINED, due_at=past)

        send_due_reminders()

        self.assertFalse(self.reminders().exists())

    def test_recent_editor_reminder_suppresses_automatic_one(self):
        self.accepted(-10, reminded_at=timezone.now() - timedelta(days=1))

        send_due_reminders()

        self.assertFalse(self.reminders().exists())

    def test_opening_notifications_generates_the_reminder(self):
        self.accepted(-3)

        titles = [n['title'] for n in self.client.get('/api/notifications/').json()]

        self.assertIn(REVIEW_OVERDUE_TITLE, titles)


class MinimumReviewLengthTests(ReviewerTestCase):
    def post_review(self, text):
        assignment = self.assign('Paper', status=ReviewAssignment.Status.ACCEPTED)
        return self.client.post(f'/api/manuscripts/{assignment.manuscript_id}/reviews/', {
            'originality': 3, 'technical': 3, 'clarity': 3, 'relevance': 3, 'recommendation': 'minor',
            'summary': text, 'strengths': text, 'weaknesses': text,
        }, format='json')

    def test_short_text_is_rejected(self):
        res = self.post_review('Too short.')
        self.assertEqual(res.status_code, 400)
        self.assertIn('summary', res.json())

    def test_text_at_the_minimum_is_accepted(self):
        res = self.post_review('x' * MIN_REVIEW_TEXT)
        self.assertEqual(res.status_code, 201)


class ConflictDeclarationTests(ReviewerTestCase):
    def test_declaring_records_it_and_tells_the_editor(self):
        assignment = self.assign('Paper', status=ReviewAssignment.Status.ACCEPTED)

        res = self.client.post(f'/api/reviewer/assignments/{assignment.id}/conflict/',
                               {'note': 'Co-authored with a likely author in 2023.'}, format='json')

        self.assertEqual(res.status_code, 200)
        assignment.refresh_from_db()
        self.assertTrue(assignment.coi_declared)
        self.assertEqual(res.json()['coi_note'], 'Co-authored with a likely author in 2023.')
        self.assertTrue(Notification.objects.filter(recipient=self.editor, title=REVIEW_COI_TITLE).exists())
        self.assertEqual(ManuscriptAssignmentSerializer(assignment).data['coi_note'],
                         'Co-authored with a likely author in 2023.')

    def test_blank_note_and_closed_assignment_are_refused(self):
        accepted = self.assign('Open', status=ReviewAssignment.Status.ACCEPTED)
        submitted = self.assign('Done', status=ReviewAssignment.Status.SUBMITTED)

        blank = self.client.post(f'/api/reviewer/assignments/{accepted.id}/conflict/', {'note': '  '}, format='json')
        closed = self.client.post(f'/api/reviewer/assignments/{submitted.id}/conflict/', {'note': 'x'}, format='json')

        self.assertEqual(blank.status_code, 400)
        self.assertEqual(closed.status_code, 403)


class ExtensionLimitTests(ReviewerTestCase):
    def request_extension(self, assignment):
        return self.client.post(f'/api/reviewer/assignments/{assignment.id}/extension/',
                                {'days': 7, 'reason': 'Away at a conference.'}, format='json')

    def test_only_one_granted_extension(self):
        assignment = self.assign('Paper', status=ReviewAssignment.Status.ACCEPTED,
                                 extension_status=ReviewAssignment.ExtensionStatus.GRANTED)
        self.assertEqual(self.request_extension(assignment).status_code, 409)

    def test_can_ask_again_after_a_refusal(self):
        assignment = self.assign('Paper', status=ReviewAssignment.Status.ACCEPTED,
                                 extension_status=ReviewAssignment.ExtensionStatus.REFUSED)
        self.assertEqual(self.request_extension(assignment).status_code, 200)

    def test_only_accepted_reviews_can_be_extended(self):
        assignment = self.assign('Paper', status=ReviewAssignment.Status.SUBMITTED)
        self.assertEqual(self.request_extension(assignment).status_code, 403)


class ReviewerOutcomeTests(ReviewerTestCase):
    def setUp(self):
        super().setUp()
        self.mine = self.assign('Shared paper', status=ReviewAssignment.Status.SUBMITTED)
        self.manuscript = self.mine.manuscript
        self.other_reviewer = make_user('other@example.org', UserProfile.Role.REVIEWER)
        self.theirs = ReviewAssignment.objects.create(
            manuscript=self.manuscript, reviewer=self.other_reviewer, invited_by=self.editor,
            status=ReviewAssignment.Status.SUBMITTED, respond_by=timezone.now(), due_days=21,
        )
        self.submit(self.mine, timezone.now())
        self.submit(self.theirs, timezone.now())
        Review.objects.filter(assignment=self.theirs).update(confidential_to_editor='Secret for the editor')
        self.url = f'/api/manuscripts/{self.manuscript.id}/reviewer-outcome/'

    def decide(self):
        Decision.objects.create(manuscript=self.manuscript, type=Decision.Type.MAJOR,
                                letter='Dear Dr Author Name, ...', decided_by=self.editor)

    def test_hidden_until_decided(self):
        self.assertEqual(self.client.get(self.url).status_code, 404)

    def test_only_submitting_reviewers_may_look(self):
        self.decide()
        stranger = make_user('stranger@example.org', UserProfile.Role.REVIEWER)
        self.client.force_authenticate(stranger)
        self.assertEqual(self.client.get(self.url).status_code, 403)

        pending = make_user('pending@example.org', UserProfile.Role.REVIEWER)
        ReviewAssignment.objects.create(
            manuscript=self.manuscript, reviewer=pending, invited_by=self.editor,
            status=ReviewAssignment.Status.ACCEPTED, respond_by=timezone.now(), due_days=21,
        )
        self.client.force_authenticate(pending)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_shows_decision_and_anonymised_reports(self):
        self.decide()

        res = self.client.get(self.url)

        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body['decision']['type'], 'major')
        self.assertEqual([(r['label'], r['is_you']) for r in body['reviews']],
                         [('Reviewer 1', True), ('Reviewer 2', False)])
        raw = res.content.decode()
        for leaked in ('Dear Dr Author Name', 'Secret for the editor', 'other@example.org', 'letter'):
            self.assertNotIn(leaked, raw)

    def test_assignment_list_carries_the_decision(self):
        self.decide()
        row = next(r for r in self.client.get('/api/reviewer/assignments/').json() if r['id'] == self.mine.id)
        self.assertEqual(row['decision']['type'], 'major')


class OverdueKpiTests(ReviewerTestCase):
    def test_overdue_open_review_counts_as_late(self):
        on_time = self.assign('On time', status=ReviewAssignment.Status.SUBMITTED,
                              due_at=timezone.now() + timedelta(days=5))
        self.submit(on_time, timezone.now())
        self.assign('Overdue', status=ReviewAssignment.Status.ACCEPTED,
                    due_at=timezone.now() - timedelta(days=5))

        metrics = self.client.get('/api/reviewer/kpi/').json()['metrics']

        self.assertEqual(metrics['on_time_rate'], 50)
