import { useEffect, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import AssistantWidget from './AssistantWidget.jsx';
import { ASSISTANT_ROLES } from '../api/assistant.js';
import { useNotifications } from '../hooks/useNotifications.jsx';

export default function AppShell({ role, children, searchPlaceholder, topbarActions }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.localStorage.getItem('paperbridge-sidebar-open') !== 'false';
  });
  const { unreadCount } = useNotifications();

  useEffect(() => {
    window.localStorage.setItem('paperbridge-sidebar-open', String(sidebarOpen));
  }, [sidebarOpen]);

  return (
    <div className={`app ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <Sidebar
        role={role}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        notificationCount={unreadCount}
      />
      <main className="main">
        {/* Admin has no topbar: its search and help controls are inert and
            /admin/notifications has no route, so every control on it was dead.
            Admin reaches everything through the sidebar instead. */}
        {role !== 'admin' && (
          <Topbar
            searchPlaceholder={searchPlaceholder}
            actions={topbarActions}
            role={role}
            unreadCount={unreadCount}
          />
        )}
        <div className="page-content">{children}</div>
      </main>
      {ASSISTANT_ROLES.includes(role) && <AssistantWidget role={role} />}
    </div>
  );
}
