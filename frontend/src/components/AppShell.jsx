import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AppShell({ role, children, searchPlaceholder, topbarActions }) {
  return (
    <div className="app">
      <Sidebar role={role} />
      <main className="main">
        <Topbar searchPlaceholder={searchPlaceholder} actions={topbarActions} />
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
