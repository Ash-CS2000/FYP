import { NavLink, Link } from 'react-router-dom';
import { SIDEBAR_CONFIG } from '../data/sidebarConfig.jsx';

export default function Sidebar({ role, sidebarOpen, onToggleSidebar }) {
  const cfg = SIDEBAR_CONFIG[role];
  if (!cfg) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link to="/" className="brand sidebar-logo" title="JSRMS home">
          <span className="brand-mark">JSRMS</span>
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
            {section.items.map((item) => (
              <NavLink
                key={item.id}
                to={item.to}
                end
                title={item.label}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span className="sidebar-link-label">{item.label}</span>
                {item.badge && (
                  <span className="sidebar-badge">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{cfg.user.initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{cfg.user.name}</div>
            <div className="sidebar-user-role">{cfg.user.role}</div>
          </div>
        </div>
        <Link to="/login" className="sidebar-signout" title="Sign out">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span className="sidebar-link-label">Sign out</span>
        </Link>
      </div>
    </aside>
  );
}
