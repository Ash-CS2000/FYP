// src/api/assistant.js
//
// Author Assistant chatbot, talking to our Django backend (Gemini-backed):
//   POST /api/assistant/chat/   → { reply }

import { API_URL } from '../config';
import { authFetch } from './auth';

/**
 * Send the conversation so far and get the assistant's reply.
 *
 *   POST /api/assistant/chat/
 *   Body  { messages: [{ role: 'user' | 'assistant', content: string }, ...] }
 *   200   { reply: string }
 *   400   malformed history
 *   403   caller does not hold an active author role
 *   502   assistant temporarily unavailable
 */
export async function sendAssistantMessage(messages) {
  const res = await authFetch(`${API_URL}/api/assistant/chat/`, {
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
