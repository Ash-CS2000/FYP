// The manuscript is reached only through an accepted assignment — auth/AssignmentGate
// redirects anyone else back to the assignment list before this component renders.
// The gate is a courtesy; the server still has to check (see api/invitations.js).

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import {
  assignmentForManuscript,
  saveResponse,
  deadlineState,
  formatDate,
} from '../data/invitations.js';

export default function ReviewForm() {
  const { id } = useParams();
  const assignment = assignmentForManuscript(id);
  const [ratings, setRatings] = useState({ originality: 4, technical: 3, clarity: 4, relevance: 5 });
  const [recommendation, setRecommendation] = useState('minor');
  const [confidential, setConfidential] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const composite = ((ratings.originality + ratings.technical + ratings.clarity + ratings.relevance) / 4).toFixed(1);
  const due = deadlineState(assignment?.due_at);

  const handleSubmit = async () => {
    setSubmitting(true);
    // POST /api/manuscripts/:id/reviews/ — see data/reviews.js for the record
    // shape. The endpoint does not exist yet, so the assignment is closed out
    // locally and the editor is not notified until it does.
    saveResponse(assignment.id, { status: 'submitted', submitted_at: new Date().toISOString() });
    setSubmitting(false);
    navigate('/reviewer/assignments');
  };

  return (
    <AppShell role="reviewer" searchPlaceholder="Search...">
      <style>{`
        .rating-btn { width: 38px; height: 38px; border: 1px solid var(--ink-300); border-radius: var(--r-md); background: var(--white); font-weight: 600; color: var(--ink-700); cursor: pointer; transition: all var(--t-fast); font-size: 14px; }
        .rating-btn:hover { border-color: var(--navy-700); }
        .rating-btn.selected { background: var(--navy-900); color: var(--white); border-color: var(--navy-900); }
        .recommend-card { border: 1.5px solid var(--ink-200); border-radius: var(--r-md); padding: 16px 18px; cursor: pointer; background: var(--white); transition: all var(--t-fast); }
        .recommend-card:hover { border-color: var(--navy-700); }
        .recommend-card.selected { border-color: var(--navy-900); background: var(--navy-100); }
        .recommend-card-title { font-weight: 600; font-size: 14px; color: var(--navy-900); margin-bottom: 4px; }
        .recommend-card-desc { font-size: 12.5px; color: var(--ink-600); }
        .confidential-field { border-left: 3px solid var(--amber-500); background: var(--amber-50); border-radius: var(--r-md); padding: 16px 18px; margin-top: 8px; }
        .confidential-field .field-label { color: var(--amber-800); display: flex; align-items: center; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Review · {assignment.manuscript_id}</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            <em className="serif-italic">{assignment.title}</em>.
          </h1>
          <p className="page-subtitle">
            Evaluate the manuscript and submit your recommendation.
            {assignment.due_at
              ? <> Due {formatDate(assignment.due_at)}.</>
              : <> Your deadline is set once the editor registers your acceptance.</>}
          </p>
        </div>
        <Link to="/reviewer/assignments" className="btn btn-ghost btn-sm">← Back to assignments</Link>
      </div>

      {due.tone === 'overdue' && (
        <div className="lms-banner is-todo fade-up">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" />
          </svg>
          <span>
            {due.label}. If you need longer, request an extension from your{' '}
            <Link to="/reviewer/assignments">assignments</Link> rather than letting it run.
          </span>
        </div>
      )}

      {assignment.extension?.status === 'pending' && (
        <div className="lms-banner is-todo fade-up">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <span>
            Extension requested ({assignment.extension.requested_days} days). The deadline
            above has not moved — it only changes if the editor grants it.
          </span>
        </div>
      )}

      <div className="split-grid fade-up delay-1" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <div className="card">
          {[
            { key: 'originality', label: 'Originality & significance', hint: 'Does the paper present novel ideas or significant contributions?' },
            { key: 'technical', label: 'Technical quality', hint: 'Are the methods sound and the analysis rigorous?' },
            { key: 'clarity', label: 'Clarity & presentation', hint: 'Is the paper well-written and well-organized?' },
            { key: 'relevance', label: 'Relevance to journal scope', hint: '' },
          ].map(c => (
            <div key={c.key} className="field">
              <label className="field-label">{c.label} <span className="req">*</span></label>
              {c.hint && <div className="field-hint" style={{ marginTop: 0, marginBottom: 8 }}>{c.hint}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`rating-btn ${ratings[c.key] === n ? 'selected' : ''}`}
                    onClick={() => setRatings({ ...ratings, [c.key]: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div style={{ margin: '28px 0', padding: 20, border: '1px solid var(--ink-200)', borderRadius: 'var(--r-md)', background: 'var(--ink-50)' }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <span className="label">Composite Score</span>
              <span className="spacer"></span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, color: 'var(--teal-700)', letterSpacing: '-0.02em' }}>{composite} / 5</span>
            </div>
            <div className="progress" style={{ '--accent': 'var(--teal-500)', height: 8 }}>
              <div className="progress-fill" style={{ width: `${(composite / 5) * 100}%` }}></div>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Summary of contributions <span className="req">*</span></label>
            <textarea className="field-textarea" rows="3" defaultValue="The paper presents a comparative study of three deep learning architectures applied to three medical imaging benchmarks." />
          </div>
          <div className="field">
            <label className="field-label">Strengths <span className="req">*</span></label>
            <textarea className="field-textarea" rows="3" defaultValue="- Clear motivation and well-defined research questions
- Strong experimental design with three benchmark datasets
- Reproducibility: code and data are publicly available" />
          </div>
          <div className="field">
            <label className="field-label">Weaknesses & suggestions <span className="req">*</span></label>
            <textarea className="field-textarea" rows="4" defaultValue="- The methodology section needs more detail on data preprocessing
- Statistical significance tests should be reported with effect sizes" />
          </div>

          {/* Editor-only channel. The author never sees this — see
              data/reviews.js for the contract the backend must honour. */}
          <div className="field confidential-field">
            <label className="field-label">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: '-2px', marginRight: 6 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Confidential comments to the editor
            </label>
            <div className="field-hint" style={{ marginTop: 0, marginBottom: 8 }}>
              Only the editor sees this. Use it for concerns you would not put in the open
              report — suspected overlap with prior work, a conflict of interest, or your
              availability for a re-review. Leave blank if you have none.
            </div>
            <textarea
              className="field-textarea"
              rows="3"
              value={confidential}
              onChange={e => setConfidential(e.target.value)}
              placeholder="Not shared with the author…"
            />
          </div>

          <div className="field">
            <label className="field-label" style={{ marginBottom: 12 }}>Final recommendation <span className="req">*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[
                { id: 'accept', title: 'Accept', desc: 'Publish as-is, no revisions needed.' },
                { id: 'minor', title: 'Minor Revision', desc: 'Small changes; no second review needed.' },
                { id: 'major', title: 'Major Revision', desc: 'Substantive changes; second review needed.' },
                { id: 'reject', title: 'Reject', desc: 'Not suitable for this journal.' },
              ].map(r => (
                <div key={r.id} className={`recommend-card ${recommendation === r.id ? 'selected' : ''}`} onClick={() => setRecommendation(r.id)}>
                  <div className="recommend-card-title">{r.title}</div>
                  <div className="recommend-card-desc">{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--ink-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="row" style={{ gap: 8, fontSize: 13, color: 'var(--ink-500)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
              Auto-saved 2 minutes ago
            </div>
            <div className="row">
              <button className="btn btn-ghost">Save Draft</button>
              <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Review →'}
              </button>
            </div>
          </div>
        </div>

        <div className="gap-grid">
          <div className="card">
            <div className="card-header"><div className="card-title">Manuscript</div><span className="pill pill-pending">Confidential</span></div>
            <div style={{ padding: 14, background: 'var(--ink-50)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 56, background: 'var(--red-50)', color: 'var(--red-700)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-900)' }}>Manuscript_v1.pdf</div>
                <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>3.2 MB · 24 pages</div>
              </div>
              <button className="btn btn-ghost btn-sm">Open</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Paper Metadata</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><div className="label" style={{ marginBottom: 4 }}>Category</div><div style={{ fontSize: 13.5, color: 'var(--navy-900)', fontWeight: 500 }}>{assignment.category}</div></div>
              <div><div className="label" style={{ marginBottom: 4 }}>You accepted</div><div style={{ fontSize: 13.5, color: 'var(--navy-900)' }}>{formatDate(assignment.invited_at)}</div></div>
              <div><div className="label" style={{ marginBottom: 4 }}>Review due</div><div style={{ fontSize: 13.5, color: 'var(--navy-900)' }}>{formatDate(assignment.due_at)}</div></div>
            </div>
          </div>
          {/* No co-reviewer panel here by design: a reviewer must not learn who
              else is assigned, nor how many, nor how far along they are. Even
              anonymised, progress leaks the size and state of the review panel. */}

        </div>
      </div>
    </AppShell>
  );
}
