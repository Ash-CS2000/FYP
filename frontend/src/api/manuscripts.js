// src/api/manuscripts.js
//
// Manuscript detail/list, talking to our real Django backend:
//   GET /api/manuscripts/            → list the caller's own submissions
//   GET /api/manuscripts/:id/        → retrieve one manuscript

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
 * Fetch one manuscript by id.
 *
 *   GET /api/manuscripts/:id/
 *   200  Manuscript (see ManuscriptSerializer in apps/manuscripts)
 *   403/404  not the owner, or no such manuscript
 */
export function getManuscript(id) {
  return request(`/api/manuscripts/${id}/`, { method: 'GET' });
}

/**
 * List the caller's own manuscripts, newest first.
 *
 *   GET /api/manuscripts/
 *   200  Manuscript[]
 */
export function listManuscripts() {
  return request('/api/manuscripts/', { method: 'GET' });
}

/**
 * List every manuscript across all owners, newest first. Editor/admin only.
 *
 *   GET /api/manuscripts/editor/
 *   200  { id, title, article_type, category, status, submitted_at, owner_name,
 *           plagiarism_check: { status, similarity_score } | null }[]
 *   403  caller does not hold an active editor/admin role
 */
export function listAllManuscripts() {
  return request('/api/manuscripts/editor/', { method: 'GET' });
}
