// src/api/similarity.js
//
// Plagiarism/similarity screening. Talks to our real Django backend:
//   browser ──> Django /api/manuscripts/<id>/plagiarism-status/ ──> noplag engine
//
// The check itself is triggered automatically server-side when a manuscript is
// submitted (see ManuscriptSubmitSerializer.create() in apps/manuscripts). This
// file only polls for the result — there is no separate "start check" call yet.

import { API_URL } from '../config';

export const POLL_INTERVAL_MS = 3000;
export const POLL_TIMEOUT_MS = 180000; // noplag can take a couple minutes on large PDFs

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
 * Get the current plagiarism-check status for a manuscript.
 *
 *   GET /api/manuscripts/:id/plagiarism-status/
 *   200  { status: 'pending' | 'completed' | 'failed',
 *           similarity_score: number | null,
 *           error_message: string,
 *           report: object | null }
 *   404  no plagiarism check exists for this manuscript
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
    if (Date.now() > deadline) throw new Error('The originality check timed out.');
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

// ── Not implemented on the real backend yet — stubs so Settings.jsx doesn't

const DEFAULT_SCREENING_SETTINGS = {
  review_threshold: 15,
  high_threshold: 30,
  exclude_quotes: false,
  exclude_bibliography: false,
  min_words: 0,
  auto_flag: true,
};

export async function getScreeningSettings() {
  return DEFAULT_SCREENING_SETTINGS;
}

export async function patchScreeningSettings(patch) {
  return { ...DEFAULT_SCREENING_SETTINGS, ...patch };
}

export async function requestDraftCheck(file) {
  throw new Error('Draft self-check is not available yet.');
}

export async function pollCheck(job, options) {
  throw new Error('Draft self-check is not available yet.');
}