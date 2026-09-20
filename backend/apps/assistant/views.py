"""
Gemini-backed chatbots, one per workspace: Author, Reviewer, Editor and Admin
Assistant. They share the request handling below and differ only in who may
call them and what goes into the system prompt (see contexts.py).

Stateless and session-only by design: nothing here is stored. The frontend
keeps the conversation in memory and resends recent history each turn; a page
refresh clears it. See gemini_client.py for the actual Gemini call.
"""
import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.manuscripts.permissions import IsEditor
from apps.users.permissions import IsAdmin, IsAuthor, IsReviewer

from . import contexts
from .gemini_client import GeminiError, chat

logger = logging.getLogger(__name__)

# However long the frontend's in-memory history grows, only the most recent
# turns are sent — keeps token spend (and the shared free-tier quota) bounded.
MAX_HISTORY_TURNS = 12
MAX_MESSAGE_CHARS = 4000


def _to_gemini_turns(messages):
    """Map our {role: user|assistant, content} history onto Gemini's contents shape."""
    turns = []
    for msg in messages[-MAX_HISTORY_TURNS:]:
        role = msg.get('role')
        content = (msg.get('content') or '').strip()[:MAX_MESSAGE_CHARS]
        if role not in ('user', 'assistant') or not content:
            continue
        turns.append({
            'role': 'model' if role == 'assistant' else 'user',
            'parts': [{'text': content}],
        })
    return turns


class AssistantChatView(APIView):
    """
    POST /api/assistant/chat/            (authors)
    POST /api/assistant/reviewer-chat/   (reviewers)
    POST /api/assistant/editor-chat/     (editors)
    POST /api/assistant/admin-chat/      (admins)
    Body: {"messages": [{"role": "user" | "assistant", "content": "..."}, ...]}
    200  {"reply": "..."}
    400  empty/invalid message history
    403  caller does not hold the role this assistant is for
    502  Gemini unreachable, unconfigured, or blocked the prompt

    Subclasses set `permission_classes` and `instruction`.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'assistant'

    @staticmethod
    def instruction(user):
        raise NotImplementedError

    def post(self, request):
        messages = request.data.get('messages')
        if not isinstance(messages, list) or not messages:
            return Response({'detail': 'messages must be a non-empty list.'}, status=status.HTTP_400_BAD_REQUEST)

        turns = _to_gemini_turns(messages)
        if not turns or turns[-1]['role'] != 'user':
            return Response(
                {'detail': 'messages must end with a user message.'}, status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reply = chat(self.instruction(request.user), turns)
        except GeminiError as exc:
            logger.warning('Gemini request failed for user %s: %s', request.user.id, exc)
            return Response(
                {'detail': 'The assistant is unavailable right now. Please try again shortly.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({'reply': reply})


class AuthorAssistantChatView(AssistantChatView):
    permission_classes = [permissions.IsAuthenticated, IsAuthor]
    instruction = staticmethod(contexts.author_instruction)


class ReviewerAssistantChatView(AssistantChatView):
    permission_classes = [permissions.IsAuthenticated, IsReviewer]
    instruction = staticmethod(contexts.reviewer_instruction)


class EditorAssistantChatView(AssistantChatView):
    permission_classes = [permissions.IsAuthenticated, IsEditor]
    instruction = staticmethod(contexts.editor_instruction)


class AdminAssistantChatView(AssistantChatView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    instruction = staticmethod(contexts.admin_instruction)
