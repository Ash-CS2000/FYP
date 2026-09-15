import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import SearchField from '../components/SearchField.jsx';
import Pagination from '../components/Pagination.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { patchUserRole, patchUserStatus, listUsers, listAuditLog, USERS_PAGE_SIZE } from '../api/admin.js';

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
    suspended_until: u.suspended_until || null,
    date: u.joined
      ? new Date(u.joined).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—',
    initials: getInitials(u.name || u.email),
  };
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Account state outranks a pending reviewer application: a suspended applicant
// is suspended first.
function statusPill(u) {
  if (u.status === 'suspended') {
    return { cls: 'pill-suspended', label: u.suspended_until ? `Suspended until ${shortDate(u.suspended_until)}` : 'Suspended' };
  }
  if (u.status === 'deactivated') return { cls: 'pill-deleted', label: 'Deleted' };
  if (u.reviewer_status === 'pending') return { cls: 'pill-pending', label: 'Reviewer Pending' };
  return { cls: 'pill-active', label: 'Active' };
}

// Each filter chip is a server query. Deleted accounts only ever come back under
// their own filter; suspended ones appear in the normal lists and in their own.
const FILTER_PARAMS = {
  all:       {},
  author:    { role: 'author' },
  reviewer:  { role: 'reviewer' },
  editor:    { role: 'editor' },
  suspended: { status: 'suspended' },
  deleted:   { status: 'deactivated' },
};
const EMPTY_COUNTS = { all: 0, author: 0, reviewer: 0, editor: 0, admin: 0, suspended: 0, deleted: 0 };

