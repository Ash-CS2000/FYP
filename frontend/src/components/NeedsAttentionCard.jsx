// src/components/NeedsAttentionCard.jsx
// The admin dashboard's to-do list: only things an administrator can resolve,
// most urgent first, each with a button to where it gets fixed. Facts come from
// getAttention(); system health is passed in from the dashboard, which already
// loads it, so it is never fetched twice.

import { Link } from 'react-router-dom';
import { fullDateTime, timeUntil } from '../utils/time.js';

const RANK = { critical: 0, warning: 1, info: 2 };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const ICONS = {
  health: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8v4M12 16h.01" /></>,
  reviewer: <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M16 11l2 2 4-4" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
};

export function buildAttentionItems(data, health, { onViewHealth } = {}) {
  const items = [];

  if (health && (health.overall === 'down' || health.overall === 'degraded')) {
    const failing = health.checks.filter(c => c.status === 'down' || c.status === 'degraded');
    const down = health.overall === 'down';
    items.push({
      key: 'health', icon: 'health', severity: down ? 'critical' : 'warning',
      title: `${plural(failing.length, 'system check')} ${down ? 'failing' : 'degraded'}`,
      detail: failing.map(c => `${c.label}: ${c.value}`).join(' · '),
      action: { label: 'View health', onClick: onViewHealth },
    });
  }

  if (!data?.thresholds) return items.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  const t = data.thresholds;

  const fs = data.failed_sign_ins;
  if (fs.alert) {
    items.push({
      key: 'failed', icon: 'shield', severity: 'critical',
      title: `${plural(fs.last_24h, 'failed sign-in')} in the last 24 hours`,
      detail: fs.top_account && fs.top_account.count >= t.failed_one_account
        ? `${fs.top_account.count} attempts against ${fs.top_account.email} — possibly someone guessing a password.`
        : 'Spread across several accounts. Check where they came from.',
      action: { label: 'Investigate', to: '/admin/audit?type=login_failure' },
    });
  }

  const ra = data.reviewer_applications;
  if (ra.count > 0) {
    items.push({
      key: 'applications', icon: 'reviewer', severity: ra.overdue ? 'warning' : 'info',
      title: `${plural(ra.count, 'reviewer application')} waiting`,
      detail: ra.oldest
        ? `Oldest: ${ra.oldest.name}, waiting ${plural(ra.oldest.waiting_days, 'day')}${ra.overdue ? ` — over the ${t.application_days}-day target` : ''}.`
        : '',
      action: { label: 'Review', to: '/admin/reviewer-approvals' },
    });
  }

  const ei = data.editor_invites;
  if (ei.expired > 0) {
    items.push({
      key: 'invites-expired', icon: 'mail', severity: 'warning',
      title: `${plural(ei.expired, 'editor invite')} expired without being accepted`,
      detail: 'Send a fresh invite, or cancel it if it is no longer needed.',
      action: { label: 'Manage', to: '/admin/invites' },
    });
  }
  if (ei.expiring_soon > 0) {
    items.push({
      key: 'invites-expiring', icon: 'mail', severity: 'info',
      title: `${plural(ei.expiring_soon, 'editor invite')} expiring within ${t.invite_hours} hours`,
      detail: ei.soonest_expiry ? `The first one expires ${timeUntil(ei.soonest_expiry)} (${fullDateTime(ei.soonest_expiry)}).` : '',
      action: { label: 'Manage', to: '/admin/invites' },
    });
  }

  const se = data.suspensions_ending;
  if (se.count > 0) {
    items.push({
      key: 'suspensions', icon: 'calendar', severity: 'info',
      title: `${plural(se.count, 'suspension')} ending within ${t.suspension_days} days`,
      detail: se.next ? `${se.next.name} can sign in again ${timeUntil(se.next.suspended_until)} (${fullDateTime(se.next.suspended_until)}).` : '',
      action: { label: 'View', to: '/admin/users?filter=suspended' },
    });
  }

  return items.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}

