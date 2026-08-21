// src/api/similarity.js
//
// Similarity (originality) screening. Like api/admin.js, every call here carries
// its request / response contract — this module is the specification the backend
// implements against. Change it here first.
//
// ── Architecture ─────────────────────────────────────────────────────────────
// The matching engine is `noplag-engine/` at the repo root: a standalone FastAPI
// + Postgres service (winnowing fingerprints → seed-and-extend alignment). Django
// sits in front of it and the browser only ever talks to Django.
//
//   browser ──> Django /api/analysis/… ──> noplag-engine /v1/checks…
//
// Two things the backend engineer must know:
//
//   1. The engine ships with NO AUTHENTICATION (its own README says so). It must
//      never be reachable from the browser or the public internet. Django owns
//      authn/authz and per-manuscript access control.
//   2. The engine defaults to port 8000, which is also the Django dev server
//      (see src/config.js). Move it — set ENGINE_PORT in noplag-engine/.env.
//
// Field names below map 1:1 onto the engine's own response schema
// (`overall_similarity_pct`, `sources[].similarity_pct`), so the Django layer can
// be a thin pass-through rather than a translation layer. Keep it that way.
//
// ── Scope of the engine ──────────────────────────────────────────────────────
// It detects VERBATIM and near-verbatim reuse only. Paraphrase, translation and
// AI-generated text are out of scope (roadmap, not implemented). The UI must say
// "similarity", never "plagiarism detected" — a number here is a signal for a
// human editor, not a verdict.
//
// SECURITY: nothing in this file is enforcement. The server must independently
// authorise every call — assume this file can be bypassed.

import { API_URL } from '../config';

// How often pollCheck asks for status, and how long before it gives up. The
// engine's own budget (NOPLAG_CHECK_BUDGET_S) is typically 30–60s.
export const POLL_INTERVAL_MS = 1500;
export const POLL_TIMEOUT_MS = 120000;

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
 * Queue a similarity check for a manuscript already in the system. Used by the
 * editor's screening view to re-run a check.
 *
 *   POST /api/analysis/checks/
 *   body     { manuscript_id }
 *   202      { id, status: 'queued', manuscript_id, requested_at }
 *   403      caller may not read this manuscript
 *   404      no such manuscript
 *   409      a check is already running for this manuscript
 *
 * Server-side this becomes a POST to the engine's /v1/checks. The check runs
 * against the corpus of previously indexed submissions, so the backend must also
 * ingest each accepted manuscript into the engine's corpus (/v1/corpus) — a
 * submission that was never indexed can never be matched against.
 */
export function requestCheck(manuscriptId) {
  return request('/api/analysis/checks/', {
    method: 'POST',
    body: JSON.stringify({ manuscript_id: manuscriptId }),
  });
}

/**
 * Queue a check for a draft PDF that has NOT been submitted yet — the author's
 * pre-submission self-check.
 *
 *   POST /api/analysis/checks/upload/
 *   body     multipart/form-data, field `manuscript` (PDF, max 20MB)
 *   202      { id, status: 'queued', requested_at }
 *   400      not a PDF, or over the size limit
 *   413      payload too large
 *
 * A draft check MUST NOT add the file to the corpus. Otherwise the author's own
 * draft becomes a match against itself at submission time.
 *
 * Note this bypasses `request()` — FormData must set its own Content-Type
 * boundary, so the JSON header from authHeaders() cannot be used.
 */
