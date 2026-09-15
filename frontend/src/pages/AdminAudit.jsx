// src/pages/AdminAudit.jsx
// The platform-wide audit trail. AdminUsers carries a last-ten panel of role
// changes as context for the work happening on that page; this is the whole log,
// across every action type, which is a different job.
//
// The log is append-only by design. There is no edit control here and no delete
// control, and neither should ever be added: an audit trail an admin can rewrite
// is not an audit trail, and admins are exactly the people it exists to hold
// accountable. See listFullAuditLog in api/admin.js.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { listFullAuditLog } from '../api/admin.js';

// Exactly the types the server records (AuditLog.Type in backend/apps/audit).
// Kept here rather than derived from the rows so a type with no entries yet
// still appears as a filter — an empty 'decision' filter tells the admin
// decisions are logged and none have happened. That is only honest because
// every type listed really is written; never add one the server does not record.
const TYPES = [
  { id: '',                label: 'Everything' },
  { id: 'role_change',     label: 'Roles' },
  { id: 'account_status',  label: 'Accounts' },
  { id: 'invitation',      label: 'Invitations' },
  { id: 'settings_change', label: 'Settings' },
  { id: 'decision',        label: 'Decisions' },
  { id: 'screening',       label: 'Screening' },
  { id: 'assignment',      label: 'Assignments' },
  { id: 'login_failure',   label: 'Sign-in failures' },
  { id: 'security',        label: 'Security' },
];

const TYPE_LABEL = Object.fromEntries(TYPES.filter(t => t.id).map(t => [t.id, t.label]));

const TYPE_TONE = {
  role_change:     { bg: 'var(--navy-100)', fg: 'var(--navy-800)' },
  account_status:  { bg: 'var(--red-50)',   fg: 'var(--red-800)' },
  invitation:      { bg: 'var(--purple-50)', fg: 'var(--purple-800)' },
  settings_change: { bg: 'var(--ink-100)',  fg: 'var(--ink-700)' },
  decision:        { bg: 'var(--green-50)', fg: 'var(--green-800)' },
  screening:       { bg: 'var(--amber-50)', fg: 'var(--amber-800)' },
  assignment:      { bg: 'var(--teal-50)',  fg: 'var(--teal-800)' },
  login_failure:   { bg: 'var(--red-50)',   fg: 'var(--red-700)' },
  security:        { bg: 'var(--fill-danger)', fg: 'var(--on-fill)' },
};

function timestamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminAudit() {
  // ?type=login_failure etc. lets the dashboard link straight to a filtered view.
  const [params] = useSearchParams();
  const [type, setType] = useState(() => (TYPES.some(t => t.id && t.id === params.get('type')) ? params.get('type') : ''));
  const [actor, setActor] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState('loading'); // loading | ready | offline

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    listFullAuditLog({ type, actor, limit: 100 })
      .then(res => {
        if (cancelled) return;
        const results = Array.isArray(res) ? res : res?.results || [];
        setRows(results);
        setTotal(Array.isArray(res) ? results.length : res?.total ?? results.length);
        setState('ready');
      })
      .catch(() => { if (!cancelled) { setRows([]); setState('offline'); } });
    return () => { cancelled = true; };
  }, [type, actor]);

  return (
    <AppShell role="admin">
      <style>{`
        .au-row { display: grid; grid-template-columns: 150px 110px 1fr 180px; gap: 14px; align-items: baseline; padding: 12px 0; border-bottom: 1px solid var(--ink-100); font-size: 13px; }
        .au-row:last-child { border-bottom: none; }
        @media (max-width: 900px) { .au-row { grid-template-columns: 1fr; gap: 4px; } }
        .au-time { color: var(--ink-500); font-size: 12px; white-space: nowrap; }
        .au-type { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; justify-self: start; white-space: nowrap; }
        .au-what { color: var(--navy-900); line-height: 1.55; }
        .au-actor { color: var(--ink-600); font-size: 12.5px; text-align: right; }
        @media (max-width: 900px) { .au-actor { text-align: left; } }
        .au-reason { display: block; color: var(--ink-600); font-size: 12.5px; margin-top: 2px; }
        .au-empty { padding: 40px 24px; text-align: center; color: var(--ink-600); font-size: 13.5px; line-height: 1.7; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">System Administration</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Audit <em className="serif-italic">log</em>.</h1>
          <p className="page-subtitle">
            Every privileged action taken on the platform, by anyone, including you.
          </p>
        </div>
      </div>

      <div className="card fade-up delay-1">
        <div className="card-header">
          <div>
            <div className="card-title">
              {state === 'ready' ? `${total} entr${total === 1 ? 'y' : 'ies'}` : 'Audit trail'}
            </div>
            <div className="card-meta">
              Append-only. Entries cannot be edited or removed from here, deliberately.
            </div>
          </div>
        </div>

        <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {TYPES.map(t => (
            <button
              key={t.id || 'all'}
              className={`filter-chip ${type === t.id ? 'active' : ''}`}
              onClick={() => setType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="field" style={{ maxWidth: 340 }}>
          <label className="field-label">Filter by actor</label>
          <input
            className="field-input"
            value={actor}
            onChange={e => setActor(e.target.value)}
            placeholder="Name or email"
          />
        </div>

        {state === 'loading' && <div className="au-empty">Loading…</div>}

        {state === 'offline' && (
          <div className="au-empty">
            The audit service is unavailable, so nothing can be shown here.
            <br />
            This page deliberately shows nothing rather than a local stand-in — an
            audit log that invents entries when the server is down is worse than an
            empty one.
          </div>
        )}

        {state === 'ready' && rows.length === 0 && (
          <div className="au-empty">
            No entries match. {type && 'This action type is recorded, it just has not happened yet.'}
          </div>
        )}

        {state === 'ready' && rows.map(row => {
          const tone = TYPE_TONE[row.type] || TYPE_TONE.settings_change;
          return (
            <div className="au-row" key={row.id}>
              <span className="au-time">{timestamp(row.created_at)}</span>
              <span className="au-type" style={{ background: tone.bg, color: tone.fg }}>
                {TYPE_LABEL[row.type] || row.type}
              </span>
              <span className="au-what">
                {row.summary}
                {row.reason && <span className="au-reason">Reason: {row.reason}</span>}
              </span>
              <span className="au-actor">
                {row.actor_name || row.actor_email || (row.type === 'login_failure' ? 'Not signed in' : '—')}
              </span>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
