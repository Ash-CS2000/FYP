import logging

from botocore.exceptions import BotoCoreError, ClientError
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.notifications.models import Notification
from apps.reviews.matching import compute_conflict, rank_candidates
from apps.reviews.models import Review, ReviewAssignment
from apps.reviews.notifications import (
    REVIEW_INVITE_BODY, REVIEW_INVITE_TITLE, REVIEW_REMINDER_BODY, REVIEW_REMINDER_TITLE,
    REVIEW_EXTENSION_GRANTED_BODY, REVIEW_EXTENSION_GRANTED_TITLE, REVIEW_EXTENSION_REFUSED_BODY,
    REVIEW_EXTENSION_REFUSED_TITLE, REVIEW_SUBMITTED_BODY, REVIEW_SUBMITTED_TITLE,
)
from apps.reviews.serializers import (
    AuthorReviewSerializer, InviteReviewersSerializer, ManuscriptAssignmentSerializer,
    ManuscriptForReviewerSerializer, ManuscriptReviewSerializer, ReviewCreateSerializer,
    reviewer_labels_for,
)
from apps.users.permissions import is_reviewer

from .models import Decision, Manuscript, PlagiarismCheck, ScreeningAction
from .notifications import (
    DECISION_NOTIFICATION_BODIES, DECISION_NOTIFICATION_TITLES, REVISION_SUBMITTED_NOTIFICATION_BODY,
    REVISION_SUBMITTED_NOTIFICATION_TITLE, SCREENING_NOTIFICATION_BODIES, SCREENING_NOTIFICATION_TITLES,
)
from .permissions import IsEditorOrAdmin, is_editor, is_editor_or_admin
from .serializers import (
    DecisionCreateSerializer, DecisionSerializer, ManuscriptEditorSerializer,
    ManuscriptRevisionCreateSerializer, ManuscriptRevisionSerializer, ManuscriptSerializer,
    ManuscriptSubmitSerializer, ScreeningActionCreateSerializer, ScreeningActionSerializer,
)
from .services.noplag_client import get_check_status, get_check_report, NoPlagClientError
from .services.plagiarism import sync_accepted_manuscript_to_corpus

logger = logging.getLogger(__name__)


