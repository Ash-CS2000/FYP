from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import EmailTokenObtainPairView, RegisterView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', EmailTokenObtainPairView.as_view(), name='login'),
    path('api/auth/register/', RegisterView.as_view(), name='auth-register'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('api/users/', include('apps.users.urls')),
    path('api/manuscripts/', include('apps.manuscripts.urls')),
    path('api/reviewer/', include('apps.reviews.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/analysis/', include('apps.analysis.urls')),
    path('api/publications/', include('apps.publications.urls')),
]
