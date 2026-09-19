"""
Thin client for the Gemini API — the source behind the Author Assistant.

Follows the same shape as apps/discovery/client.py: module level functions,
one exception type, an explicit timeout on every call, and a status check
that raises rather than returning junk to a view. Plain `requests` rather
than the google-genai SDK, to match how every other external service in this
project is called.

Docs: https://ai.google.dev/api/generate-content
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

API_ROOT = 'https://generativelanguage.googleapis.com/v1beta'
# gemini-2.5-flash-lite was retired for new API users (404 "no longer
# available to new users") — 3.5 is its direct successor on the free tier.
MODEL = 'gemini-3.5-flash-lite'

GEMINI_API_KEY = getattr(settings, 'GEMINI_API_KEY', '') or ''

TIMEOUT = 30


class GeminiError(Exception):
    """Gemini was unreachable, unconfigured, or answered with something unusable."""


def chat(system_instruction, turns):
    """Send one chat turn to Gemini and return the reply text.

    `turns` is the full conversation so far, oldest first:
        [{"role": "user" | "model", "parts": [{"text": "..."}]}, ...]
    Gemini has no separate "assistant" role — the caller maps our
    "assistant" role to "model" before calling this.
    """
    if not GEMINI_API_KEY:
        raise GeminiError('GEMINI_API_KEY is not configured on the server.')

    payload = {
        'systemInstruction': {'parts': [{'text': system_instruction}]},
        'contents': turns,
    }

    try:
        response = requests.post(
            f'{API_ROOT}/models/{MODEL}:generateContent',
            json=payload,
            headers={
                'x-goog-api-key': GEMINI_API_KEY,
                'Content-Type': 'application/json',
            },
            timeout=TIMEOUT,
        )
    except requests.RequestException as exc:
        raise GeminiError(f'Could not reach Gemini: {exc}') from exc

    if response.status_code != 200:
        raise GeminiError(f'Gemini returned {response.status_code}: {response.text[:300]}')

    try:
        data = response.json()
    except ValueError as exc:
        raise GeminiError('Gemini returned a non-JSON body.') from exc

    candidates = data.get('candidates') or []
    if not candidates:
        # A prompt can be blocked by safety filters with no candidates at all —
        # promptFeedback carries the reason when that happens.
        reason = (data.get('promptFeedback') or {}).get('blockReason')
        raise GeminiError(f'Gemini returned no candidates{f" (blocked: {reason})" if reason else ""}.')

    parts = ((candidates[0].get('content') or {}).get('parts')) or []
    text = ''.join(part.get('text', '') for part in parts).strip()
    if not text:
        raise GeminiError('Gemini returned an empty response.')

    return text
