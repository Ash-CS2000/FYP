from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import EmailTokenObtainPairView, RegisterView

urlpatterns = [
    path('api/auth/login/', EmailTokenObtainPairView.as_view(), name='login'),
    path('api/auth/register/', RegisterView.as_view(), name='auth-register'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('api/users/', include('apps.users.urls')),
    path('api/manuscripts/', include('apps.manuscripts.urls')),
    # External research discovery (OpenAlex). Public, read-only, and
    # deliberately separate from api/manuscripts — nothing we published is
    # served from here, and nothing served from here has been peer-reviewed
    # by us.
    path('api/discover/', include('apps.discovery.urls')),
    path('api/reviewer/', include('apps.reviews.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/analysis/', include('apps.analysis.urls')),
    path('api/publications/', include('apps.publications.urls')),
    path('api/audit-logs/', include('apps.audit.urls')),
    path('api/system/', include('apps.system.urls')),
    path('api/assistant/', include('apps.assistant.urls')),
]

# See DJANGO_ADMIN_ENABLED in settings.py for why this is off by default.
if settings.DJANGO_ADMIN_ENABLED:
    urlpatterns.insert(0, path('admin/', admin.site.urls))
