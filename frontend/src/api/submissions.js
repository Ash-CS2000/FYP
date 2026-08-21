// src/api/submissions.js
//
// Author-side submission management: drafts and withdrawal. Like the other api/
// modules, every call carries its request / response contract — this file is the
// specification the backend implements against.
//
// SECURITY: nothing here is enforcement. Every endpoint is scoped to the calling
// author by session, never by a parameter; assume this file can be bypassed.

import { API_URL } from '../config';

function authHeaders() {
  const access = localStorage.getItem('access');
  return {
    'Content-Type': 'application/json',
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: authHeaders() });
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
 * The calling author's saved drafts.
 *
 *   GET /api/submissions/drafts/
 *   200  Draft[]  — see data/drafts.js for the record shape
 *   403  not an author
 *
 * Scoped by session. A ?author_id= parameter here would be an enumeration hole.
 */
export function listDrafts() {
  return request('/api/submissions/drafts/');
}

/**
 * Create or update a draft.
 *
 *   PUT /api/submissions/drafts/:id/   (POST to /api/submissions/drafts/ to create)
 *   body   { kind, title, step, payload, file_name }
 *   200    the saved Draft
 *   403    not this author's draft
 *   413    payload too large
 *
 * Idempotent on id, so autosave can call it on a timer without accumulating a
 * draft per keystroke.
 *
 * The manuscript FILE is not part of this payload — the frontend cannot
 * serialise it (see the note at the top of data/drafts.js). When this endpoint
 * is built, add a companion multipart upload so a resumed draft keeps its file;
 * until then the resume banner tells the author to re-attach.
 */
export function saveDraftRemote(id, draft) {
  return id
    ? request(`/api/submissions/drafts/${encodeURIComponent(id)}/`, {
        method: 'PUT',
        body: JSON.stringify(draft),
      })
    : request('/api/submissions/drafts/', {
        method: 'POST',
        body: JSON.stringify(draft),
      });
}

/**
 * Discard a draft.
 *
 *   DELETE /api/submissions/drafts/:id/
 *   204  deleted
 *   403  not this author's draft
 *   404  already gone — treat as success, the author's intent is satisfied
 */
export function deleteDraftRemote(id) {
  return request(`/api/submissions/drafts/${encodeURIComponent(id)}/`, { method: 'DELETE' });
}

/**
 * Withdraw a submission.
 *
 *   POST /api/manuscripts/:id/withdraw/
 *   body   { reason, note }
 *   200    { manuscript_id, reason, note, withdrawn_at }
 *   400    missing reason
 *   403    caller is not this manuscript's author
 *   409    a FINAL decision already exists — accepted and rejected papers cannot
 *          be withdrawn, there is nothing left to withdraw from
 *
 * What the server owns:
 *   1. Notify the editor, and every reviewer currently holding an assignment —
 *      a reviewer who spends a weekend on a withdrawn paper does not come back.
 *   2. Revoke reviewer access to the manuscript immediately.
 *   3. Move the manuscript to 'withdrawn'. Do NOT delete it: the submission
 *      record, its reviews and its screening report are part of the journal's
 *      audit trail even when the paper goes no further.
 *
 * A pending (not final) decision does not block withdrawal — an author is
 * entitled to walk away from a revise-and-resubmit.
 */
export function withdrawSubmission(manuscriptId, { reason, note = '' }) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/withdraw/`, {
    method: 'POST',
    body: JSON.stringify({ reason, note }),
  });
}
