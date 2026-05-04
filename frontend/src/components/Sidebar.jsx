import { NavLink, Link } from 'react-router-dom';
import { SIDEBAR_CONFIG } from '../data/sidebarConfig.jsx';

export default function Sidebar({ role }) {
  const cfg = SIDEBAR_CONFIG[role];
  if (!cfg) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link to="/" className="brand">
          <span className="brand-mark">JSRMS</span>
          <span className="brand-sub">{cfg.role}</span>
        </Link>
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
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: 'var(--amber-500)',
                      color: 'var(--navy-900)',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 999,
                    }}
                  >
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
        <Link
          to="/login"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 14,
            padding: '8px 12px',
            color: 'var(--navy-300)',
            fontSize: 13,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sign out
        </Link>
      </div>
    </aside>
  );
}
