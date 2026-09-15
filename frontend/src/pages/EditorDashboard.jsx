import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { listAllManuscripts } from '../api/manuscripts.js';
import { STATUS_LABELS, statusPillClass } from '../data/manuscriptStatus.js';
import { bandFor } from '../data/similarity.js';
import { thresholdsFrom } from '../data/screeningSettings.js';
import { useScreeningSettings } from '../hooks/useScreeningSettings.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CATEGORY_COLORS = ['var(--navy-700)', 'var(--amber-500)', 'var(--teal-500)', 'var(--purple-700)', 'var(--red-500)'];

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthKeyOf(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export default function EditorDashboard() {
  const action = <button className="btn btn-primary btn-sm">Generate Report</button>;

  const [manuscripts, setManuscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { settings: screeningSettings } = useScreeningSettings();

  useEffect(() => {
    let cancelled = false;
    listAllManuscripts()
      .then((data) => { if (!cancelled) setManuscripts(data); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load submissions.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const thresholds = thresholdsFrom(screeningSettings);

  const pendingPapers = manuscripts
    .filter(m => m.latest_decision === null && (m.status === 'submitted' || m.status === 'under_review'))
    .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
  const underReviewCount = manuscripts.filter(m => m.status === 'under_review').length;
  const revisionsRequestedCount = manuscripts.filter(m => m.status === 'revisions_requested').length;
  const submittedCount = manuscripts.filter(m => m.status === 'submitted').length;
  const activeCount = underReviewCount + revisionsRequestedCount + submittedCount;
  const acceptedCount = manuscripts.filter(m => m.status === 'accepted').length;
  const rejectedCount = manuscripts.filter(m => m.status === 'rejected').length;
  const flaggedCount = manuscripts.filter((m) => {
    const check = m.plagiarism_check;
    return check?.status === 'completed' && bandFor(check.similarity_score ?? 0, thresholds) === 'high';
  }).length;

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonth.getFullYear()}-${prevMonth.getMonth()}`;
  const acceptedDecisions = manuscripts.filter(m => m.latest_decision?.type === 'accept');
  const acceptedThisMonth = acceptedDecisions.filter(m => monthKeyOf(m.latest_decision.decided_at) === currentMonthKey).length;
  const acceptedLastMonth = acceptedDecisions.filter(m => monthKeyOf(m.latest_decision.decided_at) === prevMonthKey).length;
  const monthTrendPct = acceptedLastMonth > 0
    ? Math.round(((acceptedThisMonth - acceptedLastMonth) / acceptedLastMonth) * 100)
    : (acceptedThisMonth > 0 ? 100 : null);

  // Approximation: only the latest decision's timestamp is available in bulk
  // (no full decision history per manuscript in this payload), so this is
  // "time to most recent decision", not true first-decision turnaround.
  const decidedPapers = manuscripts.filter(m => m.latest_decision);
  const avgDecisionDays = decidedPapers.length
    ? Math.round(
        decidedPapers.reduce((sum, m) => sum + (new Date(m.latest_decision.decided_at) - new Date(m.submitted_at)), 0)
        / decidedPapers.length / DAY_MS,
      )
    : null;

  const stats = [
    {
      label: 'Pending Decisions',
      value: pendingPapers.length,
      accent: 'var(--amber-700)',
      trend: pendingPapers.length
        ? `Oldest: ${Math.floor((Date.now() - new Date(pendingPapers[0].submitted_at).getTime()) / DAY_MS)} day(s)`
        : 'All caught up',
    },
    {
      label: 'Active Submissions',
      value: activeCount,
      accent: 'var(--navy-700)',
      trend: `${underReviewCount} in review · ${revisionsRequestedCount} in revision`,
    },
    {
      label: 'Accepted This Month',
      value: acceptedThisMonth,
      accent: 'var(--teal-700)',
      trend: monthTrendPct == null
        ? 'No accepted papers last month'
        : <><span className="up">{monthTrendPct >= 0 ? '↑' : '↓'} {Math.abs(monthTrendPct)}%</span> vs last month</>,
    },
    {
      label: 'Avg. Decision Time',
      value: avgDecisionDays != null ? `${avgDecisionDays}d` : '—',
      accent: 'var(--purple-700)',
      trend: 'Target: under 14 days',
    },
    {
      label: 'Flagged for Similarity',
      value: flaggedCount,
      accent: 'var(--red-800)',
      trend: <Link to="/editor/screening" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Review screening →</Link>,
    },
  ];

  const categoryCounts = manuscripts.reduce((acc, m) => {
    const key = m.category || 'Uncategorized';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const categoryRows = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCategoryCount = categoryRows.length ? categoryRows[0][1] : 1;

  const workflow = [
    { label: 'In Review', value: underReviewCount, bg: 'var(--navy-100)', color: 'var(--navy-700)', valColor: 'var(--navy-900)' },
    { label: 'Revision', value: revisionsRequestedCount, bg: 'var(--purple-50)', color: 'var(--purple-800)', valColor: 'var(--purple-800)' },
    { label: 'Accepted', value: acceptedCount, bg: 'var(--green-50)', color: 'var(--green-800)', valColor: 'var(--green-800)' },
    { label: 'Rejected', value: rejectedCount, bg: 'var(--red-50)', color: 'var(--red-800)', valColor: 'var(--red-800)' },
  ];

  const subtitle = loading
    ? 'Loading your editorial queue…'
    : `${pendingPapers.length} paper${pendingPapers.length === 1 ? '' : 's'} awaiting your decision · ${underReviewCount} in review.`;

  return (
    <AppShell role="editor" searchPlaceholder="Search submissions, authors, reviewers..." topbarActions={action}>
      <style>{`
        .decision-card { background: var(--white); border: 1px solid var(--ink-200); border-radius: var(--r-md); padding: 18px 20px; margin-bottom: 12px; transition: all var(--t-fast); }
        .decision-card:hover { border-color: var(--navy-700); box-shadow: var(--shadow-sm); }
        .decision-title { font-weight: 600; color: var(--navy-900); font-size: 15px; line-height: 1.35; margin-bottom: 4px; }
        .decision-meta { font-size: 12.5px; color: var(--ink-500); }
        .decision-actions { display: flex; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--ink-100); flex-wrap: wrap; align-items: center; }
        .category-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .category-bar-label { font-size: 12.5px; color: var(--ink-700); width: 130px; flex-shrink: 0; }
        .category-bar-track { flex: 1; height: 8px; background: var(--ink-100); border-radius: var(--r-pill); overflow: hidden; }
        .category-bar-fill { height: 100%; background: var(--accent, var(--navy-700)); border-radius: var(--r-pill); }
        .category-bar-num { font-size: 12.5px; font-weight: 600; color: var(--navy-900); width: 32px; text-align: right; flex-shrink: 0; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Editor-in-Chief</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Editorial <em className="serif-italic">overview</em>.</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((s, i) => (
          <div key={s.label} className={`stat fade-up delay-${i + 1}`} style={{ '--accent': s.accent }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{loading ? '—' : s.value}</div>
            <div className="stat-trend">{loading ? '' : s.trend}</div>
          </div>
        ))}
      </div>

      <div className="split-grid fade-up delay-3" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Pending Decisions</div>
              <div className="card-meta">Papers with no decision recorded yet, oldest first.</div>
            </div>
          </div>

          {loading && <div className="card-meta" style={{ padding: 20 }}>Loading…</div>}
          {!loading && loadError && (
            <div className="card-meta" style={{ padding: 20, color: 'var(--red-800)' }}>{loadError}</div>
          )}
          {!loading && !loadError && pendingPapers.length === 0 && (
            <div className="card-meta" style={{ padding: 20 }}>Nothing waiting on a decision right now.</div>
          )}
          {!loading && !loadError && pendingPapers.slice(0, 5).map(p => (
            <div className="decision-card" key={p.id}>
              <div className="decision-title">{p.title}</div>
              <div className="decision-meta">#{p.id} · {p.category} · {p.owner_name} · Submitted {formatDate(p.submitted_at)}</div>
              <div className="decision-actions">
                <span className={`pill ${statusPillClass(p.status)}`}>{STATUS_LABELS[p.status] || p.status}</span>
                <span className="spacer"></span>
                <Link to={`/editor/submissions/${p.id}`} style={{ color: 'var(--navy-700)', fontSize: 13, fontWeight: 600 }}>Decide →</Link>
              </div>
            </div>
          ))}
          {!loading && !loadError && pendingPapers.length > 5 && (
            <div className="card-meta" style={{ padding: '12px 4px 0' }}>
              Showing 5 of {pendingPapers.length}.{' '}
              <Link to="/editor/pending" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>View all pending →</Link>
            </div>
          )}
        </div>

        <div className="gap-grid">
          <div className="card">
            <div className="card-header"><div className="card-title">Submissions by Category</div></div>
            {loading && <div className="card-meta" style={{ padding: '12px 0' }}>Loading…</div>}
            {!loading && categoryRows.length === 0 && (
              <div className="card-meta" style={{ padding: '12px 0' }}>No submissions yet.</div>
            )}
            {!loading && categoryRows.map(([label, val], i) => (
              <div key={label} className="category-bar">
                <span className="category-bar-label">{label}</span>
                <div className="category-bar-track" style={{ '--accent': CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}>
                  <div className="category-bar-fill" style={{ width: `${Math.round((val / maxCategoryCount) * 100)}%` }}></div>
                </div>
                <span className="category-bar-num">{val}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Editorial Workflow</div></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {workflow.map(s => (
                <div key={s.label} style={{ padding: 14, background: s.bg, borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: s.color, fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: s.valColor, fontWeight: 500, letterSpacing: '-0.02em' }}>{loading ? '—' : s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
