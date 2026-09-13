import { useState, useRef, useEffect } from 'react';
import AppShell from '../components/AppShell.jsx';
import SearchField from '../components/SearchField.jsx';
import { patchUserRole, patchUserStatus, listUsers, listAuditLog } from '../api/admin.js';
import { getStoredUser } from '../auth/roles';

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

// Map a server user row (see listUsers in api/admin.js) to the shape this
// table renders.
function toRow(u) {
  return {
    id: u.id,
    name: u.name || u.email,
    email: u.email,
    roles: u.roles || [],
    reviewer_status: u.reviewer_status || '',
    institution: u.institution || '—',
    status: u.status || (u.is_active === false ? 'deactivated' : 'active'),
    date: u.joined
      ? new Date(u.joined).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—',
    initials: getInitials(u.name || u.email),
  };
}

// Shape mirrors the audit_logs row the backend is expected to write (see
// api/admin.js). `local: true` marks entries this session invented because the
// server was unreachable — they are never the real trail.
function localAudit(actor, action, role, target, reason = '') {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actor_name: actor?.name || 'You',
    action,
    role,
    reason,
    target_name: target?.name || target?.email || '—',
    target_email: target?.email || '',
    created_at: new Date().toISOString(),
    local: true,
  };
}

const ACTION_TEXT = {
  grant:       { verb: 'promoted',    color: 'var(--teal-800)' },
  revoke:      { verb: 'revoked',     color: 'var(--red-700)' },
  approve:     { verb: 'approved',    color: 'var(--teal-800)' },
  reject:      { verb: 'rejected',    color: 'var(--red-700)' },
  invite:      { verb: 'invited',     color: 'var(--navy-700)' },
  suspended:   { verb: 'suspended',   color: 'var(--red-700)' },
  deactivated: { verb: 'deactivated', color: 'var(--red-700)' },
  reactivate:  { verb: 'reactivated', color: 'var(--teal-800)' },
};

