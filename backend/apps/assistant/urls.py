from django.urls import path

from .views import (
    AdminAssistantChatView, AuthorAssistantChatView, EditorAssistantChatView, ReviewerAssistantChatView,
)

urlpatterns = [
    path('chat/', AuthorAssistantChatView.as_view(), name='assistant-chat'),
    path('reviewer-chat/', ReviewerAssistantChatView.as_view(), name='assistant-reviewer-chat'),
    path('editor-chat/', EditorAssistantChatView.as_view(), name='assistant-editor-chat'),
    path('admin-chat/', AdminAssistantChatView.as_view(), name='assistant-admin-chat'),
]
