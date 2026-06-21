from django.urls import path

from .views import (
    MeView,
    RegisterView,
    LogoutView,
    OrcidAuthUrlView,
    OrcidCallbackView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', MeView.as_view(), name='me'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # ORCID
    path('orcid/url/', OrcidAuthUrlView.as_view(), name='orcid-url'),
    path('orcid/callback/', OrcidCallbackView.as_view(), name='orcid-callback'),
]