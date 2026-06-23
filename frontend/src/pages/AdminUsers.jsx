import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell.jsx';

const API_URL = 'https://fyp-production-6d7f.up.railway.app';

const DEMO_USERS = [
  { id: 1, initials: 'AR', name: 'Ahmad Razif', email: 'ahmad@utm.edu.my', roles: ['author'], institution: 'UTM', date: '12 Jan 2026', status: 'active', reviewer_status: '' },
  { id: 2, initials: 'LW', name: 'Dr. Lim Wei Ping', email: 'lim.wp@um.edu.my', roles: ['reviewer'], institution: 'Universiti Malaya', date: '04 Mar 2024', status: 'active', reviewer_status: 'active' },
  { id: 3, initials: 'HI', name: 'Prof. Hassan Ibrahim', email: 'hassan.i@usm.my', roles: ['editor'], institution: 'USM', date: '15 Aug 2023', status: 'active', reviewer_status: '' },
  { id: 4, initials: 'SR', name: 'Dr. Sarah Rahman', email: 'sarah.r@upm.edu.my', roles: ['reviewer'], institution: 'UPM', date: '22 Sep 2024', status: 'active', reviewer_status: 'active' },
  { id: 5, initials: 'RT', name: 'Roslan Tahir', email: 'r.tahir@uitm.edu.my', roles: ['author'], institution: 'UiTM', date: '3 May 2026', status: 'active', reviewer_status: 'pending' },
  { id: 6, initials: 'SK', name: 'Siti Khadijah', email: 'siti.k@iium.edu.my', roles: ['author'], institution: 'IIUM', date: '18 Apr 2026', status: 'active', reviewer_status: '' },
  { id: 7, initials: 'JT', name: 'Prof. James Tan', email: 'james.t@um.edu.my', roles: ['author', 'reviewer'], institution: 'UM', date: '02 Feb 2025', status: 'active', reviewer_status: 'pending' },
  { id: 8, initials: 'WM', name: 'Wong Mei Ling', email: 'wong.ml@upm.edu.my', roles: ['author'], institution: 'UPM', date: '11 Jan 2026', status: 'active', reviewer_status: '' },
];

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

export default function AdminUsers() {
  const [filter, setFilter]   = useState('all');
  const [users, setUsers]     = useState(DEMO_USERS);
  const [actionLoading, setActionLoading] = useState(null);

  async function handleReviewerAction(userId, action) {
    setActionLoading(`${userId}-${action}`);
    try {
      const access = localStorage.getItem('access');
      const res = await fetch(`${API_URL}/api/users/${userId}/reviewer-status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
    } catch {
      setUsers(prev => prev.map(u => {
        if (u.id !== userId) return u;
        const roles = action === 'approve'
          ? [...new Set([...(u.roles || []), 'reviewer'])]
          : (u.roles || []).filter(r => r !== 'reviewer');
        return { ...u, reviewer_status: action === 'approve' ? 'active' : 'rejected', roles };
      }));
    } finally {
      setActionLoading(null);
    }
  }

  const pendingReviewers = users.filter(u => u.reviewer_status === 'pending');

  const filtered = users.filter(u => {
    if (filter === 'all') return true;
    return (u.roles || []).includes(filter);
  });

  const roleCounts = role => users.filter(u => (u.roles || []).includes(role)).length;

  return (
    <AppShell role="admin" searchPlaceholder="Search users..." topbarActions={<button className="btn btn-primary btn-sm">+ Add User</button>}>
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">User Management</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Manage <em className="serif-italic">Users</em>.</h1>
          <p className="page-subtitle">Add, edit, and manage user accounts across all roles.</p>
        </div>
      </div>

      {pendingReviewers.length > 0 && (
        <div className="card fade-up delay-1" style={{ borderLeft: '3px solid var(--amber-500)' }}>
          <div className="card-header">
            <div className="card-title">
              Reviewer Applications
              <span style={{ marginLeft: 8, background: 'var(--amber-500)', color: 'var(--navy-950)', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>{pendingReviewers.length}</span>
            </div>
          </div>
          <table className="data-table">
            <thead><tr><th>Applicant</th><th>Institution</th><th>Roles</th><th>Expertise</th><th>Actions</th></tr></thead>
            <tbody>
              {pendingReviewers.map(u => (
                <tr key={u.id} style={{ background: '#fffbeb' }}>
                  <td>
                    <div className="row">
                      <div className="avatar">{u.initials || getInitials(u.name)}</div>
                      <div style={{ marginLeft: 4 }}>
                        <div className="table-title">{u.name}</div>
                        <div className="table-meta">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="muted">{u.institution}</span></td>
                  <td><span style={{ fontSize: 12.5, fontWeight: 500 }}>{(u.roles || []).map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(' + ')}</span></td>
                  <td><span className="muted">{u.expertise_areas || '—'}</span></td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'var(--teal-600)', color: '#fff', border: 'none' }}
                        disabled={actionLoading === `${u.id}-approve`}
                        onClick={() => handleReviewerAction(u.id, 'approve')}
                      >
                        {actionLoading === `${u.id}-approve` ? '…' : 'Approve'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--red-700)', borderColor: 'var(--red-200)' }}
                        disabled={actionLoading === `${u.id}-reject`}
                        onClick={() => handleReviewerAction(u.id, 'reject')}
                      >
                        {actionLoading === `${u.id}-reject` ? '…' : 'Reject'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card fade-up delay-2">
        <div className="card-header">
          <div><div className="card-title">{filtered.length} users</div></div>
          <div className="row">
            {[
              { id: 'all',      label: 'All',       count: users.length },
              { id: 'author',   label: 'Authors',   count: roleCounts('author') },
              { id: 'reviewer', label: 'Reviewers', count: roleCounts('reviewer') },
              { id: 'editor',   label: 'Editors',   count: roleCounts('editor') },
            ].map(f => (
              <button key={f.id} className={`filter-chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label} <span style={{ opacity: .6 }}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        <table className="data-table">
          <thead><tr><th>User</th><th>Role(s)</th><th>Institution</th><th>Joined</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="row">
                    <div className="avatar">{u.initials || getInitials(u.name)}</div>
                    <div style={{ marginLeft: 4 }}>
                      <div className="table-title">{u.name}</div>
                      <div className="table-meta">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(u.roles || [getPrimaryRole(u)]).map(r => (
                      <span key={r} style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: r === 'reviewer' ? 'var(--teal-50)' : r === 'editor' ? '#eef2ff' : r === 'admin' ? '#fef3c7' : 'var(--ink-100)', color: r === 'reviewer' ? 'var(--teal-800)' : r === 'editor' ? '#3730a3' : r === 'admin' ? '#92600a' : 'var(--ink-700)' }}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </span>
                    ))}
                  </div>
                </td>
                <td><span className="muted">{u.institution}</span></td>
                <td><span className="muted">{u.date}</span></td>
                <td>
                  <span className={`pill pill-${u.reviewer_status === 'pending' ? 'pending' : u.status}`}>
                    {u.reviewer_status === 'pending' ? 'Reviewer Pending' : u.status === 'active' ? 'Active' : u.status}
                  </span>
                </td>
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
