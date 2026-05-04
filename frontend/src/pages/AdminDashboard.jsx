import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';

export default function AdminDashboard() {
  const action = <Link to="/admin/users" className="btn btn-primary btn-sm">+ Add User</Link>;

  return (
    <AppShell role="admin" searchPlaceholder="Search users, audit logs, settings..." topbarActions={action}>
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
          <p className="page-subtitle">All systems operational · 1,247 active users · Last backup 2 hours ago.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }} className="fade-up delay-1">
        {[
          { num: 847, label: 'Authors', bg: 'var(--navy-100)', color: 'var(--navy-800)' },
          { num: 312, label: 'Reviewers', bg: '#FAEEDA', color: 'var(--amber-800)' },
          { num: 76, label: 'Editors', bg: 'var(--purple-50)', color: 'var(--purple-800)' },
          { num: 12, label: 'Administrators', bg: 'var(--teal-50)', color: 'var(--teal-800)' },
        ].map(s => (
          <div key={s.label} className="role-stat">
            <div className="role-stat-icon" style={{ background: s.bg, color: s.color }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div className="role-stat-num">{s.num}</div>
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
              {[
                { name: 'Roslan Tahir', email: 'r.tahir@uitm.edu.my', initials: 'RT', role: 'Author', date: '3 May 2026', status: 'pending', label: 'Pending' },
                { name: 'Siti Khadijah', email: 'siti.k@iium.edu.my', initials: 'SK', role: 'Author', date: '18 Apr 2026', status: 'active', label: 'Active' },
                { name: 'Dr. Tan Boon Hock', email: 'tan.bh@usm.my', initials: 'TB', role: 'Reviewer', date: '15 Apr 2026', status: 'active', label: 'Active' },
              ].map(u => (
                <tr key={u.email}>
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
                  <td><span className={`pill pill-${u.status}`}>{u.label}</span></td>
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
