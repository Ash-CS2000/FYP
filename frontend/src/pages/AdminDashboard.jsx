import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import Avatar from '../components/Avatar.jsx';
import SignedInUsersDrawer from '../components/SignedInUsersDrawer.jsx';
import { listUsers, getSystemHealth, signOutEveryone, listSignedInUsers } from '../api/admin.js';
import { saveTokens } from '../api/auth';

const OVERALL = {
  operational: { pill: 'Operational',     tone: 'ok',       subtitle: 'All systems operational' },
  degraded:    { pill: 'Degraded',        tone: 'degraded', subtitle: 'Some systems degraded' },
  down:        { pill: 'Issues detected', tone: 'down',     subtitle: 'Issues detected' },
  loading:     { pill: 'Checking…',       tone: 'info',     subtitle: 'Checking systems' },
  refreshing:  { pill: 'Checking…',       tone: 'info',     subtitle: 'Checking systems' },
  error:       { pill: 'Unavailable',     tone: 'down',     subtitle: 'System health unavailable' },
};

function clock(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const ROLE_WORDS = [['author', 'author', 'authors'], ['reviewer', 'reviewer', 'reviewers'], ['editor', 'editor', 'editors'], ['admin', 'admin', 'admins']];

// The signed-in tile answers "who?", not just "how many?": the most recent
// faces, the mix of roles, and a way into the full list.
function SignedInTile({ check, preview, onOpen }) {
  const total = preview?.total ?? (check.value != null ? Number(String(check.value).replace(/,/g, '')) : null);
  const people = preview?.results || [];
  const breakdown = preview
    ? ROLE_WORDS.filter(([k]) => preview.counts[k]).map(([k, one, many]) => `${preview.counts[k]} ${preview.counts[k] === 1 ? one : many}`)
    : [];
  const more = total != null ? Math.max(0, total - people.length) : 0;

  return (
    <button type="button" className="health-tile health-tile-action" onClick={onOpen} aria-label={`Signed-in users: ${total ?? 'loading'}. View who.`}>
      <div className="health-row">
        <div className={`health-dot ${check.status || 'pending'}`}></div>
        <span className="health-name">{check.label}</span>
      </div>
      <div className="health-value">{total != null && !Number.isNaN(total) ? total.toLocaleString() : '—'}</div>
      {people.length > 0 && (
        <div className="face-stack" aria-hidden="true">
          {people.map(p => <Avatar key={p.id} user={p} size={26} className="face" />)}
          {more > 0 && <span className="face face-more">+{more}</span>}
        </div>
      )}
      <div className="health-meta">
        {breakdown.length
          ? breakdown.map((part, i) => (
            <span key={part}>{i > 0 && ' · '}<span className="role-part">{part}</span></span>
          ))
          : (check.detail || 'Checking…')}
      </div>
      <span className="health-tile-link">
        View who
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
    </button>
  );
}

function SystemHealthCard({ health, healthState, onRefresh, onSignedOutEveryone, signedIn, onOpenSignedIn }) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { tone, text }

  const shown = healthState === 'refreshing' || healthState === 'ready' ? health : null;
  const overall = OVERALL[healthState === 'ready' ? health.overall : healthState];

  async function confirmSignOut() {
    setBusy(true);
    setResult(null);
    try {
      const res = await signOutEveryone(reason);
      // The caller's old tokens died with everyone else's; keep the fresh pair.
      saveTokens(res.access, res.refresh);
      setResult({
        tone: 'ok',
        text: `Everyone else has been signed out${res.signed_out_users ? ` (${res.signed_out_users} ${res.signed_out_users === 1 ? 'person' : 'people'})` : ''}. You are still signed in.`,
      });
      setConfirming(false);
      setReason('');
      onSignedOutEveryone();
    } catch (err) {
      setResult({ tone: 'error', text: `Could not sign everyone out. ${err?.message || ''}`.trim() });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: 10 }}>
        <div className="card-title">System Health</div>
        <span className={`health-pill ${overall.tone}`}>{overall.pill}</span>
      </div>
      <div className="health-checked">
        {shown ? `Checked at ${clock(shown.checked_at)}` : healthState === 'error' ? 'The health checks could not run.' : 'Running checks…'}
        <button type="button" className="health-refresh" onClick={onRefresh} disabled={healthState === 'loading' || healthState === 'refreshing'}>
          {healthState === 'refreshing' ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      <div className={`health-grid ${healthState === 'refreshing' ? 'is-refreshing' : ''}`}>
        {(shown?.checks || ['Database', 'File storage', 'Plagiarism engine', 'Signed-in users'].map(label => ({ key: label, label }))).map(c => (
          c.key === 'signed_in_users' || c.key === 'Signed-in users' ? (
            <SignedInTile key="signed_in" check={c} preview={signedIn} onOpen={onOpenSignedIn} />
          ) : (
            <div key={c.key} className="health-tile">
              <div className="health-row">
                <div className={`health-dot ${c.status || 'pending'}`}></div>
                <span className="health-name">{c.label}</span>
              </div>
              <div className="health-value">{c.value ?? '—'}</div>
              <div className="health-meta">{c.detail || (healthState === 'error' ? 'Unavailable' : 'Checking…')}</div>
            </div>
          )
        ))}
      </div>

      <div className="health-maint">
        <div className="health-maint-head">
          <div>
            <div className="health-maint-title">Sign out everyone</div>
            <div className="health-meta" style={{ marginTop: 2 }}>
              {shown?.sessions_revoked_at
                ? `Last used ${new Date(shown.sessions_revoked_at).toLocaleString()} by ${shown.sessions_revoked_by || 'an administrator'}.`
                : 'For a security incident, such as a leaked password.'}
            </div>
          </div>
          {!confirming && (
            <button type="button" className="btn btn-sm health-danger" onClick={() => { setConfirming(true); setResult(null); }}>
              Sign out everyone
            </button>
          )}
        </div>

        {confirming && (
          <div className="health-confirm">
            <p>
              Every signed-in user is signed out <strong>immediately</strong> — their very next action
              takes them to the login page. You stay signed in. This is recorded in the audit log.
            </p>
            <label className="field-label" htmlFor="signout-reason">Reason <span className="req">*</span></label>
            <input
              id="signout-reason"
              className="field-input"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. An admin password was leaked"
            />
            <div className="health-confirm-row">
              <button type="button" className="btn btn-sm health-danger" disabled={busy || !reason.trim()} onClick={confirmSignOut}>
                {busy ? 'Signing everyone out…' : 'Sign everyone out now'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setConfirming(false); setReason(''); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {result && (
          <div role={result.tone === 'error' ? 'alert' : 'status'} className={`health-result ${result.tone}`}>{result.text}</div>
        )}
      </div>
    </div>
  );
}

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
  const [recent, setRecent] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Three newest accounts plus the server's counts — one small request however
  // many users the platform has.
  useEffect(() => {
    listUsers({ pageSize: 3 })
      .then(res => { setRecent(res.results); setCounts(res.counts); })
      .catch(() => setError('Could not load users from the server.'))
      .finally(() => setLoading(false));
  }, []);

  const roleCounts = ROLE_STAT_META.map(meta => ({
    ...meta,
    num: counts?.[meta.key] ?? 0,
  }));

  const recentUsers = recent.map(toRow);
  const activeUsers = counts ? counts.all - counts.suspended : 0;

  // Loaded on its own so the user stats never wait on a slow external service.
  const [health, setHealth] = useState(null);
  const [healthState, setHealthState] = useState('loading'); // loading | ready | error
  function loadHealth(refresh = false) {
    setHealthState(prev => (prev === 'ready' && refresh ? 'refreshing' : prev === 'ready' ? 'ready' : 'loading'));
    getSystemHealth({ refresh })
      .then(res => { setHealth(res); setHealthState('ready'); })
      .catch(() => setHealthState('error'));
  }
  useEffect(() => { loadHealth(); }, []);

  // The four most recent sign-ins and the role mix, for the tile.
  const [signedIn, setSignedIn] = useState(null);
  const [signedInOpen, setSignedInOpen] = useState(false);
  function loadSignedIn() {
    listSignedInUsers({ pageSize: 4 })
      .then(setSignedIn)
      .catch(() => { /* the tile falls back to the health check's count */ });
  }
  useEffect(() => { loadSignedIn(); }, []);

  return (
    <AppShell role="admin">
      <style>{`
        .health-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; transition: opacity var(--t-fast); }
        .health-grid.is-refreshing { opacity: .55; }
        .health-tile { background: var(--white); border: 1px solid var(--ink-200); border-radius: var(--r-md); padding: 14px 16px; min-width: 0; }
        .health-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .health-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--ink-300); }
        .health-dot.ok { background: var(--teal-500); box-shadow: 0 0 0 4px rgba(29,158,117,0.18); }
        .health-dot.degraded { background: var(--amber-500); box-shadow: 0 0 0 4px rgba(239,159,39,0.18); }
        .health-dot.down { background: var(--red-500); box-shadow: 0 0 0 4px rgba(226,75,74,0.18); }
        .health-dot.info { background: var(--navy-500); box-shadow: 0 0 0 4px rgba(55,138,221,0.16); }
        .health-name { font-size: 13px; font-weight: 500; color: var(--navy-900); }
        .health-value { font-family: var(--font-display); font-size: 21px; font-weight: 500; color: var(--navy-900); letter-spacing: -0.02em; line-height: 1.1; margin-top: 6px; overflow-wrap: anywhere; }
        .health-meta { font-size: 11.5px; color: var(--ink-500); margin-top: 4px; line-height: 1.45; }
        .health-tile-action { display: block; width: 100%; text-align: left; cursor: pointer; font: inherit;
          transition: border-color var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast); }
        .health-tile-action:hover { border-color: var(--navy-300); box-shadow: var(--shadow-md); transform: translateY(-1px); }
        .health-tile-action:focus-visible { outline: 2px solid var(--navy-500); outline-offset: 2px; }
        .health-tile-link { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px;
          font-size: 12px; font-weight: 600; color: var(--navy-700); }
        .health-tile-action:hover .health-tile-link svg { transform: translateX(2px); }
        .health-tile-link svg { transition: transform var(--t-fast); }
        .face-stack { display: flex; align-items: center; margin-top: 8px; padding-left: 4px; }
        .face-stack .face { margin-left: -4px; border: 2px solid var(--white); box-sizing: content-box; letter-spacing: -0.02em; }
        .face-more { width: 26px; height: 26px; border-radius: 50%; background: var(--ink-100); color: var(--ink-700);
          font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
        .role-part { white-space: nowrap; }
        .health-pill { font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 99px; white-space: nowrap; }
        .health-pill.ok { background: var(--green-50); color: var(--green-800); }
        .health-pill.degraded { background: var(--amber-50); color: var(--amber-800); }
        .health-pill.down { background: var(--red-50); color: var(--red-800); }
        .health-pill.info { background: var(--ink-100); color: var(--ink-700); }
        .health-checked { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--ink-500); margin-bottom: 14px; }
        .health-refresh { font-size: 12px; font-weight: 600; color: var(--navy-700); }
        .health-refresh:disabled { color: var(--ink-400); cursor: default; }
        .health-maint { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--ink-100); }
        .health-maint-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .health-maint-title { font-size: 13px; font-weight: 600; color: var(--navy-900); }
        .health-danger { background: var(--red-700); color: var(--white); border: none; }
        .health-danger:hover:not(:disabled) { background: var(--red-800); }
        .health-danger:disabled { opacity: .45; cursor: not-allowed; }
        .health-confirm { margin-top: 12px; padding: 14px; border: 1px solid var(--red-200); background: var(--red-50); border-radius: var(--r-md); }
        .health-confirm p { font-size: 12.5px; color: var(--red-800); line-height: 1.55; margin-bottom: 10px; }
        .health-confirm-row { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .health-result { margin-top: 12px; font-size: 12.5px; line-height: 1.5; }
        .health-result.ok { color: var(--teal-700); }
        .health-result.error { color: var(--red-800); }
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
            {OVERALL[healthState === 'ready' ? health.overall : healthState].subtitle} · {loading ? '—' : `${activeUsers.toLocaleString()} active users`}.
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
                    {u.status === 'suspended' ? (
                      <span className="pill pill-review">Suspended</span>
                    ) : u.status === 'deactivated' ? (
                      <span className="pill pill-rejected">Deleted</span>
                    ) : (
                      <span className={`pill pill-${u.reviewer_status === 'pending' ? 'pending' : 'active'}`}>
                        {u.reviewer_status === 'pending' ? 'Reviewer Pending' : 'Active'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="gap-grid">
          <SystemHealthCard
            health={health}
            healthState={healthState}
            onRefresh={() => { loadHealth(true); loadSignedIn(); }}
            onSignedOutEveryone={() => { loadHealth(); loadSignedIn(); }}
            signedIn={signedIn}
            onOpenSignedIn={() => setSignedInOpen(true)}
          />
          <SignedInUsersDrawer open={signedInOpen} onClose={() => { setSignedInOpen(false); loadSignedIn(); }} />
        </div>
      </div>
    </AppShell>
  );
}
