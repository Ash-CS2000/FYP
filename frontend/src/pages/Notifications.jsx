import AppShell from '../components/AppShell.jsx';
import { useNotifications } from '../hooks/useNotifications.js';

const CATEGORY_ICONS = {
  decision: '⚖️',
};

function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function Notifications({ role = 'author' }) {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  return (
    <AppShell role={role} searchPlaceholder="Search notifications...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Inbox</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Notifications.</h1>
          <p className="page-subtitle">{unreadCount} unread · {notifications.length} total</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={markAllRead} disabled={unreadCount === 0}>
          Mark all as read
        </button>
      </div>

      <div className="card fade-up delay-1">
        {loading && <div className="card-meta" style={{ padding: 20 }}>Loading…</div>}
        {!loading && notifications.length === 0 && (
          <div className="card-meta" style={{ padding: 20 }}>No notifications yet.</div>
        )}
        {!loading && notifications.map((n, i) => (
          <div
            key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            style={{
              display: 'flex', gap: 16, padding: '18px 4px', cursor: n.read ? 'default' : 'pointer',
              borderBottom: i === notifications.length - 1 ? 'none' : '1px solid var(--ink-100)',
              background: n.read ? 'transparent' : 'rgba(230,241,251,0.3)',
              margin: n.read ? 0 : '0 -8px',
              paddingLeft: n.read ? 4 : 12,
              paddingRight: n.read ? 4 : 12,
              borderRadius: n.read ? 0 : 'var(--r-md)',
            }}
          >
            <div style={{
              width: 44, height: 44, fontSize: 20, borderRadius: 8,
              background: 'var(--navy-100)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>{CATEGORY_ICONS[n.category] || '🔔'}</div>
            <div style={{ flex: 1 }}>
              <div className="row" style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 14 }}>{n.title}</span>
                {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber-500)', marginLeft: 'auto' }}></span>}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.5, marginBottom: 6 }}>{n.body}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{formatDateTime(n.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
