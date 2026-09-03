import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { formatDate } from '../data/invitations.js';
import { RECOMMENDATION_LABELS, RECOMMENDATION_TONE } from '../data/reviews.js';
import { listAssignments } from '../api/invitations.js';

export default function ReviewerCompleted() {
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listAssignments()
      .then((rows) => {
        if (cancelled) return;
        setCompleted(rows.filter(a => a.status === 'submitted'));
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load your reviews.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <AppShell role="reviewer" searchPlaceholder="Search completed reviews...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Reviewer Workspace</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Completed <em className="serif-italic">Reviews</em>.</h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `Your contribution to the journal — ${completed.length} review${completed.length === 1 ? '' : 's'} shown.`}
          </p>
        </div>
      </div>

      <div className="card fade-up delay-1">
        {loading && <div className="card-meta" style={{ padding: 20 }}>Loading…</div>}
        {!loading && loadError && (
          <div className="card-meta" style={{ padding: 20, color: 'var(--red-800)' }}>{loadError}</div>
        )}
        {!loading && !loadError && completed.length === 0 && (
          <div className="card-meta" style={{ padding: 20 }}>Nothing submitted yet.</div>
        )}
        {!loading && !loadError && completed.length > 0 && (
          <table className="data-table">
            <thead><tr><th>Paper</th><th>Submitted</th><th>Recommendation</th><th></th></tr></thead>
            <tbody>
              {completed.map(a => {
                const rec = a.review?.recommendation;
                const tone = RECOMMENDATION_TONE[rec];
                return (
                  <tr key={a.id}>
                    <td><div className="table-title">{a.title}</div></td>
                    <td><span className="muted">{formatDate(a.due_at)}</span></td>
                    <td>
                      {rec && tone ? (
                        <span className="pill" style={{ background: tone.bg, color: tone.fg }}>
                          {RECOMMENDATION_LABELS[rec]}
                        </span>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td>
                      <Link to={`/reviewer/review/${a.manuscript_id}`} style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
