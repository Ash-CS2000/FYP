// Sidebar nav configurations per role
import { myAssignments } from './invitations.js';

// Badges on the reviewer's entries. Like FLAGGED_COUNT below, these are read once
// at module load — a response made this session shows on the next full page load.
const MY_ASSIGNMENTS = myAssignments();
const INVITED_COUNT = MY_ASSIGNMENTS.filter(a => a.status === 'invited').length;
const ACCEPTED_COUNT = MY_ASSIGNMENTS.filter(a => a.status === 'accepted').length;

// Badge on the editor's Screening entry: submissions sitting in the flagged band.
// Evaluated once at module load, like the other badge numbers here — an admin
// threshold change shows up on the next full page load.


const ICONS = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  papers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14"/></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H2a2 2 0 010-4h.09A1.65 1.65 0 004.6 8a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V2a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H22a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 113 3L12 15l-4 1 1-4z"/></svg>,
  done: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="17" cy="11" r="3"/></svg>,
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  log: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  award: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  exam: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
};

export function getMergedSidebar(roles = []) {
  const active = roles.filter(r => SIDEBAR_CONFIG[r]);
  const base = SIDEBAR_CONFIG[active[0]] || SIDEBAR_CONFIG.author;
  if (active.length <= 1) {
    return base;
  }
  // Clone sections AND their item arrays so we never mutate the shared
  // module-level SIDEBAR_CONFIG (that pollution persists for the whole session).
  const mergedSections = base.sections.map(s => ({ ...s, items: [...s.items] }));
  for (const r of active.slice(1)) {
    for (const section of SIDEBAR_CONFIG[r].sections) {
      const existing = mergedSections.find(s => s.title === section.title);
      if (existing) {
        existing.items = [...existing.items, ...section.items];
      } else {
        mergedSections.push({ ...section, items: [...section.items] });
      }
    }
  }
  return { ...base, sections: mergedSections };
}

export const SIDEBAR_CONFIG = {
  author: {
    role: 'Author',
    user: { name: 'Ahmad Razif', initials: 'AR', role: 'Computer Science · UTM' },
    sections: [
      {
        title: 'Training',
        items: [
          { id: 'training',    label: 'Training Modules',  to: '/author/training',    icon: ICONS.book },
          { id: 'progress',    label: 'My Progress',       to: '/author/progress',    icon: ICONS.done },
          { id: 'assessment',  label: 'Final Assessment',  to: '/author/assessment',  icon: ICONS.exam },
          { id: 'certificate', label: 'Certificate',       to: '/author/certificate', icon: ICONS.award },
          { id: 'resources',   label: 'Resources',         to: '/author/resources',   icon: ICONS.list },
        ],
      },
      {
        title: 'Workspace',
        items: [
          { id: 'dashboard', label: 'Dashboard',   to: '/author/dashboard', icon: ICONS.dashboard },
          { id: 'papers',    label: 'My Papers',   to: '/author/papers',    icon: ICONS.papers },
          { id: 'discover', label: 'Discover Topics', to: '/author/discover', icon: ICONS.search },
          { id: 'submit',    label: 'Submit Paper', to: '/author/submit',    icon: ICONS.plus },
          { id: 'revision',  label: 'Revisions',   to: '/author/revision',  icon: ICONS.refresh, badge: 1 },
        ],
      },
      {
        title: 'Account',
        items: [
          { id: 'notifications', label: 'Notifications', to: '/author/notifications', icon: ICONS.bell, badge: 3 },
          { id: 'profile',       label: 'Profile',       to: '/author/profile',       icon: ICONS.user },
          { id: 'settings',      label: 'Settings',      to: '/author/settings',      icon: ICONS.settings },
        ],
      },
    ],
  },
  reviewer: {
    role: 'Reviewer',
    user: { name: 'Dr. Lim Wei Ping', initials: 'LW', role: 'Senior Reviewer · UM' },
    sections: [
      {
        title: 'Reviews',
        items: [
          { id: 'dashboard', label: 'Dashboard', to: '/reviewer/dashboard', icon: ICONS.dashboard },
          { id: 'invitations', label: 'Invitations', to: '/reviewer/invitations', icon: ICONS.bell, badge: INVITED_COUNT },
          { id: 'assigned', label: 'Assigned', to: '/reviewer/assigned', icon: ICONS.check, badge: ACCEPTED_COUNT },
          { id: 'completed', label: 'Completed', to: '/reviewer/completed', icon: ICONS.done },
        ],
      },
      {
        title: 'Account',
        items: [
          { id: 'notifications', label: 'Notifications', to: '/reviewer/notifications', icon: ICONS.bell },
          { id: 'profile', label: 'Profile', to: '/reviewer/profile', icon: ICONS.user },
        ],
      },
    ],
  },
  editor: {
    role: 'Chief Editor',
    user: { name: 'Prof. Hassan Ibrahim', initials: 'HI', role: 'Editor-in-Chief' },
    sections: [
      {
        title: 'Editorial',
        items: [
          { id: 'dashboard', label: 'Dashboard', to: '/editor/dashboard', icon: ICONS.dashboard },
          { id: 'submissions', label: 'All Submissions', to: '/editor/submissions', icon: ICONS.papers },
          { id: 'pending', label: 'Pending Decision', to: '/editor/pending', icon: ICONS.clock, badge: 5 },
          { id: 'screening', label: 'Screening', to: '/editor/screening', icon: ICONS.check },
        ],
      },
      {
        title: 'Account',
        items: [
          { id: 'notifications', label: 'Notifications', to: '/editor/notifications', icon: ICONS.bell },
          { id: 'settings', label: 'Settings', to: '/editor/settings', icon: ICONS.settings },
        ],
      },
    ],
  },
  admin: {
    role: 'Administrator',
    user: { name: 'System Admin', initials: 'SA', role: 'Platform Administrator' },
    sections: [
      {
        title: 'System',
        items: [
          { id: 'dashboard', label: 'Dashboard', to: '/admin/dashboard', icon: ICONS.dashboard },
          { id: 'users', label: 'Manage Users', to: '/admin/users', icon: ICONS.users },
          { id: 'submissions', label: 'Submissions', to: '/admin/submissions', icon: ICONS.papers },
        ],
      },
      {
        title: 'Configuration',
        items: [
          { id: 'settings', label: 'System Settings', to: '/admin/settings', icon: ICONS.settings },
          { id: 'audit', label: 'Audit Log', to: '/admin/audit', icon: ICONS.log },
        ],
      },
    ],
  },
};
