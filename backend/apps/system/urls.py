from django.urls import path

from .views import (
    AttentionView, EditorialOverviewView, RevokeAllSessionsView, SignedInUsersView, SystemHealthView,
)

urlpatterns = [
    path('editorial-overview/', EditorialOverviewView.as_view(), name='editorial-overview'),
    path('attention/', AttentionView.as_view(), name='system-attention'),
    path('health/', SystemHealthView.as_view(), name='system-health'),
    path('signed-in-users/', SignedInUsersView.as_view(), name='signed-in-users'),
    path('sessions/revoke-all/', RevokeAllSessionsView.as_view(), name='revoke-all-sessions'),
]
