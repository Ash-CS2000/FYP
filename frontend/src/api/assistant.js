// src/api/assistant.js
//
// Author, Reviewer, Editor and Admin Assistant chatbots, talking to our Django
// backend (Gemini-backed):
//   POST /api/assistant/chat/            → { reply }   (authors)
//   POST /api/assistant/reviewer-chat/   → { reply }   (reviewers)
//   POST /api/assistant/editor-chat/     → { reply }   (editors)
//   POST /api/assistant/admin-chat/      → { reply }   (admins)

const ENDPOINTS = {
  author: '/api/assistant/chat/',
  reviewer: '/api/assistant/reviewer-chat/',
  editor: '/api/assistant/editor-chat/',
  admin: '/api/assistant/admin-chat/',
};

export const ASSISTANT_ROLES = Object.keys(ENDPOINTS);

import { API_URL } from '../config';
import { authFetch } from './auth';

/**
 * Send the conversation so far and get the assistant's reply. `role` picks
 * the assistant: 'author' (default), 'reviewer', 'editor' or 'admin'.
 *
 *   POST /api/assistant/<role>-chat/  (authors: /chat/)
 *   Body  { messages: [{ role: 'user' | 'assistant', content: string }, ...] }
 *   200   { reply: string }
 *   400   malformed history
 *   403   caller does not hold an active role for that assistant
 *   502   assistant temporarily unavailable
 */
export async function sendAssistantMessage(messages, role = 'author') {
  const res = await authFetch(`${API_URL}${ENDPOINTS[role]}`, {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });

  let body = null;
  try { body = await res.json(); } catch { /* non-JSON error body */ }

  if (!res.ok) {
    const err = new Error(body?.detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return body.reply;
}
