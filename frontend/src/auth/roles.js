// src/auth/roles.js
// Single source of truth for role identity and post-auth routing.
// Keep every "where does this role go?" decision here — do not re-declare
// route maps in pages/components.

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
// since both persist a `user` object in localStorage).
export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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

// Decide where a user should land immediately after authenticating.
//  - no roles        → home
//  - exactly 1 role  → that role's workspace
//  - multiple roles  → workspace picker
export function landingRoute(user) {
  const roles = getRoles(user);
  if (roles.length === 0) return '/';
  if (roles.length > 1) return '/select-workspace';
  return WORKSPACE_ROUTES[roles[0]] || '/';
}
