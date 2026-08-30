from django.urls import path

from .views import (
    ManuscriptDecisionView, ManuscriptDetailView, ManuscriptEditorListView, ManuscriptListView,
    ManuscriptUploadView, PlagiarismCheckStatusView,
)

urlpatterns = [
    path('upload/', ManuscriptUploadView.as_view(), name='manuscript-upload'),
    path('', ManuscriptListView.as_view(), name='manuscript-list'),
    path('editor/', ManuscriptEditorListView.as_view(), name='manuscript-editor-list'),
    path('<int:pk>/', ManuscriptDetailView.as_view(), name='manuscript-detail'),
    path('<int:pk>/plagiarism-status/', PlagiarismCheckStatusView.as_view(), name='manuscript-plagiarism-status'),
    path('<int:pk>/decision/', ManuscriptDecisionView.as_view(), name='manuscript-decision'),
]
