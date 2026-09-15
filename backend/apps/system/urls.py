from django.urls import path

from .views import RevokeAllSessionsView, SignedInUsersView, SystemHealthView

urlpatterns = [
    path('health/', SystemHealthView.as_view(), name='system-health'),
    path('signed-in-users/', SignedInUsersView.as_view(), name='signed-in-users'),
    path('sessions/revoke-all/', RevokeAllSessionsView.as_view(), name='revoke-all-sessions'),
]
