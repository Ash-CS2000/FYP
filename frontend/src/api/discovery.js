// src/api/discovery.js
//
// The public research library — published manuscripts, readable by anyone.
//   GET /api/manuscripts/published/            → published manuscripts
//   GET /api/manuscripts/published/categories/ → the categories that exist
//
// Like api/editorial.js and api/admin.js, every call here carries its request /
// response contract — this module is the specification the backend implements
// against.
//
// ── Why this module does not use authFetch ───────────────────────────────────
// Two of the three callers (/ and /search) are public routes, reachable logged
// out. authFetch() retries on 401 and, when the refresh fails or there is no
// refresh token at all, calls clearSession() and hard-redirects to /login. An
// anonymous visitor browsing the library would be thrown at a login form, and a
// signed-in author holding a stale refresh token would be silently signed out
// mid-browse. Both endpoints below are AllowAny and the server sets
// authentication_classes = [], so a bearer token buys nothing here. Plain fetch,
// no Authorization header, no redirect.
//
// ── Fields this endpoint must never return ───────────────────────────────────
// It reads the same table as api/manuscripts.js, whose serializer carries a
// signed Supabase file_url plus cover_letter, competing, ethics, funder and
// data_statement. None of those are public. The server answers this route from
// its own narrow serializer (PublishedManuscriptSerializer). A field showing up
// here that is not in the documented shape below is a leak, not a feature.
//
// SECURITY: nothing in this file is enforcement. Assume it can be bypassed.

import { API_URL } from '../config';

async function request(path) {
  const res = await fetch(`${API_URL}${path}`);
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
 * The public library: published manuscripts, newest first.
 *
 *   GET /api/manuscripts/published/?q=&category=&limit=
 *   200   Topic[]
 *   429   rate limited (throttle scope 'discovery', 120/min)
 *
 * Topic = {
 *   id            number
 *   title         string
 *   abstract      string   the full abstract — clamp in CSS, not here
 *   article_type  string
 *   category      string   the research area; '' when the author left it blank
 *   sub_category  string
 *   keywords      string[] parsed from the stored comma string, [] when blank
 *   institutions  string[] byline institutions, order preserved, [] when none
 *   authors       string[] display names only — no emails, no ORCIDs
 *   published_at  string   ISO 8601, never null on a published row
 * }
 *
 * Only status === 'published' is ever returned. An accepted manuscript has
 * cleared review but has not been released, and listing it here would leak the
 * paper early — publishManuscript() in api/editorial.js is what moves it.
 *
 * No pagination: a bare array capped by `limit` (server default and ceiling
 * 200). Every list endpoint in this app returns a bare array; the envelope
 * precedent, if one is ever genuinely needed, is listFullAuditLog in api/admin.js.
 */
export function listPublishedTopics({ q = '', category = '', limit } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return request(`/api/manuscripts/published/${qs ? `?${qs}` : ''}`);
}

/**
 * Every research category with at least one published paper, A–Z.
 *
 *   GET /api/manuscripts/published/categories/
 *   200   string[]
 *
 * Its own endpoint rather than something the caller derives from a filtered
 * list: once you filter by category the response contains only that category,
 * so a dropdown built from the rows would collapse to the option just picked.
 *
 * Derived from the data, never hardcoded — the seeded corpus and the submission
 * form's category <select> do not agree, so any vocabulary written down in the
 * frontend is wrong on day one. Callers prepend their own 'All' sentinel; that
 * is a UI affordance, not a category.
 */
export function listPublishedCategories() {
  return request('/api/manuscripts/published/categories/');
}
