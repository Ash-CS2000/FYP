// src/api/similarity.js
//
// Plagiarism/similarity screening. Talks to our real Django backend:
//   browser ──> Django /api/manuscripts/<id>/plagiarism-status/ ──> noplag engine
//
// The check itself is triggered automatically server-side when a manuscript is
// submitted (see ManuscriptSubmitSerializer.create() in apps/manuscripts). This
// file only polls for the result — there is no separate "start check" call yet.

import { API_URL } from '../config';
import { authFetch } from './auth';

export const POLL_INTERVAL_MS = 3000;
export const POLL_TIMEOUT_MS = 180000; // noplag can take a couple minutes on large PDFs

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
 * Get the current plagiarism-check status for a manuscript.
 *
 *   GET /api/manuscripts/:id/plagiarism-status/
 *   200  { status: 'pending' | 'completed' | 'failed',
 *           similarity_score: number | null,
 *           error_message: string,
 *           checked_at: string,
 *           report: object | null }
 *   404  no plagiarism check exists for this manuscript
 *
 * `report`, when present, is noplag's own CheckReportResponse shape verbatim
 * (title, query_text, total_matched_chars, overall_similarity_pct, sources,
 * coverage, ...) — see noplag-engine/src/noplag_engine/api/v1/schemas.py.
 * Each source is { source_document_id, matched_chars, similarity_pct,
 * source_filename, source_url, passages: [{ overlap_text_preview,
 * query_start, query_end, candidate_start, candidate_end, score,
 * match_type }] }. There is no query-side excerpt on a passage — slice
 * report.query_text[query_start:query_end] for it.
 */
export function getPlagiarismStatus(manuscriptId) {
  return request(`/api/manuscripts/${manuscriptId}/plagiarism-status/`, { method: 'GET' });
}

/**
 * Poll a manuscript's check until it settles (completed or failed), or time out.
 *
 * @param {string|number} manuscriptId
 * @param {function} [onUpdate]   called with the latest status object on each poll
 * @param {AbortSignal} [signal]  abort to stop polling (e.g. on unmount)
 * @returns {Promise<object>} the final status object
 * @throws  when the check fails, times out, or the request is aborted
 */
export async function pollPlagiarismStatus(manuscriptId, { onUpdate, signal } = {}) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let state = await getPlagiarismStatus(manuscriptId);
  onUpdate?.(state);

  while (state.status === 'pending') {
    if (signal?.aborted) throw new Error('Check cancelled.');
    if (Date.now() > deadline) return { ...state, polling_timed_out: true };
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    if (signal?.aborted) throw new Error('Check cancelled.');
    state = await getPlagiarismStatus(manuscriptId);
    onUpdate?.(state);
  }

  if (state.status === 'failed') {
    throw new Error(state.error_message || 'The originality check failed.');
  }

  return state;
}

/**
 * The platform's similarity screening policy. One shared record — every editor,
 * author and admin reads the same values, so a score is banded identically on
 * every screen.
 *
 *   GET /api/analysis/screening-settings/
 *   200  ScreeningSettings
 *   401  not signed in
 *
 *   ScreeningSettings {
 *     review_threshold      0–100  at or above → amber, for the editor's attention
 *     high_threshold        0–100  at or above → flagged; must exceed review_threshold
 *     exclude_quotes        bool
 *     exclude_bibliography  bool
 *     min_words             0–200  ignore matches shorter than this many words
 *     auto_flag             bool
 *     updated_at            ISO timestamp, or null if never changed
 *     updated_by_name       string, '' if never changed
 *   }
 */
export function getScreeningSettings() {
  return request('/api/analysis/screening-settings/', { method: 'GET' });
}

/**
 * Change screening policy. Admin only. Send only the fields being changed.
 *
 *   PATCH /api/analysis/screening-settings/
 *   body  any subset of the editable ScreeningSettings fields
 *   200   the full ScreeningSettings after the change
 *   400   { field: [message] } — out of range, or review_threshold is not
 *         lower than high_threshold once the patch is applied
 *   403   caller is not an admin
 *
 * Writes one 'settings_change' audit entry listing each field's old and new
 * value. A patch that changes nothing writes no entry.
 */
export function patchScreeningSettings(patch) {
  return request('/api/analysis/screening-settings/', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

// ── Not implemented on the real backend yet ──────────────────────────────────

export async function requestDraftCheck(file) {
  throw new Error('Draft self-check is not available yet.');
}

export async function pollCheck(job, options) {
  throw new Error('Draft self-check is not available yet.');
}
