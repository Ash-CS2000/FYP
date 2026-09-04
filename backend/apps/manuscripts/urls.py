from django.urls import path

from .views import (
    ManuscriptAssignmentExtensionDecideView, ManuscriptAssignmentListCreateView, ManuscriptAssignmentRemindView,
    ManuscriptAuthorReviewsView, ManuscriptDecisionHistoryView, ManuscriptDecisionView, ManuscriptDetailView,
    ManuscriptEditorListView, ManuscriptListView, ManuscriptPublishView, ManuscriptRevisionView,
    ManuscriptReviewerCandidatesView, ManuscriptReviewerViewView, ManuscriptReviewListCreateView,
    ManuscriptScreeningView, ManuscriptUploadView, PlagiarismCheckStatusView,
    PublishedCategoryListView, PublishedManuscriptListView,
)

urlpatterns = [
    path('upload/', ManuscriptUploadView.as_view(), name='manuscript-upload'),
    path('', ManuscriptListView.as_view(), name='manuscript-list'),
    path('editor/', ManuscriptEditorListView.as_view(), name='manuscript-editor-list'),
    # Above <int:pk>/ so the literal segment is never read as a pk.
    path('published/', PublishedManuscriptListView.as_view(), name='manuscript-published-list'),
    path('published/categories/', PublishedCategoryListView.as_view(), name='manuscript-published-categories'),
    path('<int:pk>/', ManuscriptDetailView.as_view(), name='manuscript-detail'),
    path('<int:pk>/publish/', ManuscriptPublishView.as_view(), name='manuscript-publish'),
    path('<int:pk>/plagiarism-status/', PlagiarismCheckStatusView.as_view(), name='manuscript-plagiarism-status'),
    path('<int:pk>/decision/', ManuscriptDecisionView.as_view(), name='manuscript-decision'),
    path('<int:pk>/decisions/', ManuscriptDecisionHistoryView.as_view(), name='manuscript-decision-history'),
    path('<int:pk>/revision/', ManuscriptRevisionView.as_view(), name='manuscript-revision'),
    path('<int:pk>/screening/', ManuscriptScreeningView.as_view(), name='manuscript-screening'),
    path('<int:pk>/reviewer-candidates/', ManuscriptReviewerCandidatesView.as_view(), name='manuscript-reviewer-candidates'),
    path('<int:pk>/assignments/', ManuscriptAssignmentListCreateView.as_view(), name='manuscript-assignment-list-create'),
    path('<int:pk>/assignments/<int:assignment_id>/remind/', ManuscriptAssignmentRemindView.as_view(), name='manuscript-assignment-remind'),
    path('<int:pk>/assignments/<int:assignment_id>/extension/', ManuscriptAssignmentExtensionDecideView.as_view(), name='manuscript-assignment-extension-decide'),
    path('<int:pk>/reviews/', ManuscriptReviewListCreateView.as_view(), name='manuscript-review-list-create'),
    path('<int:pk>/reviews/author/', ManuscriptAuthorReviewsView.as_view(), name='manuscript-author-reviews'),
    path('<int:pk>/reviewer-view/', ManuscriptReviewerViewView.as_view(), name='manuscript-reviewer-view'),
]
