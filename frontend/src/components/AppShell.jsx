import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import AssistantWidget from './AssistantWidget.jsx';
import { ASSISTANT_ROLES } from '../api/assistant.js';
import { useNotifications } from '../hooks/useNotifications.jsx';
import { useReviewerAssignments } from '../hooks/useReviewerAssignments.jsx';

const MOBILE_QUERY = '(max-width: 900px)';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

export default function AppShell({ role, children, searchPlaceholder, topbarActions }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.localStorage.getItem('paperbridge-sidebar-open') !== 'false';
  });
  // On narrow screens the sidebar is an off-canvas drawer, closed by default
  // and independent of the saved desktop collapse setting above.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();
  const { unreadCount } = useNotifications();
  const reviewer = useReviewerAssignments();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    window.localStorage.setItem('paperbridge-sidebar-open', String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  const hasAssistant = ASSISTANT_ROLES.includes(role);
  const onSearch = role === 'reviewer'
    ? term => navigate(term ? `/reviewer/assignments?q=${encodeURIComponent(term)}` : '/reviewer/assignments')
    : undefined;

  const classes = [
    'app',
    // The drawer always shows full labels; collapse is a desktop setting.
    sidebarOpen || isMobile ? '' : 'sidebar-collapsed',
    mobileNavOpen ? 'mobile-nav-open' : '',
    hasAssistant ? 'has-assistant' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <Sidebar
        role={role}
        sidebarOpen={sidebarOpen || isMobile}
        onToggleSidebar={() => (isMobile ? setMobileNavOpen(false) : setSidebarOpen((open) => !open))}
        notificationCount={unreadCount}
        badgeCounts={role === 'reviewer' ? reviewer?.counts : undefined}
      />
      <div className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      <main className="main">
        {/* Admin has no topbar: its search and help controls are inert and
            /admin/notifications has no route, so every control on it was dead.
            Admin reaches everything through the sidebar instead. */}
        {role === 'admin' && (
          <button className="icon-btn topbar-menu admin-mobile-menu" title="Open menu" type="button" onClick={() => setMobileNavOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
        )}
        {role !== 'admin' && (
          <Topbar
            searchPlaceholder={searchPlaceholder}
            actions={topbarActions}
            role={role}
            unreadCount={unreadCount}
            onSearch={onSearch}
            onOpenNav={() => setMobileNavOpen(true)}
          />
        )}
        <div className="page-content">{children}</div>
      </main>
      {hasAssistant && <AssistantWidget role={role} />}
    </div>
  );
}
