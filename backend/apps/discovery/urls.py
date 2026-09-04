from django.urls import path

from .views import (
    FieldListView,
    FieldTopicListView,
    TopicWorkListView,
    WorkSearchView,
)

urlpatterns = [
    path('fields/', FieldListView.as_view(), name='discover-fields'),
    path('fields/<str:field_id>/topics/', FieldTopicListView.as_view(), name='discover-field-topics'),
    path('topics/<str:topic_id>/works/', TopicWorkListView.as_view(), name='discover-topic-works'),
    path('works/', WorkSearchView.as_view(), name='discover-work-search'),
]