export default function AdminUsers() {
  // ?filter=suspended etc. lets other pages (the dashboard) link straight to a view.
  const [params] = useSearchParams();
  const [filter, setFilter]   = useState(() => (FILTER_PARAMS[params.get('filter')] ? params.get('filter') : 'all'));
  const [search, setSearch]   = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [counts, setCounts]   = useState(EMPTY_COUNTS);
  const [usersLoading, setUsersLoading] = useState(true); // first load only
  const [refreshing, setRefreshing] = useState(false);    // later loads keep the rows visible
  const [usersError, setUsersError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [audit, setAudit]     = useState([]);
  const [auditState, setAuditState] = useState('loading'); // loading | ready | error
  const [notice, setNotice]   = useState(null); // { tone: 'ok' | 'error', text }
  const requestSeq = useRef(0);
  const tableTop = useRef(null);

  // The page number belongs to one filter + search combination. Changing either
  // lands on page 1 without a separate reset, so there is never a wasted request
  // for "page 5 of the old search".
  const queryKey = `${filter}|${debouncedSearch}`;
  const [pageState, setPageState] = useState({ key: queryKey, page: 1 });
  // Reset during render (not in an effect) so the stale page is never requested,
  // and so returning to an earlier search starts at page 1 rather than where it was.
  if (pageState.key !== queryKey) setPageState({ key: queryKey, page: 1 });
  const page = pageState.key === queryKey ? pageState.page : 1;
  const goToPage = (n) => {
    setPageState({ key: queryKey, page: n });
    tableTop.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  function loadAudit() {
    listAuditLog({ limit: 10 })
      .then(rows => { setAudit(rows); setAuditState('ready'); })
      .catch(() => setAuditState('error'));
  }

  function loadUsers() {
    // Only the newest request may update the table — a slow reply for an old
    // search must not overwrite the results for the current one.
    const seq = ++requestSeq.current;
    setRefreshing(true);
    setUsersError('');
    listUsers({ page, search: debouncedSearch, ...FILTER_PARAMS[filter] })
      .then(res => {
        if (seq !== requestSeq.current) return;
        // The last row on the last page was just moved away (e.g. deleted).
        if (res.results.length === 0 && res.total > 0 && page > 1) {
          setPageState({ key: queryKey, page: Math.ceil(res.total / res.page_size) });
          return;
        }
        setUsers(res.results.map(toRow));
        setTotal(res.total);
        setCounts({ ...EMPTY_COUNTS, ...res.counts });
      })
      .catch(() => { if (seq === requestSeq.current) setUsersError('Could not load users from the server.'); })
      .finally(() => {
        if (seq === requestSeq.current) {
          setUsersLoading(false);
          setRefreshing(false);
        }
      });
  }

  useEffect(() => { loadAudit(); }, []);
  useEffect(() => { loadUsers(); }, [queryKey, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // One path for every user mutation. The table only changes once the server
  // confirms: a change that failed must never look like it worked, because the
  // admin will act on what this screen tells them.
  async function applyUserChange({ key, request, successText, failureText }) {
    setActionLoading(key);
    setNotice(null);
    try {
      const updated = await request();
      setUsers(prev => prev.map(u => (u.id === updated.id ? toRow(updated) : u)));
      setNotice({ tone: 'ok', text: typeof successText === 'function' ? successText(updated) : successText });
      loadAudit();
      // The change can move the user out of this filter and shifts the counts.
      loadUsers();
    } catch (err) {
      setNotice({ tone: 'error', text: `${failureText} ${err?.message || ''}`.trim() });
    } finally {
      setActionLoading(null);
    }
  }

  // Editors are made here and nowhere else — there is no editor registration.
  function handleRoleAction(userId, role, action) {
    const target = users.find(u => u.id === userId);
    // Admins are out of reach of promotion/demotion entirely.
    if ((target?.roles || []).includes('admin')) return undefined;
    const name = target?.name || 'this user';
    return applyUserChange({
      key: `${userId}-${role}-${action}`,
      request: () => patchUserRole(userId, role, action),
      successText: action === 'grant' ? `${name} is now an editor.` : `Editor access removed from ${name}.`,
      failureText: action === 'grant' ? `Could not promote ${name}.` : `Could not remove editor access from ${name}.`,
    });
  }

  // Suspension and soft deletion. Never a hard delete — see patchUserStatus in
  // api/admin.js for what each state does to the reviews a user is holding.
  function handleStatusAction(userId, status, reason, until) {
    const target = users.find(u => u.id === userId);
    if ((target?.roles || []).includes('admin')) return undefined;
    const name = target?.name || 'this user';
    const wasDeleted = target?.status === 'deactivated';
    return applyUserChange({
      key: `${userId}-status-${status}`,
      request: () => patchUserStatus(userId, status, reason, until),
      successText: (updated) => {
        const released = updated.released_reviews
          ? ` ${updated.released_reviews} review${updated.released_reviews === 1 ? '' : 's'} they were holding went back to the editor${updated.released_reviews === 1 ? '' : 's'}.`
          : '';
        if (status === 'suspended') {
          const ends = updated.suspended_until ? ` until ${shortDate(updated.suspended_until)}` : ' with no end date';
          return `${name} is suspended${ends}.${released}`;
        }
        if (status === 'deactivated') return `${name}'s account was deleted. It is now under the Deleted filter.${released}`;
        return wasDeleted ? `${name}'s account was restored.` : `${name}'s account was reactivated.`;
      },
      failureText: `Could not update ${name}'s account.`,
    });
  }

  const hiddenDeletedMatches = filter !== 'deleted' && debouncedSearch ? counts.deleted : 0;

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
        .adm-confirm { padding:10px 12px; width:270px; }
        .adm-confirm p { font-size:12.5px; color:var(--navy-200); line-height:1.5; margin-bottom:10px; }
        .adm-confirm-row { display:flex; gap:6px; }
        /* The menu is dark navy; the global form label and required star are
           dark-on-light and disappear here. */
        .adm-confirm .field-label { color:var(--navy-200); font-size:12.5px; }
        .adm-confirm .field-label .req { color:#fca5a5; }
        .adm-confirm .btn:disabled { opacity:.45; cursor:not-allowed; }
        /* fade-up leaves every card as its own stacking layer, so the card below
           painted over the row menu whenever the list was short. Lift this one. */
        .adm-table-card { position:relative; z-index:2; scroll-margin-top:16px; }
        .adm-refreshing tbody { opacity:.55; transition:opacity var(--t-fast); }
        .adm-audit-row { display:flex; gap:10px; align-items:baseline; padding:9px 0; border-bottom:1px solid var(--ink-100); font-size:13px; }
        .adm-audit-row:last-child { border-bottom:none; }
        .adm-audit-time { margin-left:auto; font-size:11.5px; color:var(--ink-600); white-space:nowrap; }
        .pill-suspended { background:var(--amber-50); color:var(--amber-800); }
        .pill-deleted   { background:var(--red-50); color:var(--red-800); }
        .adm-confirm input[type=date] { color-scheme:light; }
        .adm-confirm .field-hint { color:var(--navy-300); }
        .adm-filter-sep { width:1px; align-self:stretch; background:var(--ink-200); margin:2px 2px; }
        .adm-deleted-hint { font-size:12.5px; color:var(--ink-600); padding:0 0 12px; }
        .adm-deleted-hint button { color:var(--navy-700); font-weight:600; }
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

      {notice && (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className="card fade-up"
          style={{
            borderLeft: `3px solid ${notice.tone === 'error' ? 'var(--red-700)' : 'var(--teal-600)'}`,
            padding: '12px 18px', fontSize: 13.5, marginBottom: 16,
            color: notice.tone === 'error' ? 'var(--red-800)' : 'var(--navy-900)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <span style={{ flex: 1 }}>{notice.text}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="card fade-up delay-2 adm-table-card" ref={tableTop}>
        <div className="card-header adm-toolbar">
          <div>
            <div className="card-title">
              {usersLoading
                ? 'Loading users…'
                : `${total.toLocaleString()} ${filter === 'deleted' ? 'deleted ' : filter === 'suspended' ? 'suspended ' : ''}user${total === 1 ? '' : 's'}`}
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
              { id: 'all',      label: 'All',       count: counts.all },
              { id: 'author',   label: 'Authors',   count: counts.author },
              { id: 'reviewer', label: 'Reviewers', count: counts.reviewer },
              { id: 'editor',   label: 'Editors',   count: counts.editor },
              { id: 'sep' },
              { id: 'suspended', label: 'Suspended', count: counts.suspended },
              { id: 'deleted',  label: 'Deleted',   count: counts.deleted },
            ].map(f => (f.id === 'sep' ? <span key="sep" className="adm-filter-sep" aria-hidden="true" /> : (
              <button key={f.id} className={`filter-chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label} <span style={{ opacity: .6 }}>{f.count}</span>
              </button>
            )))}
          </div>
        </div>

        {hiddenDeletedMatches > 0 && (
          <p className="adm-deleted-hint">
            {hiddenDeletedMatches} deleted account{hiddenDeletedMatches === 1 ? ' also matches' : 's also match'} this search.{' '}
            <button type="button" onClick={() => setFilter('deleted')}>Show deleted</button>
          </p>
        )}

        <table className={`data-table ${refreshing && !usersLoading ? 'adm-refreshing' : ''}`} aria-busy={refreshing}>
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
            ) : users.length === 0 ? (
              <tr><td colSpan={6}><p className="muted" style={{ fontSize: 13, padding: '16px 0' }}>
                {debouncedSearch
                  ? `No users match “${debouncedSearch}”.`
                  : filter === 'deleted' ? 'No deleted accounts.'
                  : filter === 'suspended' ? 'No suspended accounts.'
                  : 'No users match this filter.'}
              </p></td></tr>
            ) : users.map(u => (
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
                      <span key={r} style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: r === 'reviewer' ? 'var(--teal-50)' : r === 'editor' ? 'var(--indigo-50)' : r === 'admin' ? 'var(--warn-100)' : 'var(--ink-100)', color: r === 'reviewer' ? 'var(--teal-800)' : r === 'editor' ? 'var(--indigo-800)' : r === 'admin' ? 'var(--warn-800)' : 'var(--ink-700)' }}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </span>
                    ))}
                  </div>
                </td>
                <td><span className="muted">{u.institution}</span></td>
                <td><span className="muted">{u.date}</span></td>
                <td>
                  <span className={`pill ${statusPill(u).cls}`}>
                    {statusPill(u).label}
                  </span>
                </td>
                <td>
                  <RowActionsMenu
                    user={u}
                    busy={actionLoading?.startsWith(`${u.id}-`)}
                    onRoleAction={(role, action) => handleRoleAction(u.id, role, action)}
                    onStatusAction={(status, reason, until) => handleStatusAction(u.id, status, reason, until)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!usersLoading && !usersError && (
          <Pagination page={page} pageSize={USERS_PAGE_SIZE} total={total} onChange={goToPage} busy={refreshing} />
        )}
      </div>

      <div className="card fade-up delay-3">
        <div className="card-header">
          <div>
            <div className="card-title">Recent role changes</div>
            <div className="table-meta" style={{ marginTop: 2 }}>
              From the audit log. <Link to="/admin/audit" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>See everything →</Link>
            </div>
          </div>
        </div>
        <div style={{ padding: '4px 20px 18px' }}>
          {auditState === 'loading' ? (
            <p className="muted" style={{ fontSize: 13, padding: '10px 0' }}>Loading…</p>
          ) : auditState === 'error' ? (
            <p style={{ fontSize: 13, padding: '10px 0', color: 'var(--red-700)' }}>
              Could not load the audit log.{' '}
              <button className="btn btn-ghost btn-sm" onClick={loadAudit}>Retry</button>
            </p>
          ) : audit.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, padding: '10px 0' }}>No role changes recorded yet.</p>
          ) : audit.map(row => (
            <div key={row.id} className="adm-audit-row">
              <span style={{ color: 'var(--navy-900)' }}>{row.summary}</span>
              <span className="muted">by {row.actor_name || row.actor_email || 'system'}</span>
              <span className="adm-audit-time">
                {new Date(row.created_at).toLocaleString()}
              </span>
            </div>
          ))}
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
  const [until, setUntil]     = useState(''); // YYYY-MM-DD, suspensions only
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

  function close() { setOpen(false); setConfirm(null); setReason(''); setUntil(''); }

  const roles    = user.roles || [];
  const isAdmin  = roles.includes('admin');
  const isEditor = roles.includes('editor');
  const status   = user.status || 'active';
  const isStatusConfirm = ['suspended', 'deactivated', 'active'].includes(confirm);

  // The earliest end date the server accepts is tomorrow, in local time.
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  function apply(action) {
    onRoleAction('editor', action);
    close();
  }

  function applyStatus(next) {
    onStatusAction(next, reason.trim(), next === 'suspended' ? until : '');
    close();
  }

  const blocked = <>They cannot sign in, drop out of the reviewer pool, and any review invitation or unfinished review they hold goes back to its editor.</>;
  const STATUS_COPY = {
    suspended: {
      body: <>Suspend <strong>{user.name}</strong> for now? {blocked} Everything they submitted stays.</>,
      cta: 'Suspend',
      danger: true,
    },
    deactivated: {
      body: status === 'suspended'
        ? <>Delete <strong>{user.name}</strong>&apos;s account instead of suspending it? The end date is removed and the account moves to the Deleted list. Their submissions and submitted reviews stay, and an admin can restore it.</>
        : <>Delete <strong>{user.name}</strong>&apos;s account? {blocked} It moves to the Deleted list. This is a soft delete — their submissions and submitted reviews stay, and an admin can restore it.</>,
      cta: 'Delete account',
      danger: true,
    },
    active: {
      body: <>{status === 'deactivated' ? 'Restore' : 'Reactivate'} <strong>{user.name}</strong>&apos;s account? They can sign in again. Reviews released when the account was blocked are not given back — the editors may already have replaced them.</>,
      cta: status === 'deactivated' ? 'Restore account' : 'Reactivate now',
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
        <div className="adm-menu fixed-palette" role="menu">
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
              {confirm === 'suspended' && (
                <div className="field" style={{ marginBottom: 10 }}>
                  <label className="field-label" htmlFor={`until-${user.id}`}>Reactivate automatically on</label>
                  <input
                    id={`until-${user.id}`}
                    className="field-input"
                    type="date"
                    min={tomorrow}
                    value={until}
                    onChange={e => setUntil(e.target.value)}
                  />
                  <div className="field-hint" style={{ marginTop: 4 }}>Optional. Leave empty to suspend until you reactivate them.</div>
                </div>
              )}
              <div className="adm-confirm-row">
                <button
                  className="btn btn-sm"
                  disabled={(confirm !== 'active' && !reason.trim()) || (confirm === 'suspended' && until !== '' && until < tomorrow)}
                  style={STATUS_COPY[confirm].danger
                    ? { background: 'var(--red-700)', color: '#fff', border: 'none' }
                    : { background: 'var(--teal-600)', color: '#fff', border: 'none' }}
                  onClick={() => applyStatus(confirm)}
                >
                  {STATUS_COPY[confirm].cta}
                </button>
                <button className="btn btn-outline-light btn-sm" onClick={() => { setConfirm(null); setReason(''); setUntil(''); }}>Cancel</button>
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
                <button className="btn btn-outline-light btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {/* A deleted account's roles are frozen until it is restored. */}
              {status !== 'deactivated' && (
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
                </>
              )}

              {status === 'active' && (
                <>
                  <button className="adm-menu-item" role="menuitem" onClick={() => setConfirm('suspended')}>
                    Suspend account
                  </button>
                  <button className="adm-menu-item danger" role="menuitem" onClick={() => setConfirm('deactivated')}>
                    Delete account
                  </button>
                </>
              )}
              {status === 'suspended' && (
                <>
                  <button className="adm-menu-item" role="menuitem" onClick={() => setConfirm('active')}>
                    Reactivate now
                  </button>
                  <button className="adm-menu-item danger" role="menuitem" onClick={() => setConfirm('deactivated')}>
                    Delete account
                  </button>
                </>
              )}
              {status === 'deactivated' && (
                <button className="adm-menu-item" role="menuitem" onClick={() => setConfirm('active')}>
                  Restore account
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
