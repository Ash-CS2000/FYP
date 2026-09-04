from django.urls import path

from .views import (
    AvatarRedirectView,
    AvatarView,
    ChangePasswordView,
    MeView,
    RegisterView,
    LogoutView,
    OrcidAuthUrlView,
    OrcidCallbackView,
    ApplyReviewerView,
    ReviewerApprovalView,
    EditorOnboardView,
    EditorInviteDetailView,
    EditorInviteView,
    AdminUserListView,
    AdminUserStatusView,
)

urlpatterns = [
    path('', AdminUserListView.as_view(), name='user-list'),
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', MeView.as_view(), name='me'),
    path('me/password/', ChangePasswordView.as_view(), name='change-password'),
    path('me/avatar/', AvatarView.as_view(), name='my-avatar'),

    # Public: an <img> tag cannot send an Authorization header, so the photo
    # is served by redirect to a freshly presigned URL. See AvatarRedirectView.
    path('<int:pk>/avatar/', AvatarRedirectView.as_view(), name='user-avatar'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Reviewer application
    path('apply-reviewer/', ApplyReviewerView.as_view(), name='apply-reviewer'),
    path('<int:pk>/reviewer-status/', ReviewerApprovalView.as_view(), name='reviewer-status'),
    path('<int:pk>/status/', AdminUserStatusView.as_view(), name='user-status'),

    # Editor onboarding
    path('editors/', EditorOnboardView.as_view(), name='editor-onboard'),
    path('editors/<int:invite_id>/', EditorInviteDetailView.as_view(), name='editor-invite-detail'),
    path('editor-invite/<str:token>/', EditorInviteView.as_view(), name='editor-invite'),

    # ORCID
    path('orcid/url/', OrcidAuthUrlView.as_view(), name='orcid-url'),
    path('orcid/callback/', OrcidCallbackView.as_view(), name='orcid-callback'),
]