class ManuscriptUploadView(APIView):
    """
    POST /api/manuscripts/upload/
    multipart/form-data — see ManuscriptSubmitSerializer for the full field list.
    Creates a Manuscript + its authors/affiliations/supplementary files, uploading
    files to Supabase Storage. Returns the created Manuscript (ManuscriptSerializer).
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [UserRateThrottle]

    def post(self, request):
        serializer = ManuscriptSubmitSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save()
        except (BotoCoreError, ClientError):
            logger.exception('Manuscript file upload to storage failed')
            return Response(
                {'detail': 'Could not upload your files. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ManuscriptListView(generics.ListAPIView):
    """
    GET /api/manuscripts/ → list the authenticated user's own submissions.
    """
    serializer_class = ManuscriptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Manuscript.objects.filter(owner=self.request.user).order_by('-submitted_at')


class ManuscriptDetailView(generics.RetrieveAPIView):
    """
    GET /api/manuscripts/<int:pk>/ → retrieve one of the authenticated user's own
    submissions, or any submission if the caller is an editor/admin.
    """
    serializer_class = ManuscriptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if is_editor_or_admin(self.request.user):
            return Manuscript.objects.all()
        return Manuscript.objects.filter(owner=self.request.user)


class ManuscriptEditorListView(generics.ListAPIView):
    """
    GET /api/manuscripts/editor/ → list every manuscript, any owner.
    Editor/admin only.
    """
    serializer_class = ManuscriptEditorSerializer
    permission_classes = [permissions.IsAuthenticated, IsEditorOrAdmin]

    def get_queryset(self):
        return (
            Manuscript.objects
            .select_related('owner', 'plagiarism_check')
            .prefetch_related('decisions')
            .order_by('-submitted_at')
        )


class ManuscriptDecisionView(APIView):
    """
    GET  /api/manuscripts/<int:pk>/decision/ → the latest Decision on this
    manuscript, if any. Readable by the editor/admin or the manuscript's owner.
    POST /api/manuscripts/<int:pk>/decision/ → record a decision. Editor/admin
    only. Updates Manuscript.status and creates a Notification for the owner.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        manuscript = get_object_or_404(Manuscript, pk=pk)
        if not (is_editor_or_admin(request.user) or manuscript.owner_id == request.user.id):
            return Response({'detail': 'You may not view this manuscript.'}, status=status.HTTP_403_FORBIDDEN)
        decision = manuscript.decisions.first()
        if decision is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(DecisionSerializer(decision).data)

    def post(self, request, pk):
        if not is_editor_or_admin(request.user):
            return Response(
                {'detail': 'You do not have permission to record a decision.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        manuscript = get_object_or_404(Manuscript, pk=pk)

        if manuscript.status == Manuscript.Status.REVISIONS_REQUESTED:
            return Response(
                {'detail': 'This manuscript is awaiting the author\'s revision — a new decision cannot be recorded yet.'},
                status=status.HTTP_409_CONFLICT,
            )
        if manuscript.status in (Manuscript.Status.ACCEPTED, Manuscript.Status.REJECTED, Manuscript.Status.PUBLISHED):
            return Response(
                {'detail': 'This manuscript already has a final decision.'},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = DecisionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Matches the frontend's own definition of "has reviews" (DecisionPanel's
        # hasReviewers: counts invitations, not submitted reviews — the moment
        # anyone has been asked, "rejected without troubling a reviewer" is no
        # longer true). The UI already hides desk-reject once an invitation
        # exists; this makes the server agree instead of silently allowing it.
        if data['type'] == Decision.Type.DESK_REJECT and manuscript.review_assignments.exists():
            return Response(
                {'detail': 'This manuscript already has reviewers involved and cannot be desk rejected.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        with transaction.atomic():
            decision = Decision.objects.create(manuscript=manuscript, decided_by=request.user, **data)
            manuscript.status = Decision.STATUS_MAP[data['type']]
            manuscript.save(update_fields=['status', 'updated_at'])
            Notification.objects.create(
                recipient=manuscript.owner,
                category=Notification.Category.DECISION,
                title=DECISION_NOTIFICATION_TITLES[data['type']],
                body=DECISION_NOTIFICATION_BODIES[data['type']].format(title=manuscript.title),
                manuscript=manuscript,
            )

        # An accepted paper becomes prior art for future checks. Deferred to
        # here rather than check-completion so a revise-and-resubmit is never
        # scored against the author's own earlier draft. Best-effort.
        if data['type'] == Decision.Type.ACCEPT:
            sync_accepted_manuscript_to_corpus(manuscript)

        return Response(DecisionSerializer(decision).data, status=status.HTTP_201_CREATED)


class ManuscriptDecisionHistoryView(generics.ListAPIView):
    """
    GET /api/manuscripts/<int:pk>/decisions/ → every Decision on this
    manuscript, newest first. Readable by the editor/admin or the
    manuscript's owner.
    """
    serializer_class = DecisionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        manuscript = get_object_or_404(Manuscript, pk=self.kwargs['pk'])
        if not (is_editor_or_admin(self.request.user) or manuscript.owner_id == self.request.user.id):
            raise PermissionDenied('You may not view this manuscript.')
        return manuscript.decisions.all()


class ManuscriptRevisionView(APIView):
    """
    GET  /api/manuscripts/<int:pk>/revision/ → every ManuscriptRevision on
    this manuscript, newest first. Readable by the editor/admin or the
    manuscript's owner.
    POST /api/manuscripts/<int:pk>/revision/ → the owner uploads a revised
    file (multipart/form-data: manuscript file, optional response_letter).
    Only allowed while the manuscript is awaiting a revision. Repoints the
    manuscript's file, flips its status back to under_review, and notifies
    the editor who requested the revision.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [UserRateThrottle]

    def get(self, request, pk):
        manuscript = get_object_or_404(Manuscript, pk=pk)
        if not (is_editor_or_admin(request.user) or manuscript.owner_id == request.user.id):
            return Response({'detail': 'You may not view this manuscript.'}, status=status.HTTP_403_FORBIDDEN)
        revisions = manuscript.revisions.all()
        return Response(ManuscriptRevisionSerializer(revisions, many=True).data)

    def post(self, request, pk):
        manuscript = get_object_or_404(Manuscript, pk=pk)
        if manuscript.owner_id != request.user.id:
            return Response(
                {'detail': 'You do not have permission to revise this manuscript.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if manuscript.status != Manuscript.Status.REVISIONS_REQUESTED:
            return Response(
                {'detail': 'This manuscript is not awaiting a revision.'},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = ManuscriptRevisionCreateSerializer(data=request.data, context={'manuscript': manuscript})
        serializer.is_valid(raise_exception=True)
        revision = serializer.save()

        previous_decision = manuscript.decisions.first()
        if previous_decision and previous_decision.decided_by_id:
            Notification.objects.create(
                recipient=previous_decision.decided_by,
                category=Notification.Category.REVISION_SUBMITTED,
                title=REVISION_SUBMITTED_NOTIFICATION_TITLE,
                body=REVISION_SUBMITTED_NOTIFICATION_BODY.format(title=manuscript.title),
                manuscript=manuscript,
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PlagiarismCheckStatusView(APIView):
    """
    GET /api/manuscripts/<int:pk>/plagiarism-status/
    Lazily polls the noplag engine (no background worker) and returns current status.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        queryset = Manuscript.objects.all() if is_editor_or_admin(request.user) else Manuscript.objects.filter(owner=request.user)
        manuscript = get_object_or_404(queryset, pk=pk)
        check = getattr(manuscript, 'plagiarism_check', None)
        if check is None:
            return Response(
                {'detail': 'No plagiarism check found for this manuscript.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if check.status == PlagiarismCheck.Status.PENDING and check.check_id:
            try:
                status_result = get_check_status(check.check_id)
            except NoPlagClientError:
                logger.exception('Polling noplag check status failed')
            else:
                raw_status = (status_result.get('status') or '').lower()
                if 'complete' in raw_status or 'done' in raw_status:
                    try:
                        report = get_check_report(check.check_id)
                    except NoPlagClientError:
                        logger.exception('Fetching noplag check report failed')
                    else:
                        check.status = PlagiarismCheck.Status.COMPLETED
                        check.similarity_score = report.get('overall_similarity_pct')
                        check.report = report
                        check.save()
                elif 'fail' in raw_status or 'error' in raw_status:
                    check.status = PlagiarismCheck.Status.FAILED
                    check.error_message = status_result.get('error_message', '')
                    check.save()

        return Response({
            'status': check.status,
            'similarity_score': check.similarity_score,
            'error_message': check.error_message,
            'checked_at': check.checked_at,
            'report': check.report,
        })


class ManuscriptScreeningView(APIView):
    """
    GET  /api/manuscripts/<int:pk>/screening/ → the ScreeningAction on this
    manuscript, if any. Editor/admin only (oversight) — same audience as the
    similarity report page.
    POST /api/manuscripts/<int:pk>/screening/ → record 'allow' or 'return' on
    a flagged similarity report. Editor only — unlike a decision, an admin
    must not be able to do this by hand. Not a decision: does not touch
    Manuscript.status. Notifies the manuscript's owner.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if not is_editor_or_admin(request.user):
            return Response({'detail': 'You may not view this manuscript.'}, status=status.HTTP_403_FORBIDDEN)
        manuscript = get_object_or_404(Manuscript, pk=pk)
        screening = getattr(manuscript, 'screening_action', None)
        if screening is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ScreeningActionSerializer(screening).data)

    def post(self, request, pk):
        if not is_editor(request.user):
            return Response(
                {'detail': 'You do not have permission to act on a screening flag.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        manuscript = get_object_or_404(Manuscript, pk=pk)

        check = getattr(manuscript, 'plagiarism_check', None)
        if check is None:
            return Response(
                {'detail': 'No similarity report exists for this manuscript.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if check.status != PlagiarismCheck.Status.COMPLETED:
            return Response(
                {'detail': 'The similarity report is not ready yet.'},
                status=status.HTTP_409_CONFLICT,
            )
        if getattr(manuscript, 'screening_action', None) is not None:
            return Response(
                {'detail': 'A screening outcome is already recorded for this manuscript.'},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = ScreeningActionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            screening = ScreeningAction.objects.create(manuscript=manuscript, acted_by=request.user, **data)
            Notification.objects.create(
                recipient=manuscript.owner,
                category=Notification.Category.SCREENING,
                title=SCREENING_NOTIFICATION_TITLES[data['action']],
                body=SCREENING_NOTIFICATION_BODIES[data['action']].format(title=manuscript.title),
                manuscript=manuscript,
            )

        return Response(ScreeningActionSerializer(screening).data, status=status.HTTP_201_CREATED)


class ManuscriptReviewerCandidatesView(APIView):
    """
    GET /api/manuscripts/<int:pk>/reviewer-candidates/ → every active
    reviewer, ranked by specialty-tag overlap. Editor/admin only.
    """
    permission_classes = [permissions.IsAuthenticated, IsEditorOrAdmin]

    def get(self, request, pk):
        manuscript = get_object_or_404(Manuscript, pk=pk)
        return Response(rank_candidates(manuscript))


class ManuscriptAssignmentListCreateView(APIView):
    """
    GET  /api/manuscripts/<int:pk>/assignments/ → who is currently invited to
    or reviewing this manuscript. Editor/admin only.
    POST /api/manuscripts/<int:pk>/assignments/ → invite reviewers. Editor
    only — unlike a decision, an admin must not be able to do this by hand.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if not is_editor_or_admin(request.user):
            return Response({'detail': 'You may not view this manuscript.'}, status=status.HTTP_403_FORBIDDEN)
        manuscript = get_object_or_404(Manuscript, pk=pk)
        rows = manuscript.review_assignments.select_related('reviewer').all()
        return Response(ManuscriptAssignmentSerializer(rows, many=True).data)

    def post(self, request, pk):
        if not is_editor(request.user):
            return Response(
                {'detail': 'You do not have permission to invite reviewers.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        manuscript = get_object_or_404(Manuscript, pk=pk)

        serializer = InviteReviewersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        reviewer_ids = data['reviewer_ids']

        already_assigned = set(
            manuscript.review_assignments.filter(reviewer_id__in=reviewer_ids).values_list('reviewer_id', flat=True)
        )
        if already_assigned:
            return Response(
                {'detail': 'One or more of these reviewers is already assigned to this manuscript.'},
                status=status.HTTP_409_CONFLICT,
            )

        User = get_user_model()
        reviewers = list(User.objects.filter(pk__in=reviewer_ids).select_related('profile'))
        if not data['force']:
            conflicted = [u for u in reviewers if compute_conflict(manuscript, u)]
            if conflicted:
                return Response(
                    {'detail': 'One or more reviewers have a recorded conflict and were not force-overridden.'},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

        respond_by = timezone.now() + timezone.timedelta(days=data['respond_by_days'])
        created = []
        with transaction.atomic():
            for reviewer in reviewers:
                assignment = ReviewAssignment.objects.create(
                    manuscript=manuscript,
                    reviewer=reviewer,
                    invited_by=request.user,
                    respond_by=respond_by,
                    due_days=data['due_days'],
                )
                created.append(assignment)
                Notification.objects.create(
                    recipient=reviewer,
                    category=Notification.Category.REVIEW_INVITE,
                    title=REVIEW_INVITE_TITLE,
                    body=REVIEW_INVITE_BODY.format(
                        title=manuscript.title, respond_by=respond_by.strftime('%d %b %Y'),
                    ),
                    manuscript=manuscript,
                )

        return Response(ManuscriptAssignmentSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


class ManuscriptAssignmentRemindView(APIView):
    """
    POST /api/manuscripts/<int:pk>/assignments/<assignment_id>/remind/
    Editor-only. 409 if reminded within the last 24h.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, assignment_id):
        if not is_editor(request.user):
            return Response({'detail': 'You do not have permission to send reminders.'}, status=status.HTTP_403_FORBIDDEN)
        assignment = get_object_or_404(ReviewAssignment, pk=assignment_id, manuscript_id=pk)

        if assignment.reminded_at and timezone.now() - assignment.reminded_at < timezone.timedelta(hours=24):
            return Response(
                {'detail': 'A reminder was already sent within the last 24 hours.'},
                status=status.HTTP_409_CONFLICT,
            )

        assignment.reminded_at = timezone.now()
        assignment.save(update_fields=['reminded_at'])
        Notification.objects.create(
            recipient=assignment.reviewer,
            category=Notification.Category.REVIEW_INVITE,
            title=REVIEW_REMINDER_TITLE,
            body=REVIEW_REMINDER_BODY.format(title=assignment.manuscript.title),
            manuscript=assignment.manuscript,
        )
        return Response({'reminded_at': assignment.reminded_at})


class ManuscriptAssignmentExtensionDecideView(APIView):
    """
    PATCH /api/manuscripts/<int:pk>/assignments/<assignment_id>/extension/
    body {status: 'granted'|'refused'}. Editor-only.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk, assignment_id):
        if not is_editor(request.user):
            return Response({'detail': 'You do not have permission to decide on an extension.'}, status=status.HTTP_403_FORBIDDEN)
        assignment = get_object_or_404(ReviewAssignment, pk=assignment_id, manuscript_id=pk)

        if assignment.extension_status != ReviewAssignment.ExtensionStatus.PENDING:
            return Response({'detail': 'No pending extension request.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if new_status not in (ReviewAssignment.ExtensionStatus.GRANTED, ReviewAssignment.ExtensionStatus.REFUSED):
            return Response({'detail': "status must be 'granted' or 'refused'."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            assignment.extension_status = new_status
            if new_status == ReviewAssignment.ExtensionStatus.GRANTED and assignment.due_at:
                assignment.due_at = assignment.due_at + timezone.timedelta(days=assignment.extension_requested_days)
            assignment.save()
            Notification.objects.create(
                recipient=assignment.reviewer,
                category=Notification.Category.REVIEW_EXTENSION,
                title=REVIEW_EXTENSION_GRANTED_TITLE if new_status == ReviewAssignment.ExtensionStatus.GRANTED else REVIEW_EXTENSION_REFUSED_TITLE,
                body=(REVIEW_EXTENSION_GRANTED_BODY if new_status == ReviewAssignment.ExtensionStatus.GRANTED else REVIEW_EXTENSION_REFUSED_BODY).format(
                    title=assignment.manuscript.title,
                ),
                manuscript=assignment.manuscript,
            )

        return Response(ManuscriptAssignmentSerializer(assignment).data)


class ManuscriptReviewListCreateView(APIView):
    """
    GET  /api/manuscripts/<int:pk>/reviews/ → one row per ReviewAssignment
    with status accepted/submitted, review content null until submitted.
    Editor/admin only.
    POST /api/manuscripts/<int:pk>/reviews/ → the calling reviewer submits
    their review. Only for their own accepted assignment on this manuscript.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if not is_editor_or_admin(request.user):
            return Response({'detail': 'You may not view this manuscript.'}, status=status.HTTP_403_FORBIDDEN)
        manuscript = get_object_or_404(Manuscript, pk=pk)
        rows = (
            manuscript.review_assignments
            .filter(status__in=[ReviewAssignment.Status.ACCEPTED, ReviewAssignment.Status.SUBMITTED])
            .select_related('review')
        )
        labels = reviewer_labels_for(manuscript)
        return Response(ManuscriptReviewSerializer(rows, many=True, context={'labels': labels}).data)

    def post(self, request, pk):
        if not is_reviewer(request.user):
            return Response({'detail': 'You do not have permission to submit a review.'}, status=status.HTTP_403_FORBIDDEN)
        manuscript = get_object_or_404(Manuscript, pk=pk)

        assignment = ReviewAssignment.objects.filter(manuscript=manuscript, reviewer=request.user).first()
        if assignment is None:
            return Response(
                {'detail': 'You do not have an assignment on this manuscript.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if getattr(assignment, 'review', None) is not None:
            return Response({'detail': 'You have already submitted this review.'}, status=status.HTTP_409_CONFLICT)
        if assignment.status != ReviewAssignment.Status.ACCEPTED:
            return Response(
                {'detail': 'You do not have an accepted assignment on this manuscript.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            review = Review.objects.create(assignment=assignment, **data)
            assignment.status = ReviewAssignment.Status.SUBMITTED
            assignment.save(update_fields=['status'])
            if assignment.invited_by_id:
                Notification.objects.create(
                    recipient_id=assignment.invited_by_id,
                    category=Notification.Category.REVIEW_SUBMITTED,
                    title=REVIEW_SUBMITTED_TITLE,
                    body=REVIEW_SUBMITTED_BODY.format(
                        reviewer=request.user.get_full_name() or request.user.email,
                        title=manuscript.title,
                    ),
                    manuscript=manuscript,
                )

        labels = reviewer_labels_for(manuscript)
        return Response(
            ManuscriptReviewSerializer(assignment, context={'labels': labels}).data,
            status=status.HTTP_201_CREATED,
        )


class ManuscriptAuthorReviewsView(APIView):
    """
    GET /api/manuscripts/<int:pk>/reviews/author/ → the reviews an author is
    permitted to read on their own manuscript. 404 until a decision exists —
    reviews are released to the author only once one does, never before.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        manuscript = get_object_or_404(Manuscript, pk=pk)
        if manuscript.owner_id != request.user.id:
            return Response({'detail': 'You may not view this manuscript.'}, status=status.HTTP_403_FORBIDDEN)
        if not manuscript.decisions.exists():
            return Response(status=status.HTTP_404_NOT_FOUND)

        reviews = Review.objects.filter(
            assignment__manuscript=manuscript, assignment__status=ReviewAssignment.Status.SUBMITTED,
        ).select_related('assignment')
        labels = reviewer_labels_for(manuscript)
        return Response(AuthorReviewSerializer(reviews, many=True, context={'labels': labels}).data)


class ManuscriptReviewerViewView(APIView):
    """
    GET /api/manuscripts/<int:pk>/reviewer-view/ → the manuscript content a
    reviewer is permitted to read: title/abstract/category/file, nothing
    that identifies the author. Accepted or already-submitted only (a
    reviewer who has submitted may still want to reference the manuscript —
    matches AssignmentGate.jsx, which only ever blocked 'invited'/'declined').
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        manuscript = get_object_or_404(Manuscript, pk=pk)
        has_access = ReviewAssignment.objects.filter(
            manuscript=manuscript, reviewer=request.user,
            status__in=[ReviewAssignment.Status.ACCEPTED, ReviewAssignment.Status.SUBMITTED],
        ).exists()
        if not has_access:
            return Response({'detail': 'You may not view this manuscript.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(ManuscriptForReviewerSerializer(manuscript).data)
