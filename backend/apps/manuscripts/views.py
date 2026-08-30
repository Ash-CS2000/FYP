import logging

from botocore.exceptions import BotoCoreError, ClientError
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from apps.notifications.models import Notification

from .models import Decision, Manuscript, PlagiarismCheck
from .notifications import DECISION_NOTIFICATION_BODIES, DECISION_NOTIFICATION_TITLES
from .permissions import IsEditorOrAdmin, is_editor_or_admin
from .serializers import (
    DecisionCreateSerializer, DecisionSerializer, ManuscriptEditorSerializer, ManuscriptSerializer,
    ManuscriptSubmitSerializer,
)
from .services.noplag_client import add_to_corpus, get_check_status, get_check_report, NoPlagClientError

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

        return Response(DecisionSerializer(decision).data, status=status.HTTP_201_CREATED)


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
                        try:
                            add_to_corpus(manuscript)
                        except NoPlagClientError:
                            logger.exception('Adding completed manuscript to noplag corpus failed')
                elif 'fail' in raw_status or 'error' in raw_status:
                    check.status = PlagiarismCheck.Status.FAILED
                    check.error_message = status_result.get('error_message', '')
                    check.save()

        return Response({
            'status': check.status,
            'similarity_score': check.similarity_score,
            'error_message': check.error_message,
            'report': check.report,
        })
