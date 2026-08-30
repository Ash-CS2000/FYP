// src/api/notifications.js
//
// The authenticated user's own notifications, talking to our real Django backend:
//   GET  /api/notifications/            → list, newest first
//   POST /api/notifications/:id/read/   → mark one read
//   POST /api/notifications/read-all/   → mark every unread notification read

import { API_URL } from '../config';
import { authFetch } from './auth';

async function request(path, options = {}) {
  const res = await authFetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.detail || body?.error || '';
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

/**
 * List the caller's own notifications, newest first.
 *
 *   GET /api/notifications/
 *   200  { id, category, title, body, manuscript_id, manuscript_title, read, created_at }[]
 */
export function listNotifications() {
  return request('/api/notifications/', { method: 'GET' });
}

/** Mark one notification read. */
export function markNotificationRead(id) {
  return request(`/api/notifications/${id}/read/`, { method: 'POST' });
}

/** Mark every unread notification read. */
export function markAllNotificationsRead() {
  return request('/api/notifications/read-all/', { method: 'POST' });
}
