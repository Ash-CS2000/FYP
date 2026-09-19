from django.urls import path

from .views import AuthorAssistantChatView

urlpatterns = [
    path('chat/', AuthorAssistantChatView.as_view(), name='assistant-chat'),
]
