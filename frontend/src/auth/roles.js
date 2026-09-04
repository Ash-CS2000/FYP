// src/auth/roles.js
// Single source of truth for role identity and post-auth routing.
// Keep every "where does this role go?" decision here — do not re-declare
// route maps in pages/components.
import { getStoredUser } from '../utils/user.js';


import { isTrained } from '../data/trainingProgress.js';

export const WORKSPACE_ROUTES = {
  author:   '/author/dashboard',
  reviewer: '/reviewer/dashboard',
  editor:   '/editor/dashboard',
  admin:    '/admin/dashboard',
};

export const ROLE_LABELS = {
  author:   'Author',
  reviewer: 'Reviewer',
  editor:   'Editor',
  admin:    'Admin',
};

export const ROLE_DESCRIPTIONS = {
  author:   'Submit manuscripts for peer review and track your publication journey.',
  reviewer: 'Evaluate assigned manuscripts and submit structured reviews.',
  editor:   'Manage the editorial queue and make decisions on submissions.',
  admin:    'Administer users, roles, and platform settings.',
};

const ACTIVE_ROLE_KEY = 'paperbridge-active-role';

// Read the logged-in user (works for both demo and real backend sessions,
// since both persist a `user` object in localStorage). Re-exported from
// utils/user.js rather than reimplemented — this file used to carry a second
// copy, and two implementations of "who is signed in" is one too many.
export { getStoredUser } from '../utils/user.js';

// A session exists if we have a stored user. Demo accounts have no JWT, so we
// deliberately do NOT gate on the access token here.
export function isAuthenticated() {
  return !!getStoredUser();
}

// Normalise a user object into an array of role strings.
// Supports both `roles: [...]` (multi-role) and legacy single `role`.
export function getRoles(user) {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length) return user.roles;
  if (user.role) return [user.role];
  return [];
}

export function getActiveRole() {
  return localStorage.getItem(ACTIVE_ROLE_KEY) || '';
}

export function setActiveRole(role) {
  if (role) localStorage.setItem(ACTIVE_ROLE_KEY, role);
}

// Reviewing is approval-gated: an admin has to accept the application before
// the reviewer workspace opens. Fail closed — anything other than an explicit
// 'active' counts as still pending.
export function isReviewerActive(user) {
  return !!user && user.reviewer_status === 'active';
}

// Where a single role's workspace actually starts for this user. Role alone
// isn't always enough: an author who hasn't passed the final assessment starts
// in training, and an unapproved reviewer starts on the pending screen. Kept
// here (rather than in the pages) so every caller — LoginPage, RegisterPage,
// OrcidCallback, ProtectedRoute, the sidebar switcher — agrees.
export function workspaceEntry(role, user = getStoredUser()) {
  if (role === 'author' && !isTrained()) return '/author/training';
  if (role === 'reviewer' && !isReviewerActive(user)) return '/reviewer/pending';
  return WORKSPACE_ROUTES[role] || '/';
}

// Decide where a user should land immediately after authenticating.
//  - no roles        → home
//  - exactly 1 role  → that role's workspace entry
//  - multiple roles  → workspace picker
export function landingRoute(user) {
  const roles = getRoles(user);
  if (roles.length === 0) return '/';
  if (roles.length > 1) return '/select-workspace';
  return workspaceEntry(roles[0], user);
}
