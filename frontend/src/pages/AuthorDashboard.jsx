import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { getStoredUser, getFirstName } from '../utils/user.js';
import { isTrained } from '../data/trainingProgress.js';
import { listManuscripts } from '../api/manuscripts.js';
import { statusLabel, statusPillClass } from '../data/manuscriptStatus.js';
import { useNotifications } from '../hooks/useNotifications.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACCEPTED_LIKE = ['accepted', 'published'];

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function oldest(papers) {
  return papers.reduce((a, b) => (new Date(a.submitted_at) < new Date(b.submitted_at) ? a : b));
}

function mostRecentlyUpdated(papers) {
  return papers.reduce((a, b) => (new Date(a.updated_at) > new Date(b.updated_at) ? a : b));
}

export default function AuthorDashboard() {
  const firstName = getFirstName(getStoredUser()) || 'Author';
  const trained = isTrained();

  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    listManuscripts()
      .then((data) => { if (!cancelled) setManuscripts(data); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load your papers.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const { notifications, loading: notifLoading } = useNotifications();

  // Submission is gated on the final assessment (see auth/TrainingGate.jsx).
  // Point the untrained straight at training rather than at a dead end.
  const newSubmission = trained ? (
    <Link to="/author/submit" className="btn btn-primary btn-sm">+ New Submission</Link>
  ) : (
    <Link to="/author/training" className="btn btn-ghost btn-sm">Training required</Link>
  );

  const underReviewPapers = manuscripts.filter(p => p.status === 'under_review');
  const revisionPapers = manuscripts.filter(p => p.status === 'revisions_requested');
  const acceptedLikePapers = manuscripts.filter(p => ACCEPTED_LIKE.includes(p.status));
  const rejectedPapers = manuscripts.filter(p => p.status === 'rejected');
  const activeCount = underReviewPapers.length + revisionPapers.length;
  const recentCount = manuscripts.filter(p => Date.now() - new Date(p.submitted_at).getTime() <= 30 * DAY_MS).length;

  const oldestUnderReviewDays = underReviewPapers.length
    ? Math.floor((Date.now() - new Date(oldest(underReviewPapers).submitted_at).getTime()) / DAY_MS)
    : null;
  const latestAccepted = acceptedLikePapers.length ? mostRecentlyUpdated(acceptedLikePapers) : null;
  const firstRevisionPaper = revisionPapers[0] || null;

  const decidedCount = acceptedLikePapers.length + rejectedPapers.length;
  const acceptanceRatePct = decidedCount > 0 ? Math.round((acceptedLikePapers.length / decidedCount) * 100) : null;

  const stats = [
    {
      label: 'Total Submitted',
      value: manuscripts.length,
      accent: 'var(--navy-700)',
      trend: recentCount > 0 ? <><span className="up">↑ {recentCount}</span> in the last 30 days</> : 'No submissions in the last 30 days',
    },
    {
      label: 'Under Review',
      value: underReviewPapers.length,
      accent: 'var(--amber-700)',
      trend: oldestUnderReviewDays != null ? `Oldest: ${oldestUnderReviewDays} day${oldestUnderReviewDays === 1 ? '' : 's'}` : 'None right now',
    },
    {
      label: 'Accepted',
      value: acceptedLikePapers.length,
      accent: 'var(--teal-700)',
      trend: latestAccepted ? <>Latest: <span style={{ color: 'var(--navy-900)', fontWeight: 600 }}>{latestAccepted.title}</span></> : 'None yet',
    },
    {
      label: 'Revision Required',
      value: revisionPapers.length,
      accent: 'var(--purple-700)',
      trend: firstRevisionPaper
        ? <Link to={`/author/papers/${firstRevisionPaper.id}/revision`} style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Resubmit now →</Link>
        : 'None right now',
    },
  ];

  const filteredPapers = filter === 'all'
    ? manuscripts
    : filter === 'active'
      ? manuscripts.filter(p => p.status === 'under_review' || p.status === 'revisions_requested')
      : manuscripts.filter(p => ACCEPTED_LIKE.includes(p.status));
  const previewPapers = filteredPapers.slice(0, 5);

  const subtitleDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const subtitleTail = underReviewPapers.length > 0
    ? `You have ${underReviewPapers.length} paper${underReviewPapers.length === 1 ? '' : 's'} awaiting reviewer feedback.`
    : 'No papers awaiting reviewer feedback right now.';

  return (
    <AppShell role="author" searchPlaceholder="Search papers, reviewers, categories..." topbarActions={newSubmission}>
      {!trained && (
        <div className="lms-banner is-todo fade-up">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span>
            Manuscript submission unlocks once you pass the final assessment.{' '}
            <Link to="/author/training">Continue training →</Link>
          </span>
        </div>
      )}

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Author Workspace</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Welcome back, <em className="serif-italic">{firstName}</em>.</h1>
          <p className="page-subtitle">{subtitleDate} · {subtitleTail}</p>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((s, i) => (
          <div className={`stat fade-up delay-${i + 1}`} key={s.label} style={{ '--accent': s.accent }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{loading ? '—' : s.value}</div>
            <div className="stat-trend">{loading ? '' : s.trend}</div>
          </div>
        ))}
      </div>

      <div className="split-grid">
        <div className="card fade-up delay-3">
          <div className="card-header">
            <div>
              <div className="card-title">My Submissions</div>
              <div className="card-meta">Track every paper you've sent to PaperBridge.</div>
            </div>
            <div className="row">
              <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                All <span style={{ opacity: .6 }}>{manuscripts.length}</span>
              </button>
              <button className={`filter-chip ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>
                Active <span style={{ opacity: .6 }}>{activeCount}</span>
              </button>
              <button className={`filter-chip ${filter === 'accepted' ? 'active' : ''}`} onClick={() => setFilter('accepted')}>
                Accepted <span style={{ opacity: .6 }}>{acceptedLikePapers.length}</span>
              </button>
            </div>
          </div>

          {loading && <div className="card-meta" style={{ padding: 20 }}>Loading your papers…</div>}
          {!loading && loadError && (
            <div className="card-meta" style={{ padding: 20, color: 'var(--red-800)' }}>{loadError}</div>
          )}
          {!loading && !loadError && previewPapers.length === 0 && (
            <div className="card-meta" style={{ padding: 20 }}>No submissions yet.</div>
          )}

          {!loading && !loadError && previewPapers.length > 0 && (
            <>
              <table className="data-table">
                <thead>
                  <tr><th>Paper</th><th>Category</th><th>Submitted</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {previewPapers.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div className="table-title">{p.title}</div>
                        <div className="table-meta">{p.article_type || p.category}</div>
                      </td>
                      <td><span className="muted">{p.category}</span></td>
                      <td><span className="muted">{formatDate(p.submitted_at)}</span></td>
                      <td><span className={`pill ${statusPillClass(p.status)}`}>{statusLabel(p.status)}</span></td>
                      <td>
                        {p.status === 'revisions_requested' ? (
                          <Link to={`/author/papers/${p.id}/revision`} style={{ color: 'var(--amber-700)', fontWeight: 600, fontSize: 13 }}>Resubmit →</Link>
                        ) : (
                          <Link to={`/author/papers/${p.id}`} style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}>View →</Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPapers.length > previewPapers.length && (
                <div className="card-meta" style={{ padding: '12px 4px 0' }}>
                  Showing {previewPapers.length} of {filteredPapers.length}.{' '}
                  <Link to="/author/papers" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>View all in My Papers →</Link>
                </div>
              )}
            </>
          )}
        </div>

        <div className="gap-grid">
          <div className="card fade-up delay-4">
            <div className="card-header">
              <div>
                <div className="card-title">Recent Activity</div>
              </div>
              <Link to="/author/notifications" style={{ color: 'var(--navy-700)', fontSize: 13, fontWeight: 600 }}>
                View all →
              </Link>
            </div>
            {notifLoading && <div className="card-meta" style={{ padding: '12px 0' }}>Loading…</div>}
            {!notifLoading && notifications.length === 0 && (
              <div className="card-meta" style={{ padding: '12px 0' }}>No notifications yet.</div>
            )}
            {!notifLoading && notifications.slice(0, 4).map((n) => (
              <div className="activity-item" key={n.id}>
                <div className="activity-dot">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <div>
                  <div className="activity-text"><strong>{n.title}</strong>{n.body ? ` — ${n.body}` : ''}</div>
                  <div className="activity-time">{formatDateTime(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card fade-up delay-5">
            <div className="card-header"><div className="card-title">Submission Health</div></div>
            {loading ? (
              <div className="card-meta" style={{ padding: '12px 0' }}>Loading…</div>
            ) : acceptanceRatePct == null ? (
              <div className="card-meta" style={{ padding: '12px 0' }}>No decisions yet.</div>
            ) : (
              <div>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-700)', fontWeight: 500 }}>Acceptance rate</span>
                  <span className="spacer"></span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal-700)' }}>{acceptanceRatePct}%</span>
                </div>
                <div className="progress" style={{ '--accent': 'var(--teal-500)' }}>
                  <div className="progress-fill" style={{ width: `${acceptanceRatePct}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
