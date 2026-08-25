import logging

from botocore.exceptions import BotoCoreError, ClientError
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Manuscript, PlagiarismCheck
from .serializers import ManuscriptSerializer, ManuscriptSubmitSerializer
from .services.noplag_client import get_check_status, get_check_report, NoPlagClientError

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
    GET /api/manuscripts/<int:pk>/ → retrieve one of the authenticated user's own submissions.
    """
    serializer_class = ManuscriptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Manuscript.objects.filter(owner=self.request.user)

class PlagiarismCheckStatusView(APIView):
    """
    GET /api/manuscripts/<int:pk>/plagiarism-status/
    Lazily polls the noplag engine (no background worker) and returns current status.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        manuscript = get_object_or_404(Manuscript.objects.filter(owner=request.user), pk=pk)
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
            'report': check.report,
        })