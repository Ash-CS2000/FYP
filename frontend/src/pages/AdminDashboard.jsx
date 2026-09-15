import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import Avatar from '../components/Avatar.jsx';
import NeedsAttentionCard from '../components/NeedsAttentionCard.jsx';
import EditorialPipelineCard from '../components/EditorialPipelineCard.jsx';
import RecentActivityCard, { ADMIN_ACTIVITY_TYPES } from '../components/RecentActivityCard.jsx';
import SignedInUsersDrawer from '../components/SignedInUsersDrawer.jsx';
import {
  listUsers, getSystemHealth, signOutEveryone, listSignedInUsers, getAttention, getEditorialOverview, listFullAuditLog,
} from '../api/admin.js';
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
  const breakdown = preview?.counts
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
              <div className="health-meta">{c.status ? c.detail : (healthState === 'error' ? 'Unavailable' : 'Checking…')}</div>
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

const KPI_ICONS = {
  users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
  reviewer: <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M16 11l2 2 4-4" /></>,
  paper: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M12 18v-6M9 15h6" /></>,
  published: <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></>,
};

export default function AdminDashboard() {
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);

  // Only the server's counts are needed here; page_size=1 keeps it tiny.
  useEffect(() => {
    listUsers({ pageSize: 1 })
      .then(res => setCounts(res.counts))
      .catch(() => { /* the tiles show a dash */ })
      .finally(() => setLoading(false));
  }, []);

  const activeUsers = counts ? counts.all - counts.suspended : 0;

  // One request feeds both the top row and the pipeline card.
  const [overview, setOverview] = useState(null);
  const [overviewState, setOverviewState] = useState('loading'); // loading | ready | error
  function loadOverview() {
    getEditorialOverview()
      .then(res => {
        if (!res?.stages || !res.reviews) throw new Error('Unexpected response');
        setOverview(res);
        setOverviewState('ready');
      })
      .catch(() => setOverviewState(prev => (prev === 'ready' ? 'ready' : 'error')));
  }
  useEffect(() => { loadOverview(); }, []);

  const [activity, setActivity] = useState([]);
  const [activityState, setActivityState] = useState('loading');
  function loadActivity() {
    listFullAuditLog({ type: ADMIN_ACTIVITY_TYPES, limit: 6 })
      .then(res => {
        if (!Array.isArray(res?.results)) throw new Error('Unexpected response');
        setActivity(res.results);
        setActivityState('ready');
      })
      .catch(() => setActivityState(prev => (prev === 'ready' ? 'ready' : 'error')));
  }
  useEffect(() => { loadActivity(); }, []);

  const subs = overview?.submissions;
  const change = subs ? subs.last_30_days - subs.previous_30_days : 0;
  const kpis = [
    {
      key: 'users', label: 'Active users', to: '/admin/users', icon: 'users',
      value: counts ? activeUsers : null,
      sub: counts ? `${counts.suspended} suspended · ${counts.deleted} deleted` : '',
    },
    {
      key: 'reviewers', label: 'Reviewer pool', to: '/admin/users?filter=reviewer', icon: 'reviewer',
      value: overview ? overview.reviewers.active : null,
      sub: overview ? `${overview.reviewers.reviewing} reviewing right now` : '',
    },
    {
      key: 'submissions', label: 'New submissions', to: '/admin/submissions', icon: 'paper',
      value: overview ? subs.last_30_days : null,
      sub: overview ? `${change === 0 ? 'Same as' : `${change > 0 ? '↑' : '↓'} ${Math.abs(change)} vs`} the 30 days before` : '',
      trend: change > 0 ? 'up' : change < 0 ? 'down' : '',
      caption: 'Last 30 days',
    },
    {
      key: 'published', label: 'Published papers', to: '/admin/submissions', icon: 'published',
      value: overview ? overview.published.total : null,
      sub: overview ? `${overview.published.last_30_days} in the last 30 days` : '',
    },
  ];

  const [attention, setAttention] = useState(null);
  const [attentionState, setAttentionState] = useState('loading'); // loading | ready | error
  function loadAttention() {
    getAttention()
      .then(res => {
        // An unexpected reply shows the card's error state rather than taking
        // the whole dashboard down with it.
        if (!res?.thresholds || !res.new_accounts) throw new Error('Unexpected response');
        setAttention(res);
        setAttentionState('ready');
      })
      .catch(() => setAttentionState(prev => (prev === 'ready' ? 'ready' : 'error')));
  }
  useEffect(() => { loadAttention(); }, []);

  const healthCardRef = useRef(null);
  function viewHealth() {
    healthCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    healthCardRef.current?.classList.add('flash');
    setTimeout(() => healthCardRef.current?.classList.remove('flash'), 1400);
  }

  // Loaded on its own so the user stats never wait on a slow external service.
  const [health, setHealth] = useState(null);
  const [healthState, setHealthState] = useState('loading'); // loading | ready | error
  function loadHealth(refresh = false) {
    setHealthState(prev => (prev === 'ready' && refresh ? 'refreshing' : prev === 'ready' ? 'ready' : 'loading'));
    getSystemHealth({ refresh })
      .then(res => {
        if (!Array.isArray(res?.checks) || !OVERALL[res.overall]) throw new Error('Unexpected response');
        setHealth(res);
        setHealthState('ready');
      })
      .catch(() => setHealthState('error'));
  }
  useEffect(() => { loadHealth(); }, []);

  // The four most recent sign-ins and the role mix, for the tile.
  const [signedIn, setSignedIn] = useState(null);
  const [signedInOpen, setSignedInOpen] = useState(false);
  function loadSignedIn() {
    listSignedInUsers({ pageSize: 4 })
      .then(res => { if (res?.counts && Array.isArray(res.results)) setSignedIn(res); })
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
        .kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
        @media (max-width: 1100px) { .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .kpi { display: block; padding: 16px 18px; border: 1px solid var(--ink-200); border-radius: var(--r-lg); background: var(--white);
          text-decoration: none; transition: border-color var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast); }
        .kpi:hover { border-color: var(--navy-300); box-shadow: var(--shadow-md); transform: translateY(-1px); }
        .kpi:focus-visible { outline: 2px solid var(--navy-500); outline-offset: 2px; }
        .kpi-top { display: flex; align-items: center; gap: 10px; }
        .kpi-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .kpi-icon.users { background: var(--navy-100); color: var(--navy-800); }
        .kpi-icon.reviewer { background: var(--teal-50); color: var(--teal-800); }
        .kpi-icon.paper { background: var(--amber-50); color: var(--amber-800); }
        .kpi-icon.published { background: var(--purple-50); color: var(--purple-800); }
        .kpi-label { font-size: 13px; font-weight: 600; color: var(--ink-700); }
        .kpi-caption { margin-left: auto; font-size: 10.5px; color: var(--ink-400); white-space: nowrap; }
        .kpi-value { font-family: var(--font-display); font-size: 30px; font-weight: 500; letter-spacing: -0.02em; color: var(--navy-900);
          line-height: 1; margin-top: 14px; min-height: 30px; font-variant-numeric: tabular-nums; }
        .kpi-sub { font-size: 12px; color: var(--ink-500); margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .kpi-sub.up { color: var(--teal-700); }
        .kpi-sub.down { color: var(--amber-800); }
        .kpi-skel { display: inline-block; width: 64px; height: 26px; border-radius: 6px;
          background: linear-gradient(90deg, var(--ink-100) 25%, var(--ink-50) 50%, var(--ink-100) 75%); background-size: 200% 100%;
          animation: kpiShimmer 1.2s linear infinite; }
        @keyframes kpiShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        .dash-col { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
        .dash-col > .card { margin: 0; }
        /* "View health" from Needs attention: a brief ring so the eye lands on the card. */
        .gap-grid.flash > .card { box-shadow: 0 0 0 3px var(--amber-500); transition: box-shadow 300ms; }
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

      <div className="kpi-row fade-up delay-1">
        {kpis.map(k => (
          <Link key={k.key} to={k.to} className="kpi">
            <div className="kpi-top">
              <span className={`kpi-icon ${k.icon}`} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{KPI_ICONS[k.icon]}</svg>
              </span>
              <span className="kpi-label">{k.label}</span>
              {k.caption && <span className="kpi-caption">{k.caption}</span>}
            </div>
            <div className="kpi-value">{k.value == null ? <span className="kpi-skel" /> : k.value.toLocaleString()}</div>
            <div className={`kpi-sub ${k.trend || ''}`}>{k.value == null ? ' ' : k.sub}</div>
          </Link>
        ))}
      </div>

      <div className="split-grid fade-up delay-2" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start' }}>
        <div className="dash-col">
          <NeedsAttentionCard
            data={attention}
            state={attentionState}
            health={healthState === 'ready' ? health : null}
            onRetry={() => { setAttentionState('loading'); loadAttention(); }}
            onViewHealth={viewHealth}
          />
          <EditorialPipelineCard data={overview} state={overviewState} onRetry={() => { setOverviewState('loading'); loadOverview(); }} />
        </div>

        <div className="gap-grid" ref={healthCardRef}>
          <SystemHealthCard
            health={health}
            healthState={healthState}
            onRefresh={() => { loadHealth(true); loadSignedIn(); }}
            onSignedOutEveryone={() => { loadHealth(); loadSignedIn(); loadActivity(); }}
            signedIn={signedIn}
            onOpenSignedIn={() => setSignedInOpen(true)}
          />
          <RecentActivityCard rows={activity} state={activityState} onRetry={() => { setActivityState('loading'); loadActivity(); }} />
          <SignedInUsersDrawer open={signedInOpen} onClose={() => { setSignedInOpen(false); loadSignedIn(); }} />
        </div>
      </div>
    </AppShell>
  );
}
