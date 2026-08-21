import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { REPORTS, bandFor, thresholdsFrom, loadLocalSettings } from '../data/similarity.js';

export default function EditorDashboard() {
  const action = <button className="btn btn-primary btn-sm">Generate Report</button>;

  // Screening state, re-banded on every render so an admin threshold change is
  // reflected here without touching any stored report.
  const thresholds = thresholdsFrom(loadLocalSettings());
  const done = Object.values(REPORTS).filter(r => r.status === 'done');
  const flagged = done.filter(r => bandFor(r.overall_similarity_pct, thresholds) === 'high');
  const awaitingCheck = Object.values(REPORTS).filter(
    r => r.status === 'queued' || r.status === 'running' || r.status === 'failed',
  ).length;
  return (
    <AppShell role="editor" searchPlaceholder="Search submissions, authors, reviewers..." topbarActions={action}>
      <style>{`
        .decision-card { background: var(--white); border: 1px solid var(--ink-200); border-radius: var(--r-md); padding: 18px 20px; margin-bottom: 12px; transition: all var(--t-fast); }
        .decision-card:hover { border-color: var(--navy-700); box-shadow: var(--shadow-sm); }
        .decision-title { font-weight: 600; color: var(--navy-900); font-size: 15px; line-height: 1.35; margin-bottom: 4px; }
        .decision-meta { font-size: 12.5px; color: var(--ink-500); }
        .verdict-row { display: flex; gap: 6px; align-items: center; margin: 12px 0; padding: 10px 12px; background: var(--ink-50); border-radius: var(--r-sm); flex-wrap: wrap; }
        .verdict-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: var(--r-pill); font-size: 11.5px; font-weight: 600; }
        .verdict-accept { background: var(--green-50); color: var(--green-800); }
        .verdict-revision { background: var(--purple-50); color: var(--purple-800); }
        .verdict-reject { background: var(--red-50); color: var(--red-800); }
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
          <p className="page-subtitle">5 papers awaiting your decision · 12 in review · 3 reviewer disagreements need resolution.</p>
        </div>
      </div>

      <div className="stat-grid">
        {[
          { label: 'Pending Decisions', value: 5, accent: 'var(--amber-700)', trend: '3 with reviewer disagreement' },
          { label: 'Active Submissions', value: 28, accent: 'var(--navy-700)', trend: '12 in review · 5 in revision' },
          { label: 'Published This Month', value: 7, accent: 'var(--teal-700)', trend: <><span className="up">↑ 40%</span> vs last month</> },
          { label: 'Avg. Decision Time', value: '9d', accent: 'var(--purple-700)', trend: 'Target: under 14 days' },
          {
            label: 'Flagged for Similarity',
            value: flagged.length,
            accent: 'var(--red-800)',
            trend: (
              <>
                <Link to="/editor/screening" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Review screening →</Link>
                {awaitingCheck > 0 && <> · {awaitingCheck} awaiting a check</>}
              </>
            ),
          },
        ].map((s, i) => (
          <div key={s.label} className={`stat fade-up delay-${i + 1}`} style={{ '--accent': s.accent }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-trend">{s.trend}</div>
          </div>
        ))}
      </div>

      <div className="split-grid fade-up delay-3" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Awaiting Final Decision</div><div className="card-meta">Papers where reviewers have all responded.</div></div>
          </div>

          <div className="decision-card">
            <div className="decision-title">Deep Learning Methods in Medical Imaging</div>
            <div className="decision-meta">MS-2026-014 · Computer Science · Submitted by Ahmad Razif · 12 Jan 2026</div>
            <div className="verdict-row">
              <span style={{ fontSize: 11.5, color: 'var(--ink-600)', fontWeight: 500, marginRight: 4 }}>REVIEWER VERDICTS:</span>
              <span className="verdict-badge verdict-accept">R1 · Accept</span>
              <span className="verdict-badge verdict-revision">R2 · Major Revision</span>
              <span className="verdict-badge verdict-accept">R3 · Accept</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5 }}>Reviewers split on methodological rigor. R2 raises concerns about statistical analysis that R1 and R3 didn't flag.</div>
            <div className="decision-actions">
              <button className="btn btn-success btn-sm">Approve</button>
              <button className="btn btn-ghost btn-sm">Request Revision</button>
              <button className="btn btn-danger btn-sm">Reject</button>
              <span className="spacer"></span>
              <Link to="/editor/submissions" style={{ color: 'var(--navy-700)', fontSize: 13, fontWeight: 600 }}>View full reviews →</Link>
            </div>
          </div>

          <div className="decision-card">
            <div className="decision-title">A Survey of Quantum Computing Applications</div>
            <div className="decision-meta">MS-2026-008 · Physics · Submitted by Wong Mei Ling · 22 Dec 2025</div>
            <div className="verdict-row">
              <span style={{ fontSize: 11.5, color: 'var(--ink-600)', fontWeight: 500, marginRight: 4 }}>REVIEWER VERDICTS:</span>
              <span className="verdict-badge verdict-accept">R1 · Accept</span>
              <span className="verdict-badge verdict-accept">R2 · Accept</span>
              <span className="verdict-badge verdict-accept">R3 · Accept</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.5 }}>All three reviewers recommend acceptance. Auto-approval available.</div>
            <div className="decision-actions">
              <button className="btn btn-accent btn-sm">Auto-Approve & Publish</button>
              <button className="btn btn-ghost btn-sm">Review Manually</button>
            </div>
          </div>
        </div>

        <div className="gap-grid">
          <div className="card">
            <div className="card-header"><div className="card-title">Submissions by Category</div><span className="card-meta">This month</span></div>
            {[
              { label: 'Computer Science', val: 11, width: 92, color: 'var(--navy-700)' },
              { label: 'Engineering', val: 8, width: 67, color: 'var(--amber-500)' },
              { label: 'Medicine', val: 6, width: 50, color: 'var(--teal-500)' },
              { label: 'Business', val: 4, width: 33, color: 'var(--purple-700)' },
              { label: 'Social Sciences', val: 3, width: 25, color: 'var(--red-500)' },
            ].map(c => (
              <div key={c.label} className="category-bar">
                <span className="category-bar-label">{c.label}</span>
                <div className="category-bar-track" style={{ '--accent': c.color }}><div className="category-bar-fill" style={{ width: `${c.width}%` }}></div></div>
                <span className="category-bar-num">{c.val}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Editorial Workflow</div></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'In Review', value: 12, bg: 'var(--navy-100)', color: 'var(--navy-700)', valColor: 'var(--navy-900)' },
                { label: 'Revision', value: 5, bg: 'var(--purple-50)', color: 'var(--purple-800)', valColor: 'var(--purple-800)' },
                { label: 'Accepted', value: 7, bg: 'var(--green-50)', color: 'var(--green-800)', valColor: 'var(--green-800)' },
                { label: 'Rejected', value: 4, bg: 'var(--red-50)', color: 'var(--red-800)', valColor: 'var(--red-800)' },
              ].map(s => (
                <div key={s.label} style={{ padding: 14, background: s.bg, borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: s.color, fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: s.valColor, fontWeight: 500, letterSpacing: '-0.02em' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