export default function NeedsAttentionCard({ data, state, health, onRetry, onViewHealth }) {
  const items = buildAttentionItems(data, health, { onViewHealth });
  const na = data?.new_accounts;
  const loading = state === 'loading';

  return (
    <div className="card na-card">
      <style>{`
        .na-card { padding:0; overflow:hidden; display:flex; flex-direction:column; }
        .na-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:22px 24px 16px; }
        .na-title-row { display:flex; align-items:center; gap:10px; }
        .na-count { min-width:22px; height:22px; padding:0 7px; border-radius:99px; background:var(--navy-900);
          color:var(--white); font-size:11.5px; font-weight:700; display:inline-flex; align-items:center; justify-content:center; }
        .na-count.zero { background:var(--teal-50); color:var(--teal-800); }
        .na-list { list-style:none; margin:0; padding:0; border-top:1px solid var(--ink-100); }
        .na-item { position:relative; display:flex; align-items:center; gap:14px; padding:14px 24px 14px 27px;
          border-bottom:1px solid var(--ink-100); transition:background var(--t-fast); }
        .na-item:hover { background:var(--ink-50); }
        .na-item::before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px; }
        .na-item.critical::before { background:var(--red-500); }
        .na-item.warning::before { background:var(--amber-500); }
        .na-item.info::before { background:var(--navy-300); }
        .na-icon { width:36px; height:36px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .na-item.critical .na-icon { background:var(--red-50); color:var(--red-700); }
        .na-item.warning .na-icon { background:var(--amber-50); color:var(--amber-800); }
        .na-item.info .na-icon { background:var(--navy-100); color:var(--navy-700); }
        .na-body { flex:1; min-width:0; }
        .na-item-title { font-size:13.5px; font-weight:600; color:var(--navy-900); line-height:1.35; }
        .na-sev { font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; margin-left:8px;
          padding:1px 6px; border-radius:4px; vertical-align:2px; }
        .na-item.critical .na-sev { background:var(--fill-danger); color:var(--on-fill); }
        .na-item-detail { font-size:12.5px; color:var(--ink-600); margin-top:3px; line-height:1.5; }
        .na-action { flex-shrink:0; display:inline-flex; align-items:center; gap:5px; padding:7px 12px; border-radius:var(--r-md);
          border:1px solid var(--ink-200); background:var(--white); font-size:12.5px; font-weight:600; color:var(--navy-800);
          text-decoration:none; white-space:nowrap; transition:all var(--t-fast); cursor:pointer; }
        .na-action:hover { border-color:var(--navy-500); color:var(--navy-900); box-shadow:var(--shadow-sm); }
        .na-action:focus-visible { outline:2px solid var(--navy-500); outline-offset:2px; }
        .na-action svg { transition:transform var(--t-fast); }
        .na-action:hover svg { transform:translateX(2px); }
        .na-clear { display:flex; align-items:center; gap:14px; padding:26px 24px; border-top:1px solid var(--ink-100); }
        .na-clear-icon { width:40px; height:40px; border-radius:50%; background:var(--teal-50); color:var(--teal-700);
          display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .na-skel { display:flex; align-items:center; gap:14px; padding:16px 24px; border-bottom:1px solid var(--ink-100); }
        .na-skel i { display:block; border-radius:6px; background:linear-gradient(90deg, var(--ink-100) 25%, var(--ink-50) 50%, var(--ink-100) 75%);
          background-size:200% 100%; animation:naShimmer 1.2s linear infinite; }
        @keyframes naShimmer { from { background-position:200% 0; } to { background-position:-200% 0; } }
        .na-foot { margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
          padding:14px 24px; background:var(--ink-50); border-top:1px solid var(--ink-100); font-size:12.5px; color:var(--ink-600); }
        .na-foot strong { color:var(--navy-900); font-weight:600; }
        .na-spike { display:inline-flex; align-items:center; gap:5px; margin-left:10px; padding:2px 8px; border-radius:99px;
          background:var(--amber-50); color:var(--amber-800); font-size:11px; font-weight:700; }
        .na-foot a { color:var(--navy-700); font-weight:600; text-decoration:none; }
        .na-foot a:hover { text-decoration:underline; }
      `}</style>

      <div className="na-head">
        <div>
          <div className="na-title-row">
            <div className="card-title">Needs attention</div>
            {!loading && state !== 'error' && (
              <span className={`na-count ${items.length === 0 ? 'zero' : ''}`} aria-label={`${items.length} items`}>{items.length}</span>
            )}
          </div>
          <div className="card-meta" style={{ marginTop: 3 }}>Things only an administrator can resolve, most urgent first.</div>
        </div>
      </div>

      {loading && (
        <div aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map(i => (
            <div key={i} className="na-skel" style={i === 0 ? { borderTop: '1px solid var(--ink-100)' } : undefined}>
              <i style={{ width: 36, height: 36, borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <i style={{ width: `${60 - i * 8}%`, height: 12 }} />
                <i style={{ width: `${40 + i * 6}%`, height: 10, marginTop: 8 }} />
              </div>
              <i style={{ width: 76, height: 30, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      )}

      {state === 'error' && (
        <div className="na-clear">
          <div style={{ flex: 1, fontSize: 13, color: 'var(--red-800)' }}>Could not load what needs attention.</div>
          <button type="button" className="na-action" onClick={onRetry}>Retry</button>
        </div>
      )}

      {!loading && state !== 'error' && items.length === 0 && (
        <div className="na-clear">
          <div className="na-clear-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy-900)' }}>All clear</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-600)', marginTop: 2 }}>Nothing needs an administrator right now.</div>
          </div>
        </div>
      )}

      {!loading && state !== 'error' && items.length > 0 && (
        <ul className="na-list">
          {items.map(item => (
            <li key={item.key} className={`na-item ${item.severity}`}>
              <div className="na-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {ICONS[item.icon]}
                </svg>
              </div>
              <div className="na-body">
                <div className="na-item-title">
                  {item.title}
                  {item.severity === 'critical' && <span className="na-sev">Urgent</span>}
                </div>
                {item.detail && <div className="na-item-detail">{item.detail}</div>}
              </div>
              {item.action.to ? (
                <Link className="na-action" to={item.action.to}>
                  {item.action.label}
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              ) : (
                <button type="button" className="na-action" onClick={item.action.onClick}>
                  {item.action.label}
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {na && (
        <div className="na-foot">
          <span>
            <strong>{na.this_week.toLocaleString()}</strong> new {na.this_week === 1 ? 'account' : 'accounts'} this week
            {' · '}{na.last_week.toLocaleString()} the week before
            {na.spike && <span className="na-spike" title="At least 3× last week — worth a look for spam sign-ups">↑ Unusual spike</span>}
          </span>
          <Link to="/admin/users">View users →</Link>
        </div>
      )}
    </div>
  );
}
