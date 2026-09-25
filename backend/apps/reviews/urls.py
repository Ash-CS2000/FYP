from django.urls import path

from .views import (
    ReviewAssignmentAcceptView, ReviewAssignmentDeclineView, ReviewAssignmentExtensionRequestView,
    ReviewAssignmentRecuseView, ReviewerAssignmentListView, ReviewerKpiView,
)

urlpatterns = [
    path('assignments/', ReviewerAssignmentListView.as_view(), name='reviewer-assignment-list'),
    path('kpi/', ReviewerKpiView.as_view(), name='reviewer-kpi'),
    path('assignments/<int:pk>/accept/', ReviewAssignmentAcceptView.as_view(), name='reviewer-assignment-accept'),
    path('assignments/<int:pk>/decline/', ReviewAssignmentDeclineView.as_view(), name='reviewer-assignment-decline'),
    path('assignments/<int:pk>/recuse/', ReviewAssignmentRecuseView.as_view(), name='reviewer-assignment-recuse'),
    path('assignments/<int:pk>/extension/', ReviewAssignmentExtensionRequestView.as_view(), name='reviewer-assignment-extension'),
]
