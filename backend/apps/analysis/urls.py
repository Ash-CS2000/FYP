from django.urls import path

from .views import ScreeningSettingsView

urlpatterns = [
    path('screening-settings/', ScreeningSettingsView.as_view(), name='screening-settings'),
]
