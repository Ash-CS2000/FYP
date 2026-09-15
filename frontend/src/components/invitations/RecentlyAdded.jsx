// src/components/invitations/RecentlyAdded.jsx
// Who recently gained a role — whether through an invite or a promotion — from
// the audit log, so every invitation visibly lands somewhere.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listFullAuditLog } from '../../api/admin.js';
import { fullDateTime, timeAgo } from '../../utils/time.js';

export default function RecentlyAdded({ role, refreshKey, title }) {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    listFullAuditLog({ type: ['role_change', 'invitation'], action: ['grant', 'accept'], role, limit: 6 })
      .then(res => { if (!cancelled) setRows(res.results || []); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [role, refreshKey]);

  return (
    <div className="card inv-card">
      <div className="inv-card-head">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-meta">Invitations accepted and accounts promoted, newest first.</div>
        </div>
        <Link to="/admin/audit" className="inv-link">Audit log →</Link>
      </div>
      {failed ? (
        <p className="inv-empty">Could not load recent additions.</p>
      ) : rows === null ? (
        <p className="inv-empty">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="inv-empty">No one has been added yet.</p>
      ) : (
        <ul className="inv-rows">
          {rows.map(r => (
            <li key={r.id} className="inv-row">
              <span className={`inv-dot ${r.action}`} aria-hidden="true" />
              <div className="inv-row-main">
                <div className="inv-row-title">{r.summary}</div>
                <div className="inv-row-meta">
                  {r.action === 'accept' ? 'Accepted an invitation' : `By ${r.actor_name || 'an administrator'}`}
                </div>
              </div>
              <span className="inv-row-time" title={fullDateTime(r.created_at)}>{timeAgo(r.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
