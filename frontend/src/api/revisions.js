// src/api/revisions.js
//
// Author-side revision resubmission: uploading a revised manuscript file
// against a minor/major decision. Like api/editorial.js, every call carries
// its request / response contract.
//
// SECURITY: nothing here is enforcement. Every endpoint is scoped to the
// calling author by session, never by a parameter; assume this file can be
// bypassed.

import { API_URL } from '../config';

function authHeaders() {
  const access = localStorage.getItem('access');
  return access ? { Authorization: `Bearer ${access}` } : {};
}

async function parseError(res) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.detail || body?.error || '';
  } catch {
    /* non-JSON error body */
  }
  const err = new Error(detail || `Request failed (${res.status})`);
  err.status = res.status;
  return err;
}

/**
 * Every revision submitted on this manuscript, newest first.
 *
 *   GET /api/manuscripts/:id/revision/
 *   200   [{ id, round, file_name, file_size, file_url, response_letter, submitted_at }]
 *   403   caller may not read this manuscript
 */
export async function listRevisions(manuscriptId) {
  const res = await fetch(`${API_URL}/api/manuscripts/${encodeURIComponent(manuscriptId)}/revision/`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

/**
 * Upload a revised manuscript in response to a minor/major decision.
 *
 *   POST /api/manuscripts/:id/revision/
 *   body    multipart/form-data — manuscript (file, PDF, <=20MB), response_letter (optional)
 *   201     the created ManuscriptRevision
 *   403     caller is not this manuscript's owner
 *   409     the manuscript is not awaiting a revision
 *
 * Raw fetch with only an Authorization header, deliberately not the JSON
 * request() helper used elsewhere in this file family — a hardcoded
 * 'Content-Type: application/json' header breaks the multipart boundary.
 * Reopens the manuscript for a fresh editor decision: status flips back to
 * under_review server-side.
 */
export async function submitRevision(manuscriptId, { file, responseLetter = '' }) {
  const formData = new FormData();
  formData.append('manuscript', file);
  formData.append('response_letter', responseLetter);

  const res = await fetch(`${API_URL}/api/manuscripts/${encodeURIComponent(manuscriptId)}/revision/`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}