export default function AdminUsers() {
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const [users, setUsers]     = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [audit, setAudit]     = useState([]);
  const [auditLive, setAuditLive] = useState(false);

  const actor = getStoredUser();

  function loadUsers() {
    setUsersLoading(true);
    setUsersError('');
    listUsers()
      .then(rows => setUsers(Array.isArray(rows) ? rows.map(toRow) : []))
      .catch(() => setUsersError('Could not load users from the server.'))
      .finally(() => setUsersLoading(false));
  }

  useEffect(() => {
    // Best effort: if the audit endpoint is live we show the real trail,
    // otherwise the panel falls back to this session's actions.
    listAuditLog({ limit: 10 })
      .then(rows => { if (Array.isArray(rows)) { setAudit(rows); setAuditLive(true); } })
      .catch(() => { /* backend unavailable — stay on local entries */ });
    loadUsers();
  }, []);

  // One path for every user mutation: try the server, fall back to a local
  // update so the page still demonstrates while the backend is paused.
  async function applyUserChange({ key, request, fallback, auditRow }) {
    setActionLoading(key);
    try {
      const updated = await request();
      setUsers(prev => prev.map(u => (u.id === updated.id ? { ...u, ...updated } : u)));
    } catch {
      setUsers(prev => prev.map(fallback));
    } finally {
      if (auditRow) setAudit(prev => [auditRow, ...prev]);
      setActionLoading(null);
    }
  }

  // Editors are made here and nowhere else — there is no editor registration.
  function handleRoleAction(userId, role, action) {
    const target = users.find(u => u.id === userId);
    // Admins are out of reach of promotion/demotion entirely.
    if ((target?.roles || []).includes('admin')) return undefined;
    return applyUserChange({
      key: `${userId}-${role}-${action}`,
      request: () => patchUserRole(userId, role, action),
      fallback: (u) => {
        if (u.id !== userId) return u;
        const roles = action === 'grant'
          ? [...new Set([...(u.roles || []), role])]
          : (u.roles || []).filter(r => r !== role);
        return { ...u, roles };
      },
      auditRow: localAudit(actor, action, role, target),
    });
  }

  // Suspension and deactivation. Never a delete — see patchUserStatus in
  // api/admin.js for what the server has to do about work already in flight.
  function handleStatusAction(userId, status, reason) {
    const target = users.find(u => u.id === userId);
    if ((target?.roles || []).includes('admin')) return undefined;
    return applyUserChange({
      key: `${userId}-status-${status}`,
      request: () => patchUserStatus(userId, status, reason),
      fallback: (u) => (u.id === userId ? { ...u, status } : u),
      auditRow: localAudit(actor, status === 'active' ? 'reactivate' : status, 'account', target, reason),
    });
  }

  const query = search.trim().toLowerCase();
  const filtered = users.filter(u => {
    if (filter !== 'all' && !(u.roles || []).includes(filter)) return false;
    if (!query) return true;
    return (u.name || '').toLowerCase().includes(query)
      || (u.email || '').toLowerCase().includes(query);
  });

  const roleCounts = role => users.filter(u => (u.roles || []).includes(role)).length;

  return (
    <AppShell role="admin">
      <style>{`
        .adm-menu-wrap { position:relative; display:inline-block; }
        .adm-menu { position:absolute; right:0; top:34px; z-index:40; min-width:210px; background:var(--navy-950); border:1px solid rgba(255,255,255,0.12); border-radius:var(--r-md); box-shadow:var(--shadow-lg,0 10px 30px rgba(0,0,0,0.35)); padding:6px; }
        .adm-menu-item { display:block; width:100%; text-align:left; padding:9px 12px; border-radius:6px; font-size:13px; font-weight:500; color:var(--white); background:none; }
        .adm-menu-item:hover:not(:disabled) { background:rgba(255,255,255,0.09); }
        .adm-menu-item:disabled { color:var(--navy-300); cursor:default; }
        .adm-menu-item.danger { color:#fca5a5; }
        .adm-menu-sep { height:1px; margin:5px 8px; background:rgba(255,255,255,0.12); }
        .adm-menu-note { padding:9px 12px; font-size:12px; color:var(--navy-200); line-height:1.5; }
        .adm-confirm { padding:10px 12px; }
        .adm-confirm p { font-size:12.5px; color:var(--navy-200); line-height:1.5; margin-bottom:10px; }
        .adm-confirm-row { display:flex; gap:6px; }
        .adm-audit-row { display:flex; gap:10px; align-items:baseline; padding:9px 0; border-bottom:1px solid var(--ink-100); font-size:13px; }
        .adm-audit-row:last-child { border-bottom:none; }
        .adm-audit-time { margin-left:auto; font-size:11.5px; color:var(--ink-600); white-space:nowrap; }
        .adm-tag-local { font-size:10px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; padding:1px 6px; border-radius:99px; background:var(--ink-100); color:var(--ink-700); }
        /* .card-header is global and has no gap/wrap; scope both to this one. */
        .adm-toolbar { gap:16px; flex-wrap:wrap; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">User Management</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Manage <em className="serif-italic">Users</em>.</h1>
          <p className="page-subtitle">The full account roster — roles, institutions, and status.</p>
        </div>
      </div>

      <div className="card fade-up delay-2">
        <div className="card-header adm-toolbar">
          <div>
            <div className="card-title">
              {usersLoading
                ? 'Loading users…'
                : query
                  ? `${filtered.length} of ${users.length} users`
                  : `${filtered.length} users`}
            </div>
          </div>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search by name or email…"
            label="Search users by name or email"
          />
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
            {usersLoading ? (
              <tr><td colSpan={6}><p className="muted" style={{ fontSize: 13, padding: '16px 0' }}>Loading users…</p></td></tr>
            ) : usersError ? (
              <tr><td colSpan={6}>
                <div style={{ padding: '16px 0', fontSize: 13 }}>
                  <span style={{ color: 'var(--red-700)' }}>{usersError}</span>{' '}
                  <button className="btn btn-ghost btn-sm" onClick={loadUsers}>Retry</button>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}><p className="muted" style={{ fontSize: 13, padding: '16px 0' }}>
                {query ? `No users match “${search.trim()}”.` : 'No users match this filter.'}
              </p></td></tr>
            ) : filtered.map(u => (
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
                  <RowActionsMenu
                    user={u}
                    busy={actionLoading?.startsWith(`${u.id}-`)}
                    onRoleAction={(role, action) => handleRoleAction(u.id, role, action)}
                    onStatusAction={(status, reason) => handleStatusAction(u.id, status, reason)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card fade-up delay-3">
        <div className="card-header">
          <div>
            <div className="card-title">Recent role changes</div>
            <div className="table-meta" style={{ marginTop: 2 }}>
              {auditLive
                ? 'From the server audit log.'
                : 'Audit service unavailable — showing this session only.'}
            </div>
          </div>
        </div>
        <div style={{ padding: '4px 20px 18px' }}>
          {audit.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, padding: '10px 0' }}>No role changes recorded yet.</p>
          ) : audit.map(row => {
            const meta = ACTION_TEXT[row.action] || { verb: row.action, color: 'var(--ink-700)' };
            return (
              <div key={row.id} className="adm-audit-row">
                <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{row.actor_name}</span>
                <span style={{ color: meta.color, fontWeight: 600 }}>{meta.verb}</span>
                <span style={{ color: 'var(--ink-700)' }}>{row.target_name}</span>
                <span className="muted">({row.role})</span>
                {row.local && <span className="adm-tag-local">local</span>}
                <span className="adm-audit-time">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

// ── Row actions ───────────────────────────────────────────────────────────────
// Promotion is a privilege change, so it takes two deliberate clicks. Admin
// rows expose no actions at all — admin is invite-only and never promoted, and
// admins cannot suspend each other (see patchUserStatus in api/admin.js for why).
function RowActionsMenu({ user, busy, onRoleAction, onStatusAction }) {
  const [open, setOpen]       = useState(false);
  const [confirm, setConfirm] = useState(null); // 'grant' | 'revoke' | 'suspended' | 'deactivated' | 'active'
  const [reason, setReason]   = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) close(); }
    function onKey(e)  { if (e.key === 'Escape') close(); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function close() { setOpen(false); setConfirm(null); setReason(''); }

  const roles    = user.roles || [];
  const isAdmin  = roles.includes('admin');
  const isEditor = roles.includes('editor');
  const status   = user.status || 'active';
  const isStatusConfirm = ['suspended', 'deactivated', 'active'].includes(confirm);

  function apply(action) {
    onRoleAction('editor', action);
    close();
  }

  function applyStatus(next) {
    onStatusAction(next, reason.trim());
    close();
  }

  const STATUS_COPY = {
    suspended: {
      title: 'Suspend',
      body: <>Suspend <strong>{user.name}</strong>? They cannot sign in until reactivated. Nothing they own is deleted, and any review they are holding is released back to the editor.</>,
      cta: 'Suspend',
      danger: true,
    },
    deactivated: {
      title: 'Delete account',
      body: <>Delete <strong>{user.name}</strong>&apos;s account? They can no longer sign in, will not be invited to review, and drop out of the reviewer pool. This is a soft delete — their submissions and submitted reviews stay on the record, and an admin can restore the account later.</>,
      cta: 'Delete account',
      danger: true,
    },
    active: {
      title: 'Reactivate',
      body: <>Reactivate <strong>{user.name}</strong>? They will be able to sign in again.</>,
      cta: 'Reactivate',
      danger: false,
    },
  };

  return (
    <div className="adm-menu-wrap" ref={ref}>
      <button
        className="icon-btn"
        style={{ width: 30, height: 30 }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${user.name}`}
        disabled={busy}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>

      {open && (
        <div className="adm-menu" role="menu">
          {isAdmin ? (
            <p className="adm-menu-note">
              Administrator accounts cannot be promoted, demoted or suspended here.
            </p>
          ) : isStatusConfirm ? (
            <div className="adm-confirm">
              <p>{STATUS_COPY[confirm].body}</p>
              <div className="field" style={{ marginBottom: 10 }}>
                <label className="field-label">
                  Reason {confirm !== 'active' && <span className="req">*</span>}
                </label>
                <input
                  className="field-input"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Recorded in the audit log"
                />
              </div>
              <div className="adm-confirm-row">
                <button
                  className="btn btn-sm"
                  disabled={confirm !== 'active' && !reason.trim()}
                  style={STATUS_COPY[confirm].danger
                    ? { background: 'var(--red-700)', color: '#fff', border: 'none' }
                    : { background: 'var(--teal-600)', color: '#fff', border: 'none' }}
                  onClick={() => applyStatus(confirm)}
                >
                  {STATUS_COPY[confirm].cta}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setConfirm(null); setReason(''); }}>Cancel</button>
              </div>
            </div>
          ) : confirm ? (
            <div className="adm-confirm">
              <p>
                {confirm === 'grant'
                  ? <>Give <strong>{user.name}</strong> editor access? They will be able to make editorial decisions on submissions.</>
                  : <>Remove editor access from <strong>{user.name}</strong>?</>}
              </p>
              <div className="adm-confirm-row">
                <button
                  className="btn btn-sm"
                  style={confirm === 'grant'
                    ? { background: 'var(--teal-600)', color: '#fff', border: 'none' }
                    : { background: 'var(--red-700)', color: '#fff', border: 'none' }}
                  onClick={() => apply(confirm)}
                >
                  {confirm === 'grant' ? 'Promote' : 'Revoke'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {isEditor ? (
                <button className="adm-menu-item danger" role="menuitem" onClick={() => setConfirm('revoke')}>
                  Revoke editor access
                </button>
              ) : (
                <button className="adm-menu-item" role="menuitem" onClick={() => setConfirm('grant')}>
                  Promote to Editor
                </button>
              )}

              <div className="adm-menu-sep" />

              {status === 'active' ? (
                <>
                  <button className="adm-menu-item" role="menuitem" onClick={() => setConfirm('suspended')}>
                    Suspend account
                  </button>
                  <button className="adm-menu-item danger" role="menuitem" onClick={() => setConfirm('deactivated')}>
                    Delete account
                  </button>
                </>
              ) : (
                <button className="adm-menu-item" role="menuitem" onClick={() => setConfirm('active')}>
                  Reactivate account
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
