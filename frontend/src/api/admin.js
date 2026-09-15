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
import { authFetch } from './auth';

// Roles an admin may grant/revoke through the roles endpoint. 'admin' is
// deliberately excluded: it is invite-only, never a promotion.
export const PROMOTABLE_ROLES = ['editor'];

async function request(path, options) {
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
 *   200      the user row, same shape as listUsers() — also returned unchanged
 *            when the request is a no-op (granting a role already held)
 *   400      action is not 'grant' or 'revoke'
 *   403      caller is not an admin, or the target is an admin
 *   404      no such user
 *   409      revoking would leave the user with no active role — deactivate
 *            the account instead
 *   422      role is not promotable (e.g. 'admin')
 *
 * The server MUST reject role: 'admin' here — admin is invite-only. It must
 * also refuse to touch an admin's roles at all, or an admin could grant
 * themselves editor and make decisions they are otherwise barred from. Every
 * change (not no-ops) writes an audit entry of type 'role_change'.
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
 * Onboard an editor. Admin enters a name + email, plus profile fields to
 * carry over (looked up from an existing user or typed fresh):
 *   - email already has an account  → editor role added, profile fields
 *                                      applied, they get an email
 *   - new person                    → a pending invite (carrying the same
 *                                      fields) + activation-link email
 *
 *   POST /api/users/editors/
 *   body     { email, name, institution?, specialty_tags?, orcid_id? }
 *   201      { status: 'invited', email, expires_at, institution, specialty_tags, orcid_id }
 *   200      { status: 'role_added' | 'already_editor', email, detail }
 *   400      invalid email or unknown specialty tag
 *   403      caller is not an admin
 *
 * Token generation, expiry and email delivery are entirely server-side.
 */
export function onboardEditor({ email, name, institution = '', specialty_tags = [], orcid_id = '' }) {
  return request('/api/users/editors/', {
    method: 'POST',
    body: JSON.stringify({
      email: String(email).trim().toLowerCase(),
      name: String(name).trim(),
      institution: String(institution).trim(),
      specialty_tags,
      orcid_id: String(orcid_id).trim(),
    }),
  });
}

/**
 * Pending (unaccepted) editor invites.
 *
 *   GET /api/users/editors/
 *   200  { id, email, name, institution, specialty_tags, orcid_id, created_at, expires_at, expired }[]
 *   403  caller is not an admin
 */
export function listEditorInvites() {
  return request('/api/users/editors/', { method: 'GET' });
}

/**
 * Cancel a pending editor invite (e.g. sent to the wrong address).
 *
 *   DELETE /api/users/editors/:id/
 *   204  cancelled
 *   403  caller is not an admin
 *   404  no such invite
 *   409  already accepted — manage the user account instead
 */
export function cancelEditorInvite(inviteId) {
  return request(`/api/users/editors/${inviteId}/`, { method: 'DELETE' });
}

/**
 * Change an account's status. This is the lever that stops someone using the
 * platform without erasing what they did on it.
 *
 *   PATCH /api/users/:id/status/
 *   body     { status: 'active' | 'suspended' | 'deactivated', reason, suspended_until? }
 *            reason           required unless status is 'active'
 *            suspended_until  'YYYY-MM-DD', optional, 'suspended' only; must be
 *                             a future date. The account reactivates itself on
 *                             that date. Omit for an open-ended suspension.
 *   200      the user row (same shape as listUsers()), plus
 *            released_reviews: number   review assignments handed back to editors
 *   400      unknown status, missing reason, a bad / past suspended_until, or
 *            the caller targeted themselves (use DELETE /api/users/me/)
 *   403      caller is not an admin, or the target is an admin
 *   404      no such user
 *
 * The three states are genuinely different, and listUsers() reports which one
 * an account is in:
 *   active       normal.
 *   suspended    temporary — "stop for now". Login refused, dropped from the
 *                reviewer candidate pool, held reviews released. Shown with its
 *                end date, if any, and lifted automatically on that date.
 *   deactivated  soft delete — "this person is done here". Same restrictions,
 *                no end date, and hidden from the default user list. An admin
 *                can still restore it.
 *
 * Neither DELETES anything. A reviewer's already-submitted reviews still count
 * toward their manuscripts, and an author's published papers stay published.
 * Deleting a user would tear holes in the editorial record.
 *
 * Released reviews: every invitation the user has not answered and every review
 * they accepted but have not submitted is closed as 'declined', with a note that
 * an administrator released it, and the inviting editor is notified so they can
 * invite someone else. Reactivating an account does NOT restore those — the
 * editor may already have replaced the reviewer.
 *
 * Two rules the server owns:
 *   1. An admin may not change their own status — locking yourself out is not a
 *      recoverable mistake.
 *   2. An admin may not suspend or deactivate another admin. Admin is invite-only
 *      (see inviteAdmin) and mutual lockouts between admins are the failure mode
 *      that follows from allowing it.
 *
 * Writes an 'account_status' audit entry with the reason, the end date and the
 * released assignments. An automatic lift at the end of a suspension writes one
 * too, with no actor.
 */
export function patchUserStatus(userId, status, reason, suspendedUntil = '') {
  if (!['active', 'suspended', 'deactivated'].includes(status)) {
    throw new Error(`Unsupported account status: ${status}`);
  }
  const body = { status, reason };
  if (status === 'suspended' && suspendedUntil) body.suspended_until = suspendedUntil;
  return request(`/api/users/${userId}/status/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export const USERS_PAGE_SIZE = 20;

/**
 * One page of users, newest first. Admin only. Searching, filtering and counting
 * all happen on the server — the browser never holds more than one page, so the
 * cost of this call does not grow with the size of the platform.
 *
 *   GET /api/users/?page=&page_size=&search=&role=&status=&reviewer_status=
 *       page             1-based, default 1. A page past the end returns no results.
 *       page_size        default 20, max 100
 *       search           case-insensitive, matches email, first name, last name
 *                        and the full name ("Ye Htet" finds "Ye Htet Kyaw")
 *       role             author | reviewer | editor | admin — holds that role, active
 *       status           omit → every account that is not deleted (active + suspended)
 *                        active | suspended | deactivated
 *       reviewer_status  pending → has a reviewer application awaiting a decision
 *
 *   200  {
 *          results:   UserRow[],
 *          total:     number of users matching every filter,
 *          page, page_size,
 *          counts:    { all, author, reviewer, editor, admin, suspended, deleted }
 *        }
 *   400  unknown role, status or reviewer_status
 *   403  caller is not an admin
 *
 *   UserRow { id, name, email, roles, reviewer_status, institution, avatar_key,
 *             specialty_tags, orcid_id, website, expertise_areas, research_areas,
 *             degree, professional_type, status, suspended_until, is_active, joined }
 *
 * `counts` respects `search` but ignores `role` and `status`, so the filter chips
 * say how many matches sit behind each one. `all` and the role counts exclude
 * deleted accounts, matching what those filters show.
 */
export function listUsers({ page = 1, pageSize = USERS_PAGE_SIZE, search = '', role = '', status = '', reviewerStatus = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search.trim()) params.set('search', search.trim());
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  if (reviewerStatus) params.set('reviewer_status', reviewerStatus);
  return request(`/api/users/?${params.toString()}`, { method: 'GET' });
}

/**
 * The audit trail. Admin only, newest first.
 *
 *   GET /api/audit-logs/?type=&actor=&from=&to=&limit=&offset=
 *       type    one of the types below; omit for every type
 *       actor   case-insensitive match on the actor's name or email
 *       from/to ISO dates (YYYY-MM-DD), inclusive
 *       limit   default 50, max 200
 *   200  { results: AuditRow[], total, limit, offset }
 *   400  unknown type, or a malformed date
 *   403  caller is not an admin
 *
 *   AuditRow {
 *     id, type, action, summary,
 *     actor_name, actor_email,        snapshots taken when the entry was written,
 *     target_name, target_email,      so a later rename cannot rewrite history
 *     role, reason, details, ip_address, created_at
 *   }
 *
 *   type             action
 *   role_change      grant · revoke · approve · reject
 *   account_status   suspended · deactivated · reactivated
 *   invitation       invite · cancel
 *   settings_change  update
 *   decision         the decision type (accept, reject, minor, major, desk_reject)
 *   screening        the screening action
 *   assignment       invite
 *   login_failure    failed
 *   security         revoke_all_sessions
 *
 * The log is append-only. There is no endpoint to create, edit or delete a row
 * and there must not be one — entries are only ever written by the server as a
 * side effect of the action itself. An audit trail an admin can rewrite is not
 * an audit trail, and admins are exactly the people it exists to hold
 * accountable.
 */
export function listFullAuditLog({ type = '', actor = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (type) params.set('type', type);
  if (actor) params.set('actor', actor);
  return request(`/api/audit-logs/?${params.toString()}`, { method: 'GET' });
}

/** The newest role changes only, as a plain array — for the panel on Manage Users. */
export function listAuditLog({ limit = 10 } = {}) {
  return listFullAuditLog({ type: 'role_change', limit }).then(res => res.results);
}

/**
 * Live health of the services the platform depends on. Admin only.
 *
 *   GET /api/system/health/?refresh=1
 *       refresh   bypass the server's 30-second cache and check again now
 *   200  {
 *          overall:     'operational' | 'degraded' | 'down',
 *          checked_at:  ISO timestamp of when these checks actually ran,
 *          checks: [
 *            { key, label, status, value, detail }
 *              key     'database' | 'storage' | 'plagiarism_engine' | 'signed_in_users'
 *              status  'ok' | 'degraded' | 'down' | 'info'
 *              value   short headline, e.g. '87 ms', 'Connected', 'Not configured', '6'
 *              detail  one line of explanation
 *          ],
 *          sessions_revoked_at:  ISO timestamp of the last "sign out everyone", or null
 *          sessions_revoked_by:  name of the admin who did it, or ''
 *        }
 *   403  caller is not an admin
 *
 * Every value is measured, never estimated. `overall` is the worst status among
 * the checks; 'info' checks (signed-in users) never affect it. Uptime is not
 * reported: a server cannot record the time it was down, so that figure would
 * have to be invented.
 */
export function getSystemHealth({ refresh = false } = {}) {
  return request(`/api/system/health/${refresh ? '?refresh=1' : ''}`, { method: 'GET' });
}

/**
 * Who is signed in. Admin only. Newest sign-in first.
 *
 *   GET /api/system/signed-in-users/?page=&page_size=&search=&role=
 *       page / page_size / search   as listUsers()
 *       role    author | reviewer | editor | admin
 *   200  {
 *          results: [{ id, name, email, roles, avatar_key, institution, last_signed_in }],
 *          total, page, page_size,
 *          counts:      { all, author, reviewer, editor, admin }   respects search, ignores role
 *          window_days: how long a login stays valid (7)
 *        }
 *   400  unknown role
 *   403  caller is not an admin
 *
 * "Signed in" means an active account holding a login that still works: not
 * expired, not ended by "sign out everyone". `last_signed_in` is when that login
 * was last issued — a sign-in, or the automatic renewal roughly every 8 hours of
 * use. It is not a live "online now" signal, and must not be labelled as one.
 */
export function listSignedInUsers({ page = 1, pageSize = USERS_PAGE_SIZE, search = '', role = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search.trim()) params.set('search', search.trim());
  if (role) params.set('role', role);
  return request(`/api/system/signed-in-users/?${params.toString()}`, { method: 'GET' });
}

/**
 * Sign every user out, immediately. Admin only. For security incidents — a
 * leaked password, a compromised account.
 *
 *   POST /api/system/sessions/revoke-all/
 *   body  { reason }   required, recorded in the audit log
 *   200   { revoked_at, signed_out_users, access, refresh }
 *         access/refresh are fresh tokens for the caller, so the admin who
 *         pressed the button stays signed in. Save them straight away — the
 *         caller's old tokens stopped working with everyone else's.
 *   400   missing reason
 *   403   caller is not an admin
 *
 * "Immediately" is real, not "when their login next expires": every request
 * compares its token's issue time with revoked_at, so a token issued before
 * the button was pressed is refused on its very next use. In a deployment with
 * several server processes, the others pick the change up within 5 seconds.
 * Writes a 'security' audit entry with the reason and how many people were
 * signed out.
 */
export function signOutEveryone(reason) {
  return request('/api/system/sessions/revoke-all/', {
    method: 'POST',
    body: JSON.stringify({ reason: String(reason || '').trim() }),
  });
}
