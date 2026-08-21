// src/api/admin.js
//
// Every admin-only mutation lives here, and each one carries its request /
// response contract. This module is the specification the backend implements
// against — if a shape changes, change it here first.
//
// ── Role-creation model ──────────────────────────────────────────────────────
//   author   self-registers, active immediately
//   reviewer self-applies, created PENDING, an admin approves
//   editor   never self-registers; an admin promotes an existing user
//   admin    first is seeded at deployment; later ones come from an invite
//
// SECURITY: none of the checks in this file are enforcement. They stop honest
// mistakes and document intent. The server must independently authorise every
// call below — assume this file can be bypassed.

import { API_URL } from '../config';

// Roles an admin may grant/revoke through the roles endpoint. 'admin' is
// deliberately excluded: it is invite-only, never a promotion.
export const PROMOTABLE_ROLES = ['editor'];

function authHeaders() {
  const access = localStorage.getItem('access');
  return {
    'Content-Type': 'application/json',
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
  };
}

async function request(path, options) {
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
 * Approve or reject a pending reviewer application.
 *
 *   PATCH /api/users/:id/reviewer-status/
 *   body     { action: 'approve' | 'reject' }
 *   200      { id, roles: string[], reviewer_status: 'active'|'rejected', ... }
 *   403      caller is not an admin
 *   404      no such user
 *
 * On approve the server adds 'reviewer' to roles and sets reviewer_status
 * 'active'; on reject it removes the role and sets 'rejected'. Both must write
 * an audit_logs entry.
 */
export function patchReviewerStatus(userId, action) {
  if (!['approve', 'reject'].includes(action)) {
    throw new Error(`Unsupported reviewer action: ${action}`);
  }
  return request(`/api/users/${userId}/reviewer-status/`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

/**
 * Grant or revoke a role for an existing user. This is how editors are made.
 *
 *   PATCH /api/users/:id/roles/
 *   body     { role: 'editor', action: 'grant' | 'revoke' }
 *   200      { id, roles: string[], ... }
 *   403      caller is not an admin
 *   404      no such user
 *   422      role is not promotable (e.g. 'admin')
 *
 * The server MUST reject role: 'admin' here — admin is invite-only. Every call
 * must write an audit_logs entry recording actor, target, role and action.
 */
export function patchUserRole(userId, role, action) {
  if (!PROMOTABLE_ROLES.includes(role)) {
    throw new Error(`Role "${role}" cannot be granted by promotion. Admin is invite-only.`);
  }
  if (!['grant', 'revoke'].includes(action)) {
    throw new Error(`Unsupported role action: ${action}`);
  }
  return request(`/api/users/${userId}/roles/`, {
    method: 'PATCH',
    body: JSON.stringify({ role, action }),
  });
}

/**
 * Invite a new administrator. The only route to admin after the seeded first
 * one — there is no public form and no promotion path.
 *
 *   POST /api/admin/invites/
 *   body     { email, name, role: 'admin' }
 *   201      { id, email, name, role, status: 'pending', expires_at, invited_by }
 *   403      caller is not an admin
 *   409      an active invite already exists for that email
 *
 * Token generation, expiry and email delivery are entirely server-side; the
 * frontend never sees or handles the invite token. Must write an audit_logs
 * entry.
 */
export function inviteAdmin({ email, name }) {
  return request('/api/admin/invites/', {
    method: 'POST',
    body: JSON.stringify({ email: String(email).trim().toLowerCase(), name: String(name).trim(), role: 'admin' }),
  });
}

/**
 * Change an account's status. This is the lever that stops someone using the
 * platform without erasing what they did on it.
 *
 *   PATCH /api/users/:id/status/
 *   body     { status: 'active' | 'suspended' | 'deactivated', reason }
 *   200      { id, status, ... }
 *   400      unknown status, or missing reason on a non-'active' change
 *   403      caller is not an admin
 *   404      no such user
 *   409      the target is an admin — see below
 *
 * The three states are not interchangeable:
 *   active       normal.
 *   suspended    temporary and reversible. Login is refused; everything the user
 *                owns is untouched and comes back when they are reactivated.
 *   deactivated  the user is done here. Login refused, no invitations issued,
 *                removed from the reviewer candidate pool.
 *
 * Neither DELETES anything. A suspended reviewer's submitted reviews still count
 * toward their manuscripts, and a deactivated author's published papers stay
 * published. Deleting a user would tear holes in the editorial record.
 *
 * Two rules the server owns:
 *   1. An admin may not change their own status — locking yourself out is not a
 *      recoverable mistake.
 *   2. An admin may not suspend or deactivate another admin. Admin is invite-only
 *      (see inviteAdmin) and mutual lockouts between admins are the failure mode
 *      that follows from allowing it.
 *
 * In-flight work needs a decision, not silence: on suspend or deactivate, release
 * every review assignment the user is holding and tell the editors, or those
 * manuscripts stall indefinitely waiting on somebody who cannot log in.
 *
 * Must write an audit_logs entry with the reason.
 */
export function patchUserStatus(userId, status, reason) {
  if (!['active', 'suspended', 'deactivated'].includes(status)) {
    throw new Error(`Unsupported account status: ${status}`);
  }
  return request(`/api/users/${userId}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

/**
 * Read the role-change audit trail.
 *
 *   GET /api/audit-logs/?type=role_change&limit=N
 *   200  [{ id, actor_name, actor_email, action, target_name, target_email,
 *           role, created_at }]
 *
 * `action` is one of: 'grant' | 'revoke' | 'approve' | 'reject' | 'invite'.
 */
export function listAuditLog({ limit = 20 } = {}) {
  return request(`/api/audit-logs/?type=role_change&limit=${limit}`, { method: 'GET' });
}

/**
 * The full audit trail across every action type, for the dedicated log page.
 *
 *   GET /api/audit-logs/?type=&actor=&from=&to=&limit=&offset=
 *   200  { results: AuditRow[], total, limit, offset }
 *   403  caller is not an admin
 *
 * Types the platform is expected to record, beyond the role changes above:
 *   role_change · account_status · decision · screening · assignment ·
 *   withdrawal · settings_change · login_failure
 *
 * The log is append-only. There is no endpoint to edit or delete a row and there
 * must not be one — an audit trail an admin can rewrite is not an audit trail,
 * and admins are exactly the people it exists to hold accountable. Retention
 * trimming, if it is ever needed, belongs in a scheduled job outside the API.
 */
export function listFullAuditLog({ type = '', actor = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (type) params.set('type', type);
  if (actor) params.set('actor', actor);
  return request(`/api/audit-logs/?${params.toString()}`, { method: 'GET' });
}
