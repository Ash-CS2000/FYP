// src/api/editorial.js
//
// Editorial decisions and screening actions. Like api/similarity.js and
// api/admin.js, every call here carries its request / response contract — this
// module is the specification the backend implements against. Change it here
// first, then implement.
//
// ── Authorisation ────────────────────────────────────────────────────────────
// Every write below is EDITOR-ONLY. This is the boundary that separates the two
// privileged roles in the platform:
//
//   editor  — makes editorial judgements, cannot administer the platform
//   admin   — administers the platform, cannot make editorial judgements
//
// The admin UI reads the same manuscripts through the same GET endpoints and
// renders without action controls. That is presentation. The server must return
// 403 on every POST here for a non-editor caller, admins included — an admin who
// crafts the request by hand must still be refused.
//
// ── Field the backend must never echo ────────────────────────────────────────
// Reviews carry `confidential_to_editor` (see data/reviews.js). The decision
// letter is author-facing, so any endpoint that serves a letter or an
// author-visible review must strip that field, along with numeric ratings and
// the reviewer's own recommendation — see toAuthorReview() in data/editorial.js
// for the exact allow-list the author response should match.
//
// SECURITY: nothing in this file is enforcement. Assume it can be bypassed.

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
 * The decision on one manuscript, if one has been taken.
 *
 *   GET /api/manuscripts/:id/decision/
 *   200   { manuscript_id, type, letter, decided_at, decided_by }
 *   403   caller may not read this manuscript
 *   404   no decision yet — NOT an error, the normal state for a live paper
 *
 * Readable by the editor, an admin (oversight), and the manuscript's own author.
 * For the author the response must be the letter and nothing else: no reviewer
 * ratings, no recommendations, no confidential comments.
 */
export function getDecision(manuscriptId) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/decision/`);
}

/**
 * Every decision ever taken on this manuscript, newest first — the full
 * audit trail across every revision round.
 *
 *   GET /api/manuscripts/:id/decisions/
 *   200   Decision[]
 *   403   caller may not read this manuscript
 *
 * Readable by the editor, an admin, and the manuscript's own author — same
 * audience as getDecision().
 */
export function listDecisions(manuscriptId) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/decisions/`);
}

/**
 * Record the editorial decision and send the letter to the author.
 *
 *   POST /api/manuscripts/:id/decision/
 *   body    { type, letter, reasons? }
 *           type    'desk_reject' | 'accept' | 'minor' | 'major' | 'reject'
 *           letter  the full text sent to the author, already edited
 *           reasons string[]  desk rejections only, for the audit trail
 *   201     the created Decision
 *   400     unknown type, or empty letter
 *   403     caller is not an editor
 *   409     a final decision already exists — accept and reject are terminal,
 *           and must not be silently overwritten by a second POST
 *   422     'desk_reject' on a manuscript that already has reviews
 *
 * Three things this endpoint owns, none of which the frontend can do:
 *   1. Deliver the letter to the author (in-app notification).
 *   2. Move the manuscript's status: accept → 'accepted', reject/desk_reject →
 *      'rejected', minor/major → 'revisions_requested'.
 *   3. Release the reviews to the author, stripped to the author-visible fields.
 *      An author must not be able to read reviews before a decision exists.
 *
 * Write an audit row for every call — this is the highest-consequence action an
 * editor takes, and admins are expected to be able to review it after the fact.
 */
export function postDecision(manuscriptId, { type, letter, reasons = [] }) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/decision/`, {
    method: 'POST',
    body: JSON.stringify({ type, letter, reasons }),
  });
}

/**
 * Act on a flagged similarity report.
 *
 *   POST /api/manuscripts/:id/screening/
 *   body    { action, note }
 *           action  'allow' | 'return'
 *           note    the editor's reasoning — required, this is the record of
 *                   why a flag was cleared
 *   200     { manuscript_id, action, note, acted_at, acted_by }
 *   400     unknown action, or empty note
 *   403     caller is not an editor
 *   404     no similarity report exists for this manuscript
 *
 * This is NOT a decision. 'allow' clears the flag and lets the manuscript
 * continue into review; 'return' sends it back to the author to fix the overlap.
 * Neither accepts nor rejects the paper, and neither re-runs the check — the
 * score is a fact about the manuscript, and an editor disagreeing with it does
 * not change it. Re-running is requestCheck() in api/similarity.js.
 */
export function postScreeningAction(manuscriptId, { action, note }) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/screening/`, {
    method: 'POST',
    body: JSON.stringify({ action, note }),
  });
}

/**
 * The reviews an author is permitted to read on their own manuscript.
 *
 *   GET /api/manuscripts/:id/reviews/author/
 *   200   [{ id, label, summary, strengths, weaknesses }]
 *   403   caller is not this manuscript's author
 *   404   no decision yet, so nothing is released — reviews become visible to
 *         the author only when a decision does
 *
 * Deliberately a separate endpoint from the editor's GET
 * /api/manuscripts/:id/reviews/ rather than the same one filtered by role. Two
 * endpoints with two serialisers cannot leak into each other by mistake; one
 * endpoint with a conditional field list is one forgotten branch away from
 * sending confidential_to_editor to an author.
 */
export function getAuthorReviews(manuscriptId) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/reviews/author/`);
}
