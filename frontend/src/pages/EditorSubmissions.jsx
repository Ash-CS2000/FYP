import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { bandFor, BAND_LABELS, SIMILARITY_TONE } from '../data/similarity.js';
import { thresholdsFrom, loadLocalSettings } from '../data/editorScreeningMock.js';
import { DECISION_LABELS, DECISION_TONE } from '../data/editorial.js';
import { MANUSCRIPT_STATUSES, STATUS_LABELS, statusPillClass } from '../data/manuscriptStatus.js';
import { listAllManuscripts } from '../api/manuscripts.js';

// Each filter carries its own predicate, so a filter doesn't have to be a status.
// 'flagged' cuts across statuses — it is a similarity band, not a pipeline stage.
const FILTERS = [
  { id: 'all',     label: 'All',     match: () => true },
  {
    id: 'pending',
    label: 'Pending Decision',
    match: s => s.latest_decision === null && (s.status === 'submitted' || s.status === 'under_review'),
  },
  { id: 'flagged', label: 'Flagged', match: (s, ctx) => ctx.bandOf(s.id) === 'high' },
  ...MANUSCRIPT_STATUSES.map(status => ({
    id: status,
    label: STATUS_LABELS[status],
    match: s => s.status === status,
  })),
];

// Whether the editor has decided yet. A blank cell means live, not overlooked —
// most rows in a healthy pipeline have no decision.
function DecisionCell({ decision }) {
  if (!decision) return <span className="muted">—</span>;
  const tone = DECISION_TONE[decision.type];
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 700,
      background: tone?.bg, color: tone?.fg, whiteSpace: 'nowrap',
    }}>
      {DECISION_LABELS[decision.type]}
    </span>
  );
}

// The similarity cell. A pending or failed check must not read as 0% — an editor
// acting on a score that was never produced is the failure mode to avoid.
function SimilarityCell({ plagiarismCheck, thresholds }) {
  if (!plagiarismCheck) return <span className="muted">—</span>;
  if (plagiarismCheck.status === 'pending') {
    return <span className="pill pill-pending">Checking…</span>;
  }
  if (plagiarismCheck.status === 'failed') {
    return <span className="pill pill-revision">Failed</span>;
  }
  const pct = plagiarismCheck.similarity_score ?? 0;
  const band = bandFor(pct, thresholds);
  const tone = SIMILARITY_TONE[band];
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px', borderRadius: 'var(--r-pill)',
        fontSize: 12, fontWeight: 700,
        background: tone.bg, color: tone.fg,
      }}
      title={`${BAND_LABELS[band]} — flag threshold ${thresholds.high}%`}
    >
      {pct}%
    </span>
  );
}

// `initialFilter` lets a route land straight on a slice of the table — the
// sidebar's "Pending Decision" entry points at /editor/pending, and "Screening"
// at /editor/screening, both of which are this same page pre-filtered rather
// than separate screens.
export default function EditorSubmissions({ role = 'editor', initialFilter = 'all' }) {
  const isAdmin = role === 'admin';
  const [filter, setFilter] = useState(initialFilter);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listAllManuscripts()
      .then((data) => { if (!cancelled) setSubmissions(data); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load submissions.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Thresholds are admin policy, so re-band on every render rather than baking a
  // band into the row data — changing the threshold must re-colour this table.
  const thresholds = thresholdsFrom(loadLocalSettings());
  const bandOf = id => {
    const row = submissions.find(s => s.id === id);
    const check = row?.plagiarism_check;
    return check?.status === 'completed' ? bandFor(check.similarity_score ?? 0, thresholds) : null;
  };
  const ctx = { bandOf };

  const matcher = id => (FILTERS.find(f => f.id === id) || FILTERS[0]).match;
  const counts = id => submissions.filter(s => matcher(id)(s, ctx)).length;
  const visible = submissions.filter(s => matcher(filter)(s, ctx));
  const heading = FILTERS.find(f => f.id === filter) || FILTERS[0];

  const basePath = isAdmin ? '/admin' : '/editor';

  return (
    <AppShell role={role} searchPlaceholder="Search submissions...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">{isAdmin ? 'Administration' : 'Editorial'}</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>All <em className="serif-italic">Submissions</em>.</h1>
          <p className="page-subtitle">{isAdmin ? 'Monitor every submission without switching into the editor workspace.' : 'Every paper currently in the system, across all stages.'}</p>
        </div>
      </div>

      <div className="card fade-up delay-1">
        <div className="card-header">
          <div>
            <div className="card-title">
              {visible.length} {filter === 'all' ? 'submissions' : `· ${heading.label}`}
            </div>
            {filter === 'flagged' && (
              <div className="card-meta">
                Similarity at or above {thresholds.high}%. Read the matched passages before deciding —
                the score covers verbatim reuse, including quotations.
              </div>
            )}
          </div>
          <div className="row">
            {FILTERS.map(f => (
              <button
                key={f.id}
                className={`filter-chip ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label} <span style={{ opacity: .6 }}>{counts(f.id)}</span>
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="card-meta" style={{ padding: 20 }}>Loading submissions…</div>}
        {!loading && loadError && (
          <div className="card-meta" style={{ padding: 20, color: 'var(--red-800)' }}>{loadError}</div>
        )}
        {!loading && !loadError && visible.length === 0 && (
          <div className="card-meta" style={{ padding: 20 }}>No submissions match this filter.</div>
        )}

        {!loading && !loadError && visible.length > 0 && (
          <table className="data-table">
            <thead><tr><th>Paper</th><th>Author</th><th>Category</th><th>Similarity</th><th>Status</th><th>Decision</th><th></th></tr></thead>
            <tbody>
              {visible.map(s => (
                <tr key={s.id}>
                  <td>
                    <Link to={`${basePath}/submissions/${s.id}`} className="table-title" style={{ color: 'var(--navy-900)', display: 'block' }}>{s.title}</Link>
                    <div className="table-meta">#{s.id}</div>
                  </td>
                  <td><span className="muted">{s.owner_name}</span></td>
                  <td><span className="muted">{s.category}</span></td>
                  <td><SimilarityCell plagiarismCheck={s.plagiarism_check} thresholds={thresholds} /></td>
                  <td><span className={`pill ${statusPillClass(s.status)}`}>{STATUS_LABELS[s.status] || s.status}</span></td>
                  <td><DecisionCell decision={s.latest_decision} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 14, whiteSpace: 'nowrap' }}>
                      <Link
                        to={`${basePath}/submissions/${s.id}/similarity`}
                        style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}
                      >
                        Similarity →
                      </Link>
                      <Link
                        to={`${basePath}/submissions/${s.id}/reviews`}
                        style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}
                      >
                        Reviews →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
