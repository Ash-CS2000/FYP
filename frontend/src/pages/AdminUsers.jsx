import { useState } from 'react';
import AppShell from '../components/AppShell.jsx';

const ALL_USERS = [
  { initials: 'AR', name: 'Ahmad Razif', email: 'ahmad@utm.edu.my', role: 'Author', inst: 'UTM', date: '12 Jan 2026', status: 'active', label: 'Active' },
  { initials: 'LW', name: 'Dr. Lim Wei Ping', email: 'lim.wp@um.edu.my', role: 'Reviewer', inst: 'Universiti Malaya', date: '04 Mar 2024', status: 'active', label: 'Active' },
  { initials: 'HI', name: 'Prof. Hassan Ibrahim', email: 'hassan.i@usm.my', role: 'Editor', inst: 'USM', date: '15 Aug 2023', status: 'active', label: 'Active' },
  { initials: 'SR', name: 'Dr. Sarah Rahman', email: 'sarah.r@upm.edu.my', role: 'Reviewer', inst: 'UPM', date: '22 Sep 2024', status: 'active', label: 'Active' },
  { initials: 'RT', name: 'Roslan Tahir', email: 'r.tahir@uitm.edu.my', role: 'Author', inst: 'UiTM', date: '3 May 2026', status: 'pending', label: 'Pending' },
  { initials: 'SK', name: 'Siti Khadijah', email: 'siti.k@iium.edu.my', role: 'Author', inst: 'IIUM', date: '18 Apr 2026', status: 'active', label: 'Active' },
  { initials: 'JT', name: 'Prof. James Tan', email: 'james.t@um.edu.my', role: 'Reviewer', inst: 'UM', date: '02 Feb 2025', status: 'active', label: 'Active' },
  { initials: 'WM', name: 'Wong Mei Ling', email: 'wong.ml@upm.edu.my', role: 'Author', inst: 'UPM', date: '11 Jan 2026', status: 'active', label: 'Active' },
];

export default function AdminUsers() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? ALL_USERS : ALL_USERS.filter(u => u.role.toLowerCase() === filter);

  return (
    <AppShell role="admin" searchPlaceholder="Search users..." topbarActions={<button className="btn btn-primary btn-sm">+ Add User</button>}>
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">User Management</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Manage <em className="serif-italic">Users</em>.</h1>
          <p className="page-subtitle">Add, edit, and manage user accounts across all roles.</p>
        </div>
      </div>

      <div className="card fade-up delay-1">
        <div className="card-header">
          <div><div className="card-title">{filtered.length} users</div></div>
          <div className="row">
            {[
              { id: 'all', label: 'All', count: ALL_USERS.length },
              { id: 'author', label: 'Authors', count: ALL_USERS.filter(u => u.role === 'Author').length },
              { id: 'reviewer', label: 'Reviewers', count: ALL_USERS.filter(u => u.role === 'Reviewer').length },
              { id: 'editor', label: 'Editors', count: ALL_USERS.filter(u => u.role === 'Editor').length },
            ].map(f => (
              <button key={f.id} className={`filter-chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label} <span style={{ opacity: .6 }}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        <table className="data-table">
          <thead><tr><th>User</th><th>Role</th><th>Institution</th><th>Joined</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(u => (
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
                <td><span className="muted">{u.inst}</span></td>
                <td><span className="muted">{u.date}</span></td>
                <td><span className={`pill pill-${u.status}`}>{u.label}</span></td>
                <td>
                  <button className="icon-btn" style={{ width: 30, height: 30 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
