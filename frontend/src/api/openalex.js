// src/api/openalex.js
//
// Discover Topics — research from across the literature, via OpenAlex.
//
// Deliberately separate from api/discovery.js. That module is the *journal's own*
// published library and still backs /search and the landing page unchanged.
// This one is external only: nothing PaperBridge published ever appears here,
// and nothing here has been through PaperBridge review. Keeping the two apart at
// the module level is what stops the two corpora bleeding into each other in a
// system whose entire claim is that its contents were peer-reviewed.
//
// ── Why this does not use authFetch ──────────────────────────────────────────
// Same reasoning as api/discovery.js: these routes are AllowAny with
// authentication_classes = [], so a bearer token buys nothing. authFetch()
// retries on 401 and, when the refresh fails, calls clearSession() and
// hard-redirects to /login — which would throw a browsing visitor at a login
// form mid-read. Plain fetch, no Authorization header, no redirect.
//
// ── Why the server proxies rather than the browser calling OpenAlex ──────────
// Caching (their rate limit is a shared resource and must not be spent per
// keystroke), the polite-pool contact address, and one place to normalise ids.
//
// SECURITY: nothing in this file is enforcement. Assume it can be bypassed.

import { API_URL } from '../config';

async function request(path, params) {
  const qs = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => v !== '' && v != null)
  ).toString();

  const res = await fetch(`${API_URL}${path}${qs ? `?${qs}` : ''}`);
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
  return res.json();
}

/**
 * The 26 top-level research fields, A–Z.
 *
 *   GET /api/discover/fields/
 *   200   Field[]
 *   502   OpenAlex unreachable
 *
 * Field = {
 *   id           string  short form, e.g. '17' — never the full OpenAlex URL
 *   name         string  e.g. 'Computer Science'
 *   domain       string  one of the 4 domains, e.g. 'Physical Sciences'
 *   description  string  '' when OpenAlex has none
 *   works_count  number
 * }
 *
 * Fetched, never hardcoded — the same lesson data/topics.js records about our
 * own categories. OpenAlex has revised this classification before and a
 * vocabulary written into the frontend is wrong the day they revise it again.
 * There are 26 today; the UI must not assume that number.
 */
export function listFields() {
  return request('/api/discover/fields/');
}

/**
 * Research topics within a field, most active first.
 *
 *   GET /api/discover/fields/:id/topics/?limit=
 *   200   Topic[]
 *   502   OpenAlex unreachable
 *
 * Topic = {
 *   id           string  short form, e.g. 'T11714'
 *   name         string
 *   description  string
 *   subfield     string  the intermediate level, e.g. 'Artificial Intelligence'
 *   keywords     string[]
 *   works_count  number  how much is published here — the signal that makes
 *                        this page useful for deciding what to write about
 *   cited_by_count number
 * }
 *
 * Sorted by works_count because the question this page answers is "where is
 * there an active conversation", not "what is alphabetically first".
 */
export function listFieldTopics(fieldId, { limit } = {}) {
  return request(`/api/discover/fields/${encodeURIComponent(fieldId)}/topics/`, { limit });
}

/**
 * Papers whose primary topic is this one.
 *
 *   GET /api/discover/topics/:id/works/?sort=&limit=
 *   200   Work[]
 *   502   OpenAlex unreachable
 *
 * sort: 'cited' (default) | 'recent'
 *
 * Work = {
 *   id            string    short form, e.g. 'W2194775991'
 *   title         string
 *   abstract      string    reconstructed server-side from OpenAlex's inverted
 *                           index; '' when they hold none
 *   doi           string    full https://doi.org/… URL, or '' — the ONLY link
 *                           the UI should offer. Never route an external work
 *                           to a PaperBridge page.
 *   year          number|null
 *   authors       string[]  display names only
 *   institutions  string[]
 *   venue         string    journal or repository, '' when unknown
 *   cited_by_count number
 *   is_open_access bool
 * }
 *
 * Summaries only. We deliberately do not mirror PDFs: the metadata above is
 * broadly reusable, the full text is not ours to redistribute.
 */
export function listTopicWorks(topicId, { sort = 'cited', limit } = {}) {
  return request(`/api/discover/topics/${encodeURIComponent(topicId)}/works/`, { sort, limit });
}

/**
 * Search works across the literature, optionally within one field.
 *
 *   GET /api/discover/works/?q=&field=&sort=&limit=
 *   200   Work[]
 *   400   q missing or too short
 *   502   OpenAlex unreachable
 *
 * Server-side, unlike the journal's own library. matchesQuery() in
 * data/topics.js filters the whole corpus in memory, which is fine for 22 rows
 * and impossible for OpenAlex's ~250 million — so search moves to the server
 * here and stays submit-driven rather than firing per keystroke.
 */
export function searchWorks({ q, field = '', sort = 'cited', limit } = {}) {
  return request('/api/discover/works/', { q, field, sort, limit });
}
