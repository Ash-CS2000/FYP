// src/components/EditorialPipelineCard.jsx
// How the journal is doing, for administrators. Read-only on purpose: editors
// decide on papers, the admin watches for bottlenecks and raises them.

import { Link } from 'react-router-dom';

const STAGES = [
  { key: 'submitted',           label: 'Submitted',          color: 'var(--navy-500)',   group: 'progress' },
  { key: 'under_review',        label: 'Under review',       color: 'var(--amber-500)',  group: 'progress' },
  { key: 'revisions_requested', label: 'Revisions requested', color: 'var(--purple-700)', group: 'progress' },
  { key: 'accepted',            label: 'Accepted',           color: 'var(--teal-500)',   group: 'decided' },
  { key: 'published',           label: 'Published',          color: 'var(--teal-800)',   group: 'decided' },
  { key: 'rejected',            label: 'Rejected',           color: 'var(--ink-400)',    group: 'decided' },
];

function Metric({ tone = 'neutral', label, value, sub }) {
  return (
    <div className={`ep-metric ${tone}`}>
      <div className="ep-metric-label">{label}</div>
      <div className="ep-metric-value">{value}</div>
      <div className="ep-metric-sub">{sub}</div>
    </div>
  );
}

export default function EditorialPipelineCard({ data, state, onRetry }) {
  const total = data?.total_manuscripts || 0;
  const inProgress = data ? STAGES.filter(s => s.group === 'progress').reduce((n, s) => n + data.stages[s.key], 0) : 0;
  const r = data?.reviews;

  return (
    <div className="card ep-card">
      <style>{`
        .ep-card { padding:22px 24px; }
        .ep-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:18px; }
        .ep-readonly { display:inline-flex; align-items:center; gap:5px; margin-left:10px; padding:2px 8px; border-radius:99px;
          background:var(--ink-100); color:var(--ink-600); font-family:var(--font-body); font-size:10.5px; font-weight:600; vertical-align:3px; }
        .ep-link { font-size:12.5px; font-weight:600; color:var(--navy-700); white-space:nowrap; }
        .ep-bar { display:flex; height:12px; border-radius:99px; overflow:hidden; background:var(--ink-100); gap:2px; }
        .ep-bar span { display:block; min-width:3px; transition:flex-grow var(--t-slow); }
        .ep-groups { display:grid; grid-template-columns:1fr 1fr; gap:14px 28px; margin-top:16px; }
        .ep-group-title { font-family:var(--font-mono); font-size:10.5px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-500);
          display:flex; justify-content:space-between; margin-bottom:6px; }
        .ep-stage { display:flex; align-items:center; gap:9px; padding:5px 0; font-size:13px; color:var(--ink-700); }
        .ep-swatch { width:9px; height:9px; border-radius:3px; flex-shrink:0; }
        .ep-stage-n { margin-left:auto; font-weight:600; color:var(--navy-900); font-variant-numeric:tabular-nums; }
        .ep-stage-pct { width:38px; text-align:right; font-size:11.5px; color:var(--ink-400); font-variant-numeric:tabular-nums; }
        .ep-metrics { display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-top:20px; padding-top:18px; border-top:1px solid var(--ink-100); }
        @media (max-width:720px) { .ep-groups, .ep-metrics { grid-template-columns:1fr; } }
        .ep-metric { padding:12px 14px; border-radius:var(--r-md); background:var(--ink-50); border:1px solid var(--ink-100); }
        .ep-metric.is-alert { background:var(--red-50); border-color:var(--red-200); }
        .ep-metric-label { font-size:11.5px; font-weight:600; color:var(--ink-600); }
        .ep-metric.is-alert .ep-metric-label { color:var(--red-800); }
        .ep-metric-value { font-family:var(--font-display); font-size:24px; font-weight:500; letter-spacing:-0.02em; color:var(--navy-900); line-height:1.15; margin-top:4px; }
        .ep-metric.is-alert .ep-metric-value { color:var(--red-700); }
        .ep-metric-sub { font-size:11.5px; color:var(--ink-500); margin-top:3px; line-height:1.4; }
        .ep-skel { display:block; border-radius:6px; background:linear-gradient(90deg, var(--ink-100) 25%, var(--ink-50) 50%, var(--ink-100) 75%);
          background-size:200% 100%; animation:epShimmer 1.2s linear infinite; }
        @keyframes epShimmer { from { background-position:200% 0; } to { background-position:-200% 0; } }
      `}</style>

      <div className="ep-head">
        <div>
          <div className="card-title">Editorial pipeline<span className="ep-readonly">View only</span></div>
          <div className="card-meta" style={{ marginTop: 3 }}>
            {data ? `${total.toLocaleString()} manuscripts · ${inProgress.toLocaleString()} still in progress` : 'Where every manuscript is in the review process.'}
          </div>
        </div>
        <Link to="/admin/submissions" className="ep-link">View papers →</Link>
      </div>

      {state === 'error' && (
        <p style={{ fontSize: 13, color: 'var(--red-800)', margin: 0 }}>
          Could not load the editorial overview. <button type="button" className="ep-link" onClick={onRetry}>Retry</button>
        </p>
      )}

      {state === 'loading' && (
        <div aria-busy="true" aria-label="Loading">
          <span className="ep-skel" style={{ height: 12, borderRadius: 99 }} />
          <div className="ep-groups">
            {[0, 1].map(g => (
              <div key={g}>{[0, 1, 2].map(i => <span key={i} className="ep-skel" style={{ height: 12, margin: '10px 0', width: `${80 - i * 12}%` }} />)}</div>
            ))}
          </div>
          <div className="ep-metrics">{[0, 1, 2].map(i => <span key={i} className="ep-skel" style={{ height: 74 }} />)}</div>
        </div>
      )}

      {state === 'ready' && data && (
        <>
          <div className="ep-bar" role="img" aria-label={STAGES.map(s => `${s.label} ${data.stages[s.key]}`).join(', ')}>
            {STAGES.filter(s => data.stages[s.key] > 0).map(s => (
              <span key={s.key} style={{ flexGrow: data.stages[s.key], background: s.color }} title={`${s.label}: ${data.stages[s.key]}`} />
            ))}
          </div>

          <div className="ep-groups">
            {[['progress', 'In progress'], ['decided', 'Decided']].map(([group, title]) => {
              const stages = STAGES.filter(s => s.group === group);
              const sum = stages.reduce((n, s) => n + data.stages[s.key], 0);
              return (
                <div key={group}>
                  <div className="ep-group-title"><span>{title}</span><span>{sum}</span></div>
                  {stages.map(s => (
                    <div key={s.key} className="ep-stage">
                      <span className="ep-swatch" style={{ background: s.color }} aria-hidden="true" />
                      {s.label}
                      <span className="ep-stage-n">{data.stages[s.key]}</span>
                      <span className="ep-stage-pct">{total ? `${Math.round((100 * data.stages[s.key]) / total)}%` : '—'}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="ep-metrics">
            <Metric
              tone={r.overdue > 0 ? 'is-alert' : 'neutral'}
              label="Overdue reviews"
              value={r.in_progress ? `${r.overdue} of ${r.in_progress}` : '0'}
              sub={r.in_progress ? 'reviews in progress are past their due date' : 'no reviews in progress'}
            />
            <Metric
              label="Time to first decision"
              value={data.avg_days_to_first_decision != null ? `${Math.round(data.avg_days_to_first_decision)} days` : '—'}
              sub={data.decided_papers ? `average across ${data.decided_papers} papers` : 'no decisions yet'}
            />
            <Metric
              label="Acceptance rate"
              value={data.acceptance_rate != null ? `${data.acceptance_rate}%` : '—'}
              sub="of papers with a final decision"
            />
          </div>
        </>
      )}
    </div>
  );
}