export async function requestDraftCheck(file) {
  const formData = new FormData();
  formData.append('manuscript', file);
  const access = localStorage.getItem('access');
  const res = await fetch(`${API_URL}/api/analysis/checks/upload/`, {
    method: 'POST',
    headers: access ? { Authorization: `Bearer ${access}` } : {},
    body: formData,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.detail || body?.error || '';
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(detail || `Check failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Poll one check's progress.
 *
 *   GET /api/analysis/checks/:id/
 *   200  { id, status, progress_pct, error }
 *
 * `status` is 'queued' | 'running' | 'done' | 'failed'.
 * `progress_pct` is 0–100. `error` is a human-readable string when failed.
 *
 * The engine also exposes an SSE progress stream; if the backend prefers to
 * proxy that instead, keep this endpoint working as the fallback — EventSource
 * cannot send an Authorization header.
 */
export function getCheckStatus(checkId) {
  return request(`/api/analysis/checks/${checkId}/`, { method: 'GET' });
}

/**
 * Fetch the finished report.
 *
 *   GET /api/analysis/checks/:id/report/
 *   query    exclude_quotes, exclude_bibliography (booleans),
 *            min_words (integer — drop matches shorter than this)
 *   200      SimilarityReport (see data/similarity.js for the full shape)
 *   403      caller may not read this report
 *   404      no such check
 *   409      the check has not finished yet
 *
 * The exclusion params recompute `overall_similarity_pct` server-side; the
 * frontend must never re-derive the total itself, or the editor's number and the
 * stored number will drift apart.
 *
 * Visibility: editors and admins may read any report in their journal. An author
 * may read reports for their OWN manuscripts only. Reviewers may not read any —
 * a similarity report names the matched sources and would break double-blind.
 */
export function getReport(checkId, { excludeQuotes, excludeBibliography, minWords } = {}) {
  const params = new URLSearchParams();
  if (excludeQuotes !== undefined) params.set('exclude_quotes', String(excludeQuotes));
  if (excludeBibliography !== undefined) params.set('exclude_bibliography', String(excludeBibliography));
  if (minWords !== undefined) params.set('min_words', String(minWords));
  const qs = params.toString();
  return request(`/api/analysis/checks/${checkId}/report/${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

/**
 * Run a check to completion: queue it, poll until it settles, return the report.
 * Shared by the author self-check and the editor's re-run so the two can't drift.
 *
 * @param {object}   job                 the 202 body from requestCheck/requestDraftCheck
 * @param {function} [options.onProgress] called with 0–100 as the check advances
 * @param {AbortSignal} [options.signal]  abort to stop polling (e.g. on unmount)
 * @returns {Promise<object>} the SimilarityReport
 * @throws  when the check fails, times out, or the request is aborted
 */
export async function pollCheck(job, { onProgress, signal } = {}) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let state = job;
  while (state.status === 'queued' || state.status === 'running') {
    if (signal?.aborted) throw new Error('Check cancelled.');
    if (Date.now() > deadline) throw new Error('The originality check timed out.');
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    if (signal?.aborted) throw new Error('Check cancelled.');
    state = await getCheckStatus(job.id);
    onProgress?.(Number(state.progress_pct) || 0);
  }
  if (state.status === 'failed') {
    throw new Error(state.error || 'The originality check failed.');
  }
  onProgress?.(100);
  return getReport(job.id);
}

/**
 * Read the platform screening configuration.
 *
 *   GET /api/analysis/settings/
 *   200  ScreeningSettings — see data/similarity.js
 *   403  caller is not an admin
 *
 * Thresholds are a platform-wide policy, so this is admin-only to write. Editors
 * see the resulting bands but do not set them.
 */
export function getScreeningSettings() {
  return request('/api/analysis/settings/', { method: 'GET' });
}

/**
 * Update the screening configuration.
 *
 *   PATCH /api/analysis/settings/
 *   body     any subset of { review_threshold, high_threshold, exclude_quotes,
 *                            exclude_bibliography, min_words, auto_flag }
 *   200      ScreeningSettings
 *   403      caller is not an admin
 *   422      review_threshold >= high_threshold, or a value outside 0–100
 *
 * Changing a threshold re-bands existing reports on read; it must NOT re-run any
 * check. Every change writes to audit_logs (type 'screening_settings').
 */
export function patchScreeningSettings(patch) {
  return request('/api/analysis/settings/', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
