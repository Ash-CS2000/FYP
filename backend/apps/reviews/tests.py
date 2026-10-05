from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.manuscripts.models import Manuscript
from apps.users.models import UserProfile, UserRole

from .models import Review, ReviewAssignment

User = get_user_model()


def make_user(email, role):
    user = User.objects.create_user(username=email, email=email, password='pw-12345!')
    UserRole.objects.get_or_create(user=user, role=role, defaults={'status': UserRole.Status.ACTIVE})
    return user


class ReviewerWorkspaceTests(APITestCase):
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
