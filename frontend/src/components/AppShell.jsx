import { useEffect, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AppShell({ role, children, searchPlaceholder, topbarActions }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.localStorage.getItem('jsrms-sidebar-open') !== 'false';
  });

  useEffect(() => {
    window.localStorage.setItem('jsrms-sidebar-open', String(sidebarOpen));
  }, [sidebarOpen]);

  return (
    <div className={`app ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <Sidebar
        role={role}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />
      <main className="main">
        <Topbar
          searchPlaceholder={searchPlaceholder}
          actions={topbarActions}
        />
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
