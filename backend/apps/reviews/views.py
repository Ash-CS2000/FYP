from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.manuscripts.conflicts import authorship_block
from apps.notifications.models import Notification
from apps.users.permissions import IsReviewer

from .models import ReviewAssignment
from .notifications import (
    REVIEW_ACCEPTED_BODY, REVIEW_ACCEPTED_TITLE, REVIEW_DECLINED_BODY, REVIEW_DECLINED_TITLE,
    REVIEW_EXTENSION_REQUESTED_BODY, REVIEW_EXTENSION_REQUESTED_TITLE, REVIEW_RECUSED_BODY,
    REVIEW_RECUSED_TITLE,
)
from .serializers import (
    AcceptAssignmentSerializer, DeclineAssignmentSerializer, ExtensionRequestSerializer,
    RecuseAssignmentSerializer, ReviewerAssignmentSerializer,
)


class ReviewerAssignmentListView(generics.ListAPIView):
    """GET /api/reviewer/assignments/ — the caller's own assignments only."""
    serializer_class = ReviewerAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsReviewer]

    def get_queryset(self):
        return (
            ReviewAssignment.objects
            .filter(reviewer=self.request.user)
            .select_related('manuscript')
        )


def _get_own_assignment(request, pk):
    assignment = get_object_or_404(ReviewAssignment, pk=pk)
    if assignment.reviewer_id != request.user.id:
        return None
    return assignment


class ReviewAssignmentAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsReviewer]

    def post(self, request, pk):
        assignment = _get_own_assignment(request, pk)
        if assignment is None:
            return Response({'detail': 'Not your assignment.'}, status=status.HTTP_403_FORBIDDEN)
        if assignment.status != ReviewAssignment.Status.INVITED:
            return Response({'detail': 'You have already responded to this invitation.'}, status=status.HTTP_409_CONFLICT)
        if timezone.now() > assignment.respond_by:
            return Response({'detail': 'This invitation has expired.'}, status=status.HTTP_410_GONE)
        reason = authorship_block(assignment)
        if reason:
            return Response(
                {'detail': f'{reason} This invitation has been withdrawn.'}, status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AcceptAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            assignment.status = ReviewAssignment.Status.ACCEPTED
            assignment.coi_declared = data['coi_declared']
            assignment.coi_note = data['coi_note']
            assignment.responded_at = timezone.now()
            assignment.due_at = assignment.responded_at + timezone.timedelta(days=assignment.due_days)
            assignment.save()
            if assignment.invited_by_id:
                Notification.objects.create(
                    recipient_id=assignment.invited_by_id,
                    category=Notification.Category.REVIEW_RESPONSE,
                    title=REVIEW_ACCEPTED_TITLE,
                    body=REVIEW_ACCEPTED_BODY.format(
                        reviewer=request.user.get_full_name() or request.user.email,
                        title=assignment.manuscript.title,
                    ),
                    manuscript=assignment.manuscript,
                )

        return Response(ReviewerAssignmentSerializer(assignment).data)


class ReviewAssignmentDeclineView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsReviewer]

    def post(self, request, pk):
        assignment = _get_own_assignment(request, pk)
        if assignment is None:
            return Response({'detail': 'Not your assignment.'}, status=status.HTTP_403_FORBIDDEN)
        if assignment.status != ReviewAssignment.Status.INVITED:
            return Response({'detail': 'You have already responded to this invitation.'}, status=status.HTTP_409_CONFLICT)

        serializer = DeclineAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            assignment.status = ReviewAssignment.Status.DECLINED
            assignment.decline_reason = data['reason']
            assignment.decline_note = data['note']
            assignment.responded_at = timezone.now()
            assignment.save()
            if assignment.invited_by_id:
                Notification.objects.create(
                    recipient_id=assignment.invited_by_id,
                    category=Notification.Category.REVIEW_RESPONSE,
                    title=REVIEW_DECLINED_TITLE,
                    body=REVIEW_DECLINED_BODY.format(
                        reviewer=request.user.get_full_name() or request.user.email,
                        title=assignment.manuscript.title,
                    ),
                    manuscript=assignment.manuscript,
                )

        return Response(ReviewerAssignmentSerializer(assignment).data)


class ReviewAssignmentRecuseView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsReviewer]

    def post(self, request, pk):
        assignment = _get_own_assignment(request, pk)
        if assignment is None:
            return Response({'detail': 'Not your assignment.'}, status=status.HTTP_403_FORBIDDEN)
        if assignment.status != ReviewAssignment.Status.ACCEPTED:
            return Response(
                {'detail': 'Only an accepted review can be recused.'}, status=status.HTTP_409_CONFLICT,
            )

        serializer = RecuseAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.validated_data['note']

        with transaction.atomic():
            assignment.status = ReviewAssignment.Status.DECLINED
            assignment.decline_note = note
            assignment.recused_at = timezone.now()
            assignment.save()
            if assignment.invited_by_id:
                Notification.objects.create(
                    recipient_id=assignment.invited_by_id,
                    category=Notification.Category.REVIEW_RESPONSE,
                    title=REVIEW_RECUSED_TITLE,
                    body=REVIEW_RECUSED_BODY.format(
                        reviewer=request.user.get_full_name() or request.user.email,
                        title=assignment.manuscript.title,
                    ),
                    manuscript=assignment.manuscript,
                )

        return Response(ReviewerAssignmentSerializer(assignment).data)


class ReviewAssignmentExtensionRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsReviewer]

    def post(self, request, pk):
        assignment = _get_own_assignment(request, pk)
        if assignment is None:
            return Response({'detail': 'Not your assignment.'}, status=status.HTTP_403_FORBIDDEN)
        if assignment.extension_status == ReviewAssignment.ExtensionStatus.PENDING:
            return Response(
                {'detail': 'An extension request is already pending.'}, status=status.HTTP_409_CONFLICT,
            )

        serializer = ExtensionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            assignment.extension_requested_days = data['days']
            assignment.extension_reason = data['reason']
            assignment.extension_status = ReviewAssignment.ExtensionStatus.PENDING
            assignment.save()
            if assignment.invited_by_id:
                Notification.objects.create(
                    recipient_id=assignment.invited_by_id,
                    category=Notification.Category.REVIEW_EXTENSION,
                    title=REVIEW_EXTENSION_REQUESTED_TITLE,
                    body=REVIEW_EXTENSION_REQUESTED_BODY.format(
                        reviewer=request.user.get_full_name() or request.user.email,
                        days=data['days'],
                        title=assignment.manuscript.title,
                    ),
                    manuscript=assignment.manuscript,
                )

        return Response(ReviewerAssignmentSerializer(assignment).data)
