// src/api/account.js
//
// The signed-in user's own account: profile fields, preferences, password and
// avatar. This module is the specification the backend implements against — if a
// shape changes, change it here first.
//
// ── Name of record vs. display name ──────────────────────────────────────────
// `name`, `first_name`, `last_name` and `email` are the name of record. They
// appear on submissions, decision letters and certificates, so they are
// read-only here and read-only on the server (UserSerializer.read_only_fields).
// Sending them is not an error — they are silently ignored. Correcting a legal
// name goes through an editor.
//
// `display_name` (the nickname) is the editable one, and it is what the sidebar,
// avatar and greetings render.
//
// SECURITY: the locks in this file are not enforcement. They stop honest
// mistakes and document intent. The server independently rejects writes to
// read-only fields — assume this file can be bypassed.

import { API_URL } from '../config';
import { authFetch, saveTokens } from './auth';

// Keys accepted inside the `preferences` JSON blob. The server whitelists the
// same set; anything else is rejected rather than silently stored, so that the
// field does not decay into a dumping ground.
export const PREFERENCE_KEYS = [
  // General
  'language', 'timezone', 'date_format', 'theme',
  // Notifications
  'notify_email_digest', 'notify_in_app', 'notify_weekly_summary', 'notify_reviewer_reminders',
  // Privacy
  'privacy_visibility', 'privacy_signed_reviews',
  // Reviewing (no columns of their own — see ReviewerProfileCard in Profile.jsx)
  'availability', 'unavailable_until', 'max_concurrent', 'credentials',
];

export const DEFAULT_PREFERENCES = {
  language: 'en',
  timezone: 'Asia/Kuala_Lumpur',
  date_format: 'dmy',
  theme: 'light',
  notify_email_digest: true,
  notify_in_app: true,
  notify_weekly_summary: false,
  notify_reviewer_reminders: true,
  privacy_visibility: 'community',
  privacy_signed_reviews: false,
  availability: 'available',
  unavailable_until: '',
  max_concurrent: 3,
  credentials: '',
};

// Same contract as admin.js's helper, with one addition: DRF returns field
// errors as { field: ["msg"] } rather than { detail }, and the password form
// needs to place those against the right input. The flattened map is attached
// as err.fields.
async function request(path, options) {
  const res = await authFetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    let detail = '';
    let fields = {};
    try {
      const body = await res.json();
      detail = body?.detail || body?.error || '';
      if (body && typeof body === 'object') {
        for (const [key, value] of Object.entries(body)) {
          if (key === 'detail' || key === 'error') continue;
          fields[key] = Array.isArray(value) ? value.join(' ') : String(value);
        }
      }
      // No `detail`, but field errors — surface the first as the message so a
      // caller that only reads err.message still says something useful.
      if (!detail) detail = Object.values(fields)[0] || '';
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(detail || `Request failed (${res.status})`);
    err.status = res.status;
    err.fields = fields;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

/**
 * The signed-in user.
 *
 *   GET /api/users/me/
 *   200 User
 *
 * User = {
 *   id, email, name, first_name, last_name,   // name of record — read-only
 *   display_name,                             // nickname — editable
 *   role, status, roles[], reviewer_status,   // read-only
 *   institution, bio, website, research_areas,
 *   preferences,                              // object, see PREFERENCE_KEYS
 *   avatar_key,                               // '' when no photo is set
 * }
 */
export function getMe() {
  return request('/api/users/me/', { method: 'GET' });
}

/**
 * Update your own profile. Partial — send only what changed.
 *
 *   PATCH /api/users/me/
 *   body  { display_name?, institution?, bio?, website?, research_areas?, preferences? }
 *   200   the updated User
 *   400   field errors
 *
 * `name`, `email`, `role`, `status`, `roles` and `reviewer_status` are read-only
 * and ignored if sent.
 */
export function updateMe(patch) {
  return request('/api/users/me/', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/**
 * Change some preferences, leaving the rest alone.
 *
 * Preferences are one JSON column holding many independent settings, so the
 * server merges this patch into what is already stored rather than replacing
 * the object — saving a timezone does not wipe someone's notification choices,
 * and two tabs saving different sections do not clobber each other. Send only
 * what changed.
 */
export function updatePreferences(patch) {
  return updateMe({ preferences: patch });
}

/**
 * Change your password.
 *
 *   POST /api/users/me/password/
 *   body  { current_password, new_password }
 *   200   { access, refresh }  — a fresh pair; the old refresh token is revoked
 *   400   { current_password: [...] } or { new_password: [...] }
 *   429   throttled (password_reset scope, 3/hour)
 *
 * Changing a password invalidates the existing refresh token, so the server
 * hands back a new pair and this stores it — otherwise the user would be
 * silently signed out on their next token refresh.
 */
export async function changePassword(currentPassword, newPassword) {
  const data = await request('/api/users/me/password/', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (data?.access) saveTokens(data.access, data.refresh);
  return data;
}

// Upload limits. Mirrored on the server, which is the one that counts.
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Set your profile photo.
 *
 *   PUT  /api/users/me/avatar/
 *   body multipart/form-data, field `avatar`
 *   200  the updated User (avatar_key now set)
 *   400  wrong type, or larger than AVATAR_MAX_BYTES
 *
 * authFetch omits Content-Type for FormData bodies so the browser can set the
 * multipart boundary itself.
 */
export function uploadAvatar(file) {
  const body = new FormData();
  body.append('avatar', file);
  return request('/api/users/me/avatar/', { method: 'PUT', body });
}

/**
 * Remove your profile photo and fall back to generated initials.
 *
 *   DELETE /api/users/me/avatar/
 *   200    the updated User (avatar_key now '')
 */
export function removeAvatar() {
  return request('/api/users/me/avatar/', { method: 'DELETE' });
}

/**
 * A stable, public URL for a user's photo, for use as an <img src>.
 *
 *   GET /api/users/:id/avatar/  →  302 to a presigned Supabase URL
 *
 * The bucket is private and its presigned URLs expire in an hour, while an
 * access token lasts eight — and an <img> tag cannot carry an Authorization
 * header anyway. So the src points at this stable endpoint and the server
 * re-signs on every request. Avatars are shown to other users regardless, so
 * the redirect itself needs no auth.
 *
 * Returns null when the user has no photo, so callers can render initials
 * without a round trip.
 */
export function avatarUrl(user) {
  if (!user?.id || !user?.avatar_key) return null;
  return `${API_URL}/api/users/${user.id}/avatar/`;
}
