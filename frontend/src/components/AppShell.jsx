import { useEffect, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
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
        <Topbar
          searchPlaceholder={searchPlaceholder}
          actions={topbarActions}
          role={role}
          unreadCount={unreadCount}
        />
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
