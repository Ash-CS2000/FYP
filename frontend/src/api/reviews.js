// src/api/reviews.js
//
// The review-writing step. Like api/editorial.js and api/invitations.js,
// every call here carries its request/response contract — the spec the
// backend implements against.
//
// ── Double-blind ──────────────────────────────────────────────────────────
// A reviewer never learns the author's identity (see getManuscriptForReview).
// An editor never learns a reviewer's real name — only a stable positional
// label ('Reviewer 1', 'Reviewer 2', assigned by invitation order and never
// reused). An author never learns either identity, and only ever sees a
// review once a decision exists (see getAuthorReviews in api/editorial.js —
// that endpoint already exists for real; this file is everything upstream
// of it).
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
      // Field validation errors arrive as { field: ['message'] }; surface the
      // first one rather than a bare status code.
      const firstField = body && typeof body === 'object' ? Object.values(body)[0] : null;
      detail = body?.detail || body?.error || (Array.isArray(firstField) ? firstField[0] : '') || '';
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
 * The manuscript content a reviewer is allowed to read: enough to write a
 * review, nothing that identifies the author.
 *
 *   GET /api/manuscripts/:id/reviewer-view/
 *   200  { id, title, abstract, category, sub_category, keywords, file_name, file_url }
 *   403  caller does not hold an accepted (or already-submitted) assignment
 *        on this manuscript
 *
 * Deliberately not the same endpoint/serializer an editor or the owner gets
 * — no owner, no authors, no cover letter, no declarations. See
 * getAuthorReviews in api/editorial.js for why: two endpoints with two
 * serialisers cannot leak into each other by a forgotten branch.
 */
/**
 * Once a manuscript is decided, its decision and every released report — for
 * a reviewer who submitted on it. Labels only, never names; no decision
 * letter, ratings or confidential notes.
 *
 *   GET /api/manuscripts/:id/reviewer-outcome/
 *   200  { decision: { type, decided_at }, reviews: [{ label, is_you, recommendation, summary, strengths, weaknesses }] }
 *   403  caller did not submit a review on this manuscript
 *   404  no decision yet
 */
export function getReviewOutcome(manuscriptId) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/reviewer-outcome/`);
}

export function getManuscriptForReview(manuscriptId) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/reviewer-view/`);
}

/**
 * Every review on this manuscript the editor may see — submitted reviews in
 * full, plus a row for anyone who has accepted but not yet submitted (review
 * fields null), so an editor can tell "no reviewers yet" apart from
 * "reviewers assigned, still working."
 *
 *   GET /api/manuscripts/:id/reviews/
 *   200  [{ id, manuscript_id, reviewer_label, status, submitted_at,
 *           ratings: {originality,technical,clarity,relevance} | null,
 *           recommendation, summary, strengths, weaknesses,
 *           confidential_to_editor }]
 *   403  caller is not an editor or admin
 *
 * `id` here is the assignment id, not a review id — there's one row per
 * reviewer on the manuscript regardless of whether they've submitted yet.
 * `reviewer_label` is positional, never the reviewer's real name.
 */
export function getReviews(manuscriptId) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/reviews/`);
}

/**
 * Submit a review.
 *
 *   POST /api/manuscripts/:id/reviews/
 *   body   { originality, technical, clarity, relevance,   each 1-5
 *            recommendation,                                'accept'|'minor'|'major'|'reject'
 *            summary, strengths, weaknesses,                required, author-visible eventually
 *            confidential_to_editor }                       optional, editor-only forever
 *   201    the created review row, in the same shape as one entry of getReviews()
 *   403    caller has no assignment on this manuscript, or it isn't accepted
 *   409    caller has already submitted a review for this manuscript
 *
 * Terminal: flips the assignment to 'submitted' and notifies the editor who
 * sent the invitation. There is no edit/resubmit path.
 */
export function submitReview(manuscriptId, {
  originality, technical, clarity, relevance, recommendation,
  summary, strengths, weaknesses, confidential_to_editor = '',
}) {
  return request(`/api/manuscripts/${encodeURIComponent(manuscriptId)}/reviews/`, {
    method: 'POST',
    body: JSON.stringify({
      originality, technical, clarity, relevance, recommendation,
      summary, strengths, weaknesses, confidential_to_editor,
    }),
  });
}

export function assessReview(manuscriptId, assignmentId, { quality, accuracy, errors = 0, note = '' }) {
  return request(
    `/api/manuscripts/${encodeURIComponent(manuscriptId)}/reviews/${encodeURIComponent(assignmentId)}/assessment/`,
    {
      method: 'PUT',
      body: JSON.stringify({ quality, accuracy, errors, note }),
    },
  );
}
