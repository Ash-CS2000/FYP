// src/api/invitations.js
//
// The reviewer assignment lifecycle. Like api/similarity.js and api/editorial.js,
// every call carries its request / response contract — this module is the
// specification the backend implements against.
//
// ── The access rule this file exists to enforce ──────────────────────────────
// A reviewer may read a manuscript only after ACCEPTING the invitation to review
// it. Before that they get the title, category and abstract — enough to judge
// competence and conflict — and nothing else. No manuscript file, no author, no
// other reviewers, no similarity data.
//
// The frontend gates this with auth/AssignmentGate.jsx. That gate is a courtesy
// to the user, not a control: it stops someone wandering into the review form,
// and stops nobody who types a URL with intent. Every endpoint below must check
// the assignment server-side and 403 independently.
//
// ── Double-blind starts here ─────────────────────────────────────────────────
// Not at the review form — at the invitation. No response on a reviewer-facing
// endpoint may contain the author's name, email, institution or ORCID, and none
// may contain the identity, count or progress of the other reviewers on the same
// manuscript. That last one is a deliberate choice on this platform: even
// anonymised co-reviewer progress leaks the size and state of the review panel.
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
 * Every assignment belonging to the calling reviewer, in every state.
 *
 *   GET /api/reviewer/assignments/
 *   200  Assignment[]  — see data/invitations.js for the field list
 *   403  caller is not an active reviewer
 *
 * Scoped to the caller by the session, never by a query parameter. An endpoint
 * that takes ?reviewer_id= is one enumeration bug away from exposing the whole
 * assignment graph.
 */
export function listAssignments() {
  return request('/api/reviewer/assignments/');
}

/**
 * Accept an invitation.
 *
 *   POST /api/reviewer/assignments/:id/accept/
 *   body   { coi_declared, coi_note }
 *          coi_declared  true if the reviewer is flagging a conflict they judge
 *                        not disqualifying — the editor decides, not them
 *          coi_note      required when coi_declared is true
 *   200    the updated Assignment, now carrying due_at
 *   403    not this reviewer's assignment
 *   409    already responded — accepting twice must not reset the deadline
 *   410    the invitation expired (respond_by has passed) and was withdrawn
 *
 * The server sets due_at on accept; the client must never propose it. A reviewer
 * choosing their own deadline is not a deadline.
 */
export function acceptAssignment(assignmentId, { coi_declared = false, coi_note = '' } = {}) {
  return request(`/api/reviewer/assignments/${encodeURIComponent(assignmentId)}/accept/`, {
    method: 'POST',
    body: JSON.stringify({ coi_declared, coi_note }),
  });
}

/**
 * Decline an invitation.
 *
 *   POST /api/reviewer/assignments/:id/decline/
 *   body   { reason, note }
 *          reason  'conflict' | 'expertise' | 'unavailable' | 'other'
 *          note    free text; required when reason is 'other'
 *   200    the updated Assignment
 *   400    missing or unknown reason
 *   403    not this reviewer's assignment
 *   409    already responded
 *
 * Declining must revoke the reviewer's access to the manuscript immediately, and
 * should notify the editor so they can reassign — a decline nobody sees is the
 * most common way a manuscript quietly stalls for a month.
 */
export function declineAssignment(assignmentId, { reason, note = '' }) {
  return request(`/api/reviewer/assignments/${encodeURIComponent(assignmentId)}/decline/`, {
    method: 'POST',
    body: JSON.stringify({ reason, note }),
  });
}

/**
 * Recuse from a review already accepted.
 *
 *   POST /api/reviewer/assignments/:id/recuse/
 *   body   { note }   required — what surfaced after accepting
 *   200    the updated Assignment, status back to 'declined'
 *   403    not this reviewer's assignment
 *   409    the review was already submitted
 *
 * Deliberately distinct from decline: recusal happens after the reviewer has
 * seen the manuscript, which is usually exactly when a conflict becomes
 * apparent. Any partial review draft must be discarded, not retained.
 */
export function recuseAssignment(assignmentId, { note }) {
  return request(`/api/reviewer/assignments/${encodeURIComponent(assignmentId)}/recuse/`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

/**
 * Ask the editor for more time.
 *
 *   POST /api/reviewer/assignments/:id/extension/
 *   body   { days, reason }
 *          days    integer, 1–30
 *   200    { ...Assignment, extension: { requested_days, reason, status } }
 *   400    days out of range, or empty reason
 *   403    not this reviewer's assignment
 *   409    an extension request is already pending
 *
 * A request, not a grant: status starts 'pending' and the editor decides. The
 * deadline does not move until they do.
 */
export function requestExtension(assignmentId, { days, reason }) {
  return request(`/api/reviewer/assignments/${encodeURIComponent(assignmentId)}/extension/`, {
    method: 'POST',
    body: JSON.stringify({ days, reason }),
  });
}

/**
 * Candidate reviewers for a manuscript, ranked by fit.
 *
 *   GET /api/manuscripts/:id/reviewer-candidates/
 *   200  Candidate[]  — see REVIEWER_POOL in data/invitations.js
 *   403  caller is not an editor
 *
 * `match_score` is an opaque 0–100 the frontend only sorts and displays, so the
 * ranking method is entirely the backend's choice and can change without
 * touching any screen. `match_reasons` is what the editor actually reads — a
 * bare score is not something anyone can sanity-check.
 *
 * Return conflicted candidates WITH a populated `conflict` string rather than
 * filtering them out. An editor needs to see that a strong match was excluded
 * and why; silently dropping them looks identical to the person not existing.
 */
export function listCandidates(manuscriptId) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/reviewer-candidates/`);
}

/**
 * Invite reviewers to a manuscript.
 *
 *   POST /api/manuscripts/:id/assignments/
 *   body   { reviewer_ids, respond_by_days, due_days }
 *   201    Assignment[]  the created invitations
 *   403    caller is not an editor
 *   409    one of these reviewers is already assigned to this manuscript
 *   422    a reviewer has a recorded conflict and was not force-overridden
 *
 * Sends the invitation email. The reviewer sees title, category and abstract
 * only until they accept.
 */
export function inviteReviewers(manuscriptId, { reviewer_ids, respond_by_days = 7, due_days = 21 }) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/assignments/`, {
    method: 'POST',
    body: JSON.stringify({ reviewer_ids, respond_by_days, due_days }),
  });
}

/**
 * Nudge a reviewer whose review is late or due.
 *
 *   POST /api/manuscripts/:id/assignments/:assignmentId/remind/
 *   200   { reminded_at }
 *   403   caller is not an editor
 *   409   a reminder was already sent within the last 24 hours
 *
 * The 409 matters. Without a rate limit an impatient editor can mail a reviewer
 * six times in an afternoon, and the reviewer's response to that is to stop
 * reviewing for this journal.
 */
export function remindReviewer(manuscriptId, assignmentId) {
  return request(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/assignments/${encodeURIComponent(assignmentId)}/remind/`,
    { method: 'POST' },
  );
}

/**
 * Decide on a reviewer's extension request.
 *
 *   PATCH /api/manuscripts/:id/assignments/:assignmentId/extension/
 *   body   { status }   'granted' | 'refused'
 *   200    the updated Assignment; on 'granted' due_at has moved
 *   403    caller is not an editor
 *   404    no pending extension request
 */
export function decideExtension(manuscriptId, assignmentId, { status }) {
  return request(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/assignments/${encodeURIComponent(assignmentId)}/extension/`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );
}
