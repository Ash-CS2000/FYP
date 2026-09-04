import logging

from botocore.exceptions import BotoCoreError, ClientError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from apps.notifications.models import Notification

from .models import Decision, Manuscript, PlagiarismCheck, ScreeningAction
from .notifications import (
    DECISION_NOTIFICATION_BODIES, DECISION_NOTIFICATION_TITLES, PUBLICATION_NOTIFICATION_BODY,
    PUBLICATION_NOTIFICATION_TITLE, REVISION_SUBMITTED_NOTIFICATION_BODY,
    REVISION_SUBMITTED_NOTIFICATION_TITLE, SCREENING_NOTIFICATION_BODIES, SCREENING_NOTIFICATION_TITLES,
)
from .permissions import IsEditorOrAdmin, is_editor, is_editor_or_admin
from .serializers import (
    DecisionCreateSerializer, DecisionSerializer, ManuscriptEditorSerializer,
    ManuscriptRevisionCreateSerializer, ManuscriptRevisionSerializer, ManuscriptSerializer,
    ManuscriptSubmitSerializer, PublishedManuscriptSerializer, ScreeningActionCreateSerializer,
    ScreeningActionSerializer,
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


class PublishedManuscriptListView(generics.ListAPIView):
    """
    GET /api/manuscripts/published/ → the published corpus, newest first.

    The only unauthenticated endpoint in this app. It backs the author's
    Discover page, the public /search results and the landing page, all three of
    which are reachable logged out — hence AllowAny, which has to be stated
    because DEFAULT_PERMISSION_CLASSES is IsAuthenticated.

    'published' only. An accepted manuscript has cleared review but has not been
    released, and a discovery surface that shows it leaks the paper early.

    Query params, all optional:
      q         substring over title / abstract / keywords / author institution
      category  exact match on Manuscript.category
      limit     1..100, applied after filtering
    """
    serializer_class = PublishedManuscriptSerializer
    permission_classes = [permissions.AllowAny]
    # No authentication at all, not merely optional. A token buys nothing here,
    # and DRF authenticates before it checks permissions — so with JWT auth left
    # on, a visitor carrying an expired token would get a 401 from a page that
    # is supposed to be public. Empty list, no such failure mode.
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'discovery'

    # Nothing paginates in this project and adding a global page size would
    # reshape every existing list response, so the ceiling is a hard slice.
    # Revisit when the corpus outgrows it.
    MAX_RESULTS = 200

    def get_queryset(self):
        # prefetch is load-bearing, not an optimisation: the serializer walks
        # authors → affiliations on every row, so without it this is an N+1 on
        # the one endpoint anonymous traffic can reach.
        queryset = (
            Manuscript.objects
            .filter(status=Manuscript.Status.PUBLISHED)
            .prefetch_related('authors__affiliations')
            .order_by('-published_at', '-id')  # -id keeps the ordering total
        )

        params = self.request.query_params

        term = params.get('q', '').strip()
        if term:
            queryset = queryset.filter(
                Q(title__icontains=term)
                | Q(abstract__icontains=term)
                | Q(keywords__icontains=term)
                | Q(authors__affiliations__institution__icontains=term)
            ).distinct()  # the affiliation join fans a manuscript out per match

        category = params.get('category', '').strip()
        if category:
            queryset = queryset.filter(category=category)

        return queryset[:self._limit(params.get('limit'))]

    def _limit(self, raw):
        if raw is None:
            return self.MAX_RESULTS
        try:
            return max(1, min(int(raw), self.MAX_RESULTS))
        except (TypeError, ValueError):
            return self.MAX_RESULTS


class PublishedCategoryListView(APIView):
    """
    GET /api/manuscripts/published/categories/ → every research category that
    has at least one published paper, A-Z. A bare string[].

    Its own endpoint rather than something the client derives from a filtered
    list: once the caller filters by category the response contains only that
    category, so a dropdown built from the rows would collapse to the single
    option the user just picked.

    Derived from the data, never hardcoded — the seeded corpus and the
    submission form's category <select> do not agree, so any vocabulary written
    down in the frontend would be wrong on day one. 'All' is not in here; that
    is a UI sentinel, not a category.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'discovery'

    def get(self, request):
        categories = (
            Manuscript.objects
            .filter(status=Manuscript.Status.PUBLISHED)
            .exclude(category='')
            .order_by('category')
            .values_list('category', flat=True)
            .distinct()
        )
        return Response(list(categories))


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

        # TODO(reviews-app): the frontend spec also calls for a 422 when
        # desk-rejecting a manuscript that already has reviews, but apps.reviews
        # has no model yet — nothing to check against server-side until it does.

        serializer = DecisionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

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


class ManuscriptPublishView(APIView):
    """
    POST /api/manuscripts/<int:pk>/publish/ → release an accepted manuscript to
    the public discovery surface. accepted → published.

    Until this existed, 'published' was a status the system could describe and
    never reach: Decision.STATUS_MAP tops out at 'accepted', and nothing else
    wrote the value. Acceptance is the editorial verdict; publication is the
    separate act of releasing it, and only this endpoint performs it.

    Editor only — an admin must be refused, same boundary ManuscriptScreeningView
    draws. Publication is editorial judgement, not platform administration.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not is_editor(request.user):
            return Response(
                {'detail': 'You do not have permission to publish a manuscript.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        manuscript = get_object_or_404(Manuscript, pk=pk)

        # Covers both directions of wrong state: not yet accepted, and already
        # published. Matches how ManuscriptDecisionView refuses a transition.
        if manuscript.status != Manuscript.Status.ACCEPTED:
            return Response(
                {'detail': f'Only an accepted manuscript can be published — this one is {manuscript.status}.'},
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            manuscript.status = Manuscript.Status.PUBLISHED
            manuscript.published_at = timezone.now()
            manuscript.save(update_fields=['status', 'published_at', 'updated_at'])
            Notification.objects.create(
                recipient=manuscript.owner,
                category=Notification.Category.PUBLICATION,
                title=PUBLICATION_NOTIFICATION_TITLE,
                body=PUBLICATION_NOTIFICATION_BODY.format(title=manuscript.title),
                manuscript=manuscript,
            )

        return Response({
            'id': manuscript.id,
            'status': manuscript.status,
            'published_at': manuscript.published_at,
        })
