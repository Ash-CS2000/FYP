// src/api/users.js
//
// The caller's own profile. Real — talks to Django's /api/users/me/.

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
 * The caller's own profile.
 *
 *   GET /api/users/me/
 *   200  the current user, including institution/expertise_areas/
 *        research_areas/availability_status/specialty_tags
 */
export function getMe() {
  return request('/api/users/me/');
}

/**
 * Update the caller's own profile.
 *
 *   PATCH /api/users/me/
 *   body   any subset of { institution, expertise_areas, research_areas,
 *          availability_status, specialty_tags }
 *   200    the updated user
 */
export function updateProfile(patch) {
  return request('/api/users/me/', { method: 'PATCH', body: JSON.stringify(patch) });
}
