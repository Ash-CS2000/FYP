// Sidebar nav configurations per role
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
};

export const SIDEBAR_CONFIG = {
  author: {
    role: 'Author',
    user: { name: 'Ahmad Razif', initials: 'AR', role: 'Computer Science · UTM' },
    sections: [
      {
        title: 'Workspace',
        items: [
          { id: 'dashboard', label: 'Dashboard', to: '/author/dashboard', icon: ICONS.dashboard },
          { id: 'papers', label: 'My Papers', to: '/author/papers', icon: ICONS.papers },
          { id: 'submit', label: 'Submit Paper', to: '/author/submit', icon: ICONS.plus },
          { id: 'revision', label: 'Revisions', to: '/author/revision', icon: ICONS.refresh, badge: 1 },
        ],
      },
      {
        title: 'Account',
        items: [
          { id: 'notifications', label: 'Notifications', to: '/author/notifications', icon: ICONS.bell, badge: 3 },
          { id: 'profile', label: 'Profile', to: '/author/profile', icon: ICONS.user },
          { id: 'settings', label: 'Settings', to: '/author/settings', icon: ICONS.settings },
        ],
      },
    ],
  },
  user: {
    role: 'User',
    user: { name: 'Nur Aisyah', initials: 'NA', role: 'Research Portal User - UTM' },
    sections: [
      {
        title: 'Portal',
        items: [
          { id: 'papers', label: 'Discover Papers', to: '/user/papers', icon: ICONS.papers },
          { id: 'training', label: 'Training Modules', to: '/user/training', icon: ICONS.book },
          { id: 'progress', label: 'Progress', to: '/user/progress', icon: ICONS.done },
          { id: 'resources', label: 'Resources', to: '/user/resources', icon: ICONS.list },
        ],
      },
      {
        title: 'Account',
        items: [
          { id: 'notifications', label: 'Notifications', to: '/user/notifications', icon: ICONS.bell, badge: 2 },
          { id: 'profile', label: 'Profile', to: '/user/profile', icon: ICONS.user },
          { id: 'settings', label: 'Settings', to: '/user/settings', icon: ICONS.settings },
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
          { id: 'assigned', label: 'Assigned', to: '/reviewer/assigned', icon: ICONS.check, badge: 3 },
          { id: 'review', label: 'Submit Review', to: '/reviewer/review', icon: ICONS.edit },
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
        ],
      },
    ],
  },
};
