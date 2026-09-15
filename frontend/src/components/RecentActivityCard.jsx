// src/components/RecentActivityCard.jsx
// The last few things administrators did, from the audit log — the counterpart
// to "Needs attention": that card is what still needs doing, this is what was done.

import { Link } from 'react-router-dom';
import { fullDateTime, timeAgo } from '../utils/time.js';

export const ADMIN_ACTIVITY_TYPES = ['role_change', 'account_status', 'invitation', 'settings_change', 'security'];

const TONE = {
  role_change: 'var(--navy-500)',
  account_status: 'var(--red-500)',
  invitation: 'var(--purple-700)',
  settings_change: 'var(--ink-400)',
  security: 'var(--red-700)',
};

export default function RecentActivityCard({ rows, state, onRetry }) {
  return (
    <div className="card ra-card">
      <style>{`
        .ra-card { padding:22px 24px; }
        .ra-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px; }
        .ra-link { font-size:12.5px; font-weight:600; color:var(--navy-700); white-space:nowrap; }
        .ra-list { list-style:none; margin:0; padding:0; position:relative; }
        .ra-item { position:relative; display:flex; gap:14px; padding:9px 0 9px 2px; }
        .ra-item:not(:last-child)::after { content:""; position:absolute; left:6px; top:26px; bottom:-9px; width:1px; background:var(--ink-200); }
        .ra-dot { width:9px; height:9px; margin-top:5px; border-radius:50%; flex-shrink:0; box-shadow:0 0 0 3px var(--white); position:relative; z-index:1; }
        .ra-main { flex:1; min-width:0; }
        .ra-summary { font-size:13px; color:var(--navy-900); line-height:1.45; }
        .ra-meta { font-size:11.5px; color:var(--ink-500); margin-top:2px; }
        .ra-reason { font-style:italic; }
        .ra-empty { font-size:13px; color:var(--ink-500); margin:4px 0 0; }
      `}</style>
      <div className="ra-head">
        <div>
          <div className="card-title">Recent admin activity</div>
          <div className="card-meta" style={{ marginTop: 3 }}>What administrators did most recently.</div>
        </div>
        <Link to="/admin/audit" className="ra-link">Full audit log →</Link>
      </div>

      {state === 'loading' && <p className="ra-empty">Loading…</p>}
      {state === 'error' && (
        <p className="ra-empty" style={{ color: 'var(--red-800)' }}>
          Could not load recent activity. <button type="button" className="ra-link" onClick={onRetry}>Retry</button>
        </p>
      )}
      {state === 'ready' && rows.length === 0 && <p className="ra-empty">No administrator actions recorded yet.</p>}
      {state === 'ready' && rows.length > 0 && (
        <ul className="ra-list">
          {rows.map(row => (
            <li key={row.id} className="ra-item">
              <span className="ra-dot" style={{ background: TONE[row.type] || 'var(--ink-400)' }} aria-hidden="true" />
              <div className="ra-main">
                <div className="ra-summary">{row.summary}</div>
                <div className="ra-meta">
                  {row.actor_name || 'System'} · <span title={fullDateTime(row.created_at)}>{timeAgo(row.created_at)}</span>
                  {row.reason && <> · <span className="ra-reason">“{row.reason}”</span></>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
