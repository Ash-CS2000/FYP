import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { listUsers } from '../api/admin.js';

// Mirrors AdminUsers.jsx's getPrimaryRole/getInitials exactly — both pages
// render the same GET /api/users/ row shape and must agree on how it reads.
function getPrimaryRole(u) {
  if (u.roles?.includes('admin'))    return 'Admin';
  if (u.roles?.includes('editor'))   return 'Editor';
  if (u.roles?.includes('reviewer')) return 'Reviewer';
  if (u.roles?.includes('author'))   return 'Author';
  return u.role || '—';
}

function getInitials(name = '') {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function toRow(u) {
  return {
    id: u.id,
    name: u.name || u.email,
    email: u.email,
    role: getPrimaryRole(u),
    reviewer_status: u.reviewer_status || '',
    status: u.status || (u.is_active === false ? 'deactivated' : 'active'),
    date: u.joined
      ? new Date(u.joined).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—',
    initials: getInitials(u.name || u.email),
  };
}

const ROLE_STAT_META = [
  { key: 'author',   label: 'Authors',        bg: 'var(--navy-100)', color: 'var(--navy-800)' },
  { key: 'reviewer', label: 'Reviewers',       bg: '#FAEEDA',         color: 'var(--amber-800)' },
  { key: 'editor',   label: 'Editors',         bg: 'var(--purple-50)', color: 'var(--purple-800)' },
  { key: 'admin',    label: 'Administrators',  bg: 'var(--teal-50)',  color: 'var(--teal-800)' },
];

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listUsers()
      .then(rows => setUsers(Array.isArray(rows) ? rows : []))
      .catch(() => setError('Could not load users from the server.'))
      .finally(() => setLoading(false));
  }, []);

  const roleCounts = ROLE_STAT_META.map(meta => ({
    ...meta,
    num: users.filter(u => u.roles?.includes(meta.key)).length,
  }));

  const recentUsers = users.slice(0, 3).map(toRow);

  return (
    <AppShell role="admin">
      <style>{`
        .health-tile { background: var(--white); border: 1px solid var(--ink-200); border-radius: var(--r-md); padding: 16px 18px; }
        .health-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .health-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .health-dot.green { background: var(--teal-500); box-shadow: 0 0 0 4px rgba(29,158,117,0.18); }
        .health-dot.amber { background: var(--amber-500); box-shadow: 0 0 0 4px rgba(239,159,39,0.18); }
        .health-name { font-size: 13px; font-weight: 500; color: var(--navy-900); }
        .health-value { font-family: var(--font-display); font-size: 22px; font-weight: 500; color: var(--navy-900); letter-spacing: -0.02em; line-height: 1; margin-top: 8px; }
        .health-meta { font-size: 11.5px; color: var(--ink-500); margin-top: 4px; }
        .role-stat { padding: 16px; border: 1px solid var(--ink-200); border-radius: var(--r-md); background: var(--white); text-align: center; }
        .role-stat-icon { width: 36px; height: 36px; margin: 0 auto 10px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .role-stat-num { font-family: var(--font-display); font-size: 28px; font-weight: 500; color: var(--navy-900); letter-spacing: -0.02em; line-height: 1; }
        .role-stat-lbl { font-size: 12px; color: var(--ink-600); margin-top: 4px; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">System Administration</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Platform <em className="serif-italic">overview</em>.</h1>
          <p className="page-subtitle">
            All systems operational · {loading ? '—' : `${users.length} active users`}.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }} className="fade-up delay-1">
        {roleCounts.map(s => (
          <div key={s.label} className="role-stat">
            <div className="role-stat-icon" style={{ background: s.bg, color: s.color }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div className="role-stat-num">{loading ? '—' : s.num}</div>
            <div className="role-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="split-grid fade-up delay-2" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Recent Users</div><div className="card-meta">Latest registrations across roles.</div></div>
            <Link to="/admin/users" style={{ color: 'var(--navy-700)', fontSize: 13, fontWeight: 600 }}>Manage all →</Link>
          </div>
          <table className="data-table">
            <thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4}><p className="muted" style={{ fontSize: 13, padding: '16px 0' }}>Loading…</p></td></tr>
              ) : error ? (
                <tr><td colSpan={4}><span style={{ color: 'var(--red-700)', fontSize: 13 }}>{error}</span></td></tr>
              ) : recentUsers.length === 0 ? (
                <tr><td colSpan={4}><p className="muted" style={{ fontSize: 13, padding: '16px 0' }}>No users yet.</p></td></tr>
              ) : recentUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="row">
                      <div className="avatar">{u.initials}</div>
                      <div style={{ marginLeft: 4 }}>
                        <div className="table-title">{u.name}</div>
                        <div className="table-meta">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontSize: 12.5, fontWeight: 500 }}>{u.role}</span></td>
                  <td><span className="muted">{u.date}</span></td>
                  <td>
                    <span className={`pill pill-${u.reviewer_status === 'pending' ? 'pending' : u.status}`}>
                      {u.reviewer_status === 'pending' ? 'Reviewer Pending' : u.status === 'active' ? 'Active' : u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="gap-grid">
          <div className="card">
            <div className="card-header"><div className="card-title">System Health</div><span className="pill pill-active">Operational</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { name: 'API', value: '99.9%', meta: 'Uptime · 30 days', dot: 'green' },
                { name: 'Database', value: '42ms', meta: 'Avg. response time', dot: 'green' },
                { name: 'Storage', value: '68%', meta: '340 GB of 500 GB', dot: 'amber' },
                { name: 'Active Sessions', value: '214', meta: 'Live right now', dot: 'green' },
              ].map(h => (
                <div key={h.name} className="health-tile">
                  <div className="health-row"><div className={`health-dot ${h.dot}`}></div><span className="health-name">{h.name}</span></div>
                  <div className="health-value">{h.value}</div>
                  <div className="health-meta">{h.meta}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
