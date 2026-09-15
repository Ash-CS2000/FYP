import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { getMergedSidebar } from '../data/sidebarConfig.jsx';
import { clearDemoSession } from '../data/demoAccounts.js';
import { clearSession } from '../api/auth';
import { workspaceEntry, ROLE_LABELS, setActiveRole } from '../auth/roles';
import Avatar from './Avatar.jsx';
import ThemeSwitch from './ThemeSwitch.jsx';
import { useCurrentUser } from '../auth/CurrentUserContext.jsx';

// Remember the sidebar's scroll position across route changes. Each page mounts
// a fresh AppShell → Sidebar, which would otherwise snap scroll back to the top.
// A module-level value survives those remounts within the SPA session.
let savedSidebarScroll = 0;

export default function Sidebar({ role, sidebarOpen, onToggleSidebar, notificationCount }) {
  const navigate = useNavigate();
  const asideRef = useRef(null);

  // Restore the saved scroll position before paint to avoid a visible jump.
  useLayoutEffect(() => {
    const el = asideRef.current;
    if (el) el.scrollTop = savedSidebarScroll;
  }, []);

  const { user: storedUser, setUser } = useCurrentUser();
  // Show ONLY the workspace we're currently in (the route's role), not a merge
  // of every role. The full role list is used for the switcher options below.
  const cfg = getMergedSidebar([role]);
  if (!cfg) return null;

  // The nickname is what this is for — it is the name someone chose to be known
  // by. Falls back to the name of record, then the email, never to a fictional
  // person.
  const displayUser = storedUser;
  const displayName = storedUser?.display_name || storedUser?.name || storedUser?.email || '';
  const subtitle = storedUser?.institution || cfg.role;
  const availableRoles = storedUser?.roles?.length ? storedUser.roles : [role];
  const canSwitchRole = availableRoles.length > 1;

  function switchRole(nextRole) {
    if (nextRole === role) return;
    setActiveRole(nextRole);
    navigate(workspaceEntry(nextRole));
  }

  function handleSignOut() {
    clearDemoSession();      // demo-account + active-role keys
    clearSession();          // user + access + refresh tokens
    setUser(null);           // clear the in-memory context immediately
    navigate('/login');
  }

  return (
    <aside
      className="sidebar"
      ref={asideRef}
      onScroll={(e) => { savedSidebarScroll = e.currentTarget.scrollTop; }}
    >
      <div className="sidebar-brand">
        <Link to="/" className="brand sidebar-logo" title="PaperBridge home">
          <span className="brand-mark">PaperBridge</span>
          <span className="brand-sub">{cfg.role}</span>
        </Link>
        <button className="sidebar-toggle" type="button" title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} onClick={onToggleSidebar}>
          <svg className="sidebar-toggle-icon sidebar-toggle-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
          <svg className="sidebar-toggle-icon sidebar-toggle-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M15 4v16" />
          </svg>
        </button>
      </div>

      {cfg.sections.map((section) => (
        <div key={section.title}>
          <div className="sidebar-section">{section.title}</div>
          <nav className="sidebar-nav">
            {section.items.map((item) => {
              const badge = item.id === 'notifications' ? notificationCount : item.badge;
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end
                  title={item.label}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  <span className="sidebar-link-label">{item.label}</span>
                  {badge > 0 && (
                    <span className="sidebar-badge">
                      {badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      ))}

      <div className="sidebar-footer">
        {canSwitchRole && (
          <div className="sidebar-role-switcher">
            <label className="sidebar-role-label" htmlFor={availableRoles.length > 2 ? `role-switcher-${role}` : undefined}>Workspace</label>
            {availableRoles.length === 2 ? (
              <div className="sidebar-role-toggle" role="group" aria-label="Switch workspace">
                {availableRoles.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`sidebar-role-toggle-btn ${item === role ? 'active' : ''}`}
                    aria-pressed={item === role}
                    onClick={() => switchRole(item)}
                  >
                    {ROLE_LABELS[item]}
                  </button>
                ))}
              </div>
            ) : (
              <WorkspaceDropdown roles={availableRoles} current={role} onSelect={switchRole} />
            )}
          </div>
        )}
        <ThemeSwitch />
        <div className="sidebar-user">
          <Avatar
            user={displayUser}
            size="lg"
            tone="amber"
            label={displayName}
            className="sidebar-avatar"
          />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">{subtitle}</div>
          </div>
        </div>
        <button type="button" className="sidebar-signout" title="Sign out" onClick={handleSignOut}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span className="sidebar-link-label">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

// Custom, fully theme-able workspace dropdown (3+ roles). Opens upward since it
// sits at the bottom of the sidebar; closes on outside-click or Escape.
function WorkspaceDropdown({ roles, current, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`ws-dd ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className="ws-dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ws-dd-current">{ROLE_LABELS[current] || current}</span>
        <svg className="ws-dd-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className="ws-dd-menu" role="listbox">
          {roles.map((r) => (
            <li
              key={r}
              role="option"
              aria-selected={r === current}
              className={`ws-dd-option ${r === current ? 'active' : ''}`}
              onClick={() => { setOpen(false); onSelect(r); }}
            >
              <span>{ROLE_LABELS[r] || r}</span>
              {r === current && (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
