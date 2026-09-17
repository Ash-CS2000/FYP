from django.urls import path

from .views import SuggestTagsView

urlpatterns = [
    path('suggest-tags/', SuggestTagsView.as_view(), name='matching-suggest-tags'),
]
