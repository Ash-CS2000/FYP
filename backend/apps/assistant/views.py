"""
Author Assistant — a Gemini-backed chatbot scoped to the Author workspace.

Stateless and session-only by design: nothing here is stored. The frontend
keeps the conversation in memory and resends recent history each turn; a page
refresh clears it. See gemini_client.py for the actual Gemini call.
"""
import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.manuscripts.models import Manuscript
from apps.users.permissions import IsAuthor

from .gemini_client import GeminiError, chat

logger = logging.getLogger(__name__)

# However long the frontend's in-memory history grows, only the most recent
# turns are sent — keeps token spend (and the shared free-tier quota) bounded.
MAX_HISTORY_TURNS = 12
MAX_MESSAGE_CHARS = 4000

SYSTEM_PROMPT_HEADER = """You are the PaperBridge Author Assistant, embedded in the \
Author workspace of PaperBridge, a research portal for discovering papers, \
submitting manuscripts, and tracking peer review.

You help the signed-in author with:
- Understanding the submission and peer-review workflow (submitted → under \
review → revisions requested / accepted / rejected → published)
- What a status on their own dashboard means and what to do next
- How to resubmit after "revisions requested"
- General citation and plagiarism-avoidance guidance
- Finding their way around the Author workspace (My Papers, Submit, Training, \
Notifications, Settings)

Rules:
- Only discuss the manuscripts listed below under "This author's manuscripts" \
— never invent a status, date, or title that isn't there.
- You cannot see other authors' submissions, reviewer identities, review \
comments, or make editorial decisions. If asked, say that's outside what you \
can see and point them to their editor/notifications instead.
- Keep answers short and practical. This is a chat widget, not an essay.
"""


def _manuscript_context(user):
    manuscripts = Manuscript.objects.filter(owner=user).order_by('-submitted_at')[:20]
    if not manuscripts:
        return "This author's manuscripts: none submitted yet."

    lines = [
        f'- "{m.title}" — {m.get_status_display()} (submitted {m.submitted_at.date().isoformat()})'
        for m in manuscripts
    ]
    return "This author's manuscripts:\n" + '\n'.join(lines)


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


class AuthorAssistantChatView(APIView):
    """
    POST /api/assistant/chat/
    Body: {"messages": [{"role": "user" | "assistant", "content": "..."}, ...]}
    200  {"reply": "..."}
    400  empty/invalid message history
    502  Gemini unreachable, unconfigured, or blocked the prompt
    """
    permission_classes = [permissions.IsAuthenticated, IsAuthor]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'assistant'

    def post(self, request):
        messages = request.data.get('messages')
        if not isinstance(messages, list) or not messages:
            return Response({'detail': 'messages must be a non-empty list.'}, status=status.HTTP_400_BAD_REQUEST)

        turns = _to_gemini_turns(messages)
        if not turns or turns[-1]['role'] != 'user':
            return Response(
                {'detail': 'messages must end with a user message.'}, status=status.HTTP_400_BAD_REQUEST,
            )

        system_instruction = SYSTEM_PROMPT_HEADER + '\n' + _manuscript_context(request.user)

        try:
            reply = chat(system_instruction, turns)
        except GeminiError as exc:
            logger.warning('Gemini request failed for user %s: %s', request.user.id, exc)
            return Response(
                {'detail': 'The assistant is unavailable right now. Please try again shortly.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({'reply': reply})
