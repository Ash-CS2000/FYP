import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { bandFor, BAND_LABELS, SIMILARITY_TONE } from '../data/similarity.js';
import { reportFor, thresholdsFrom, loadLocalSettings } from '../data/editorScreeningMock.js';
import { decisionFor, DECISION_LABELS, DECISION_TONE } from '../data/editorial.js';

const SUBMISSIONS = [
  { id: 'MS-2026-014', title: 'Deep Learning Methods in Medical Imaging', author: 'Ahmad Razif', cat: 'Computer Science', status: 'review', label: 'In Review' },
  { id: 'MS-2026-008', title: 'A Survey of Quantum Computing Applications', author: 'Wong Mei Ling', cat: 'Physics', status: 'pending', label: 'Pending Decision' },
  { id: 'MS-2026-011', title: 'Climate Change Impact on Agricultural Yield', author: 'Tan Boon Hock', cat: 'Environmental', status: 'pending', label: 'Pending Decision' },
  { id: 'MS-2026-019', title: 'Renewable Energy Grid Optimization', author: 'Siti Khadijah', cat: 'Engineering', status: 'review', label: 'In Review' },
  { id: 'MS-2026-021', title: 'Supply Chain Blockchain Use Cases in ASEAN', author: 'Roslan Tahir', cat: 'Business', status: 'review', label: 'In Review' },
  { id: 'MS-2025-208', title: 'A Survey of Natural Language Processing in 2025', author: 'Ahmad Razif', cat: 'Linguistics', status: 'approved', label: 'Approved' },
  { id: 'MS-2025-187', title: 'A Framework for IoT Security in Smart Cities', author: 'Ahmad Razif', cat: 'Engineering', status: 'revision', label: 'Revision' },
  { id: 'MS-2025-142', title: 'Blockchain Applications in Finance', author: 'Ahmad Razif', cat: 'Finance', status: 'approved', label: 'Approved' },
];

// Each filter carries its own predicate, so a filter doesn't have to be a status.
// 'flagged' cuts across statuses — it is a similarity band, not a pipeline stage.
const FILTERS = [
  { id: 'all',      label: 'All',       match: () => true },
  { id: 'flagged',  label: 'Flagged',   match: (s, ctx) => ctx.bandOf(s.id) === 'high' },
  { id: 'review',   label: 'In Review', match: s => s.status === 'review' },
  { id: 'pending',  label: 'Pending',   match: s => s.status === 'pending' },
  { id: 'revision', label: 'Revision',  match: s => s.status === 'revision' },
  { id: 'approved', label: 'Approved',  match: s => s.status === 'approved' },
];

// Whether the editor has decided yet. A blank cell means live, not overlooked —
// most rows in a healthy pipeline have no decision.
function DecisionCell({ manuscriptId }) {
  const decision = decisionFor(manuscriptId);
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

// The similarity cell. A queued or failed check must not read as 0% — an editor
// acting on a score that was never produced is the failure mode to avoid.
function SimilarityCell({ manuscriptId, thresholds }) {
  const report = reportFor(manuscriptId);
  if (!report) return <span className="muted">—</span>;
  if (report.status === 'queued' || report.status === 'running') {
    return <span className="pill pill-pending">Checking…</span>;
  }
  if (report.status === 'failed') {
    return <span className="pill pill-revision" title={report.error}>Failed</span>;
  }
  const band = bandFor(report.overall_similarity_pct, thresholds);
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
      {report.overall_similarity_pct}%
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

  // Thresholds are admin policy, so re-band on every render rather than baking a
  // band into the row data — changing the threshold must re-colour this table.
  const thresholds = thresholdsFrom(loadLocalSettings());
  const bandOf = id => {
    const report = reportFor(id);
    return report?.status === 'done' ? bandFor(report.overall_similarity_pct, thresholds) : null;
  };
  const ctx = { bandOf };

  const matcher = id => (FILTERS.find(f => f.id === id) || FILTERS[0]).match;
  const counts = id => SUBMISSIONS.filter(s => matcher(id)(s, ctx)).length;
  const visible = SUBMISSIONS.filter(s => matcher(filter)(s, ctx));
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

        <table className="data-table">
          <thead><tr><th>Paper</th><th>Author</th><th>Category</th><th>Similarity</th><th>Status</th><th>Decision</th><th></th></tr></thead>
          <tbody>
            {visible.map(s => (
              <tr key={s.id}>
                <td>
                  <Link to={`${basePath}/submissions/${s.id}`} className="table-title" style={{ color: 'var(--navy-900)', display: 'block' }}>{s.title}</Link>
                  <div className="table-meta">{s.id}</div>
                </td>
                <td><span className="muted">{s.author}</span></td>
                <td><span className="muted">{s.cat}</span></td>
                <td><SimilarityCell manuscriptId={s.id} thresholds={thresholds} /></td>
                <td><span className={`pill pill-${s.status}`}>{s.label}</span></td>
                <td><DecisionCell manuscriptId={s.id} /></td>
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
      </div>
    </AppShell>
  );
}
