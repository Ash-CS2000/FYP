// The manuscript is reached only through an accepted assignment — auth/AssignmentGate
// redirects anyone else back to the assignment list before this component renders.
// The gate is a courtesy; the server still has to check (see api/reviews.js).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { deadlineState, formatDate } from '../data/invitations.js';
import { RATING_CRITERIA } from '../data/reviews.js';
import { submitReview } from '../api/reviews.js';
import { useCurrentUser } from '../auth/CurrentUserContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useReviewerAssignments } from '../hooks/useReviewerAssignments.jsx';
import { clearDraft, loadDraft, saveDraft } from '../utils/reviewDraft.js';

const RECOMMENDATIONS = [
  { id: 'accept', title: 'Accept', desc: 'Publish as-is, no revisions needed.' },
  { id: 'minor', title: 'Minor Revision', desc: 'Small changes; no second review needed.' },
  { id: 'major', title: 'Major Revision', desc: 'Substantive changes; second review needed.' },
  { id: 'reject', title: 'Reject', desc: 'Not suitable for this journal.' },
];

const recommendationLabel = id => RECOMMENDATIONS.find(r => r.id === id)?.title || id || 'Not recorded';

// Nothing is pre-selected: a default score or recommendation is one the
// reviewer never chose, and it anchors everyone towards the same answer.
const EMPTY_RATINGS = { originality: null, technical: null, clarity: null, relevance: null };

const isEmptyDraft = d => (
  Object.values(d.ratings).every(v => v == null)
  && !d.summary.trim() && !d.strengths.trim() && !d.weaknesses.trim()
  && !d.confidential.trim() && !d.recommendation
);

export default function ReviewForm() {
  // AssignmentGate has already checked the assignment and started loading the
  // manuscript; both arrive through the outlet context.
  const { assignment, manuscript, loadError } = useOutletContext();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const store = useReviewerAssignments();
  const userId = user?.id;
  const assignmentId = assignment.id;

  // Restored synchronously so the form never flashes empty before the draft.
  const [initial] = useState(() => (userId ? loadDraft(userId, assignmentId) : null));
  const [ratings, setRatings] = useState(() => ({ ...EMPTY_RATINGS, ...(initial?.ratings || {}) }));
  const [summary, setSummary] = useState(initial?.summary || '');
  const [strengths, setStrengths] = useState(initial?.strengths || '');
  const [weaknesses, setWeaknesses] = useState(initial?.weaknesses || '');
  const [recommendation, setRecommendation] = useState(initial?.recommendation || null);
  const [confidential, setConfidential] = useState(initial?.confidential || '');
  const [savedAt, setSavedAt] = useState(initial?.saved_at || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const alreadySubmitted = assignment.status === 'submitted';

  // ── Draft autosave ──────────────────────────────────────────────────────
  const draft = useMemo(
    () => ({ ratings, summary, strengths, weaknesses, recommendation, confidential }),
    [ratings, summary, strengths, weaknesses, recommendation, confidential],
  );
  const debouncedDraft = useDebouncedValue(draft, 800);
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  const finished = useRef(false); // set after a successful submit so nothing re-saves
  // What storage already holds, so an untouched form is not re-saved with a
  // fresh timestamp.
  const lastWritten = useRef(JSON.stringify(draft));

  const persist = useCallback((d) => {
    if (!userId || alreadySubmitted || finished.current) return;
    const serialized = JSON.stringify(d);
    if (serialized === lastWritten.current) return;
    lastWritten.current = serialized;
    if (isEmptyDraft(d)) {
      clearDraft(userId, assignmentId);
      setSavedAt(null);
    } else {
      const at = saveDraft(userId, assignmentId, d);
      if (at) setSavedAt(at);
    }
  }, [userId, assignmentId, alreadySubmitted]);

  useEffect(() => { persist(debouncedDraft); }, [debouncedDraft, persist]);

  // Write whatever the debounce has not yet — when leaving the page inside the
  // app (unmount) and when the tab is closed or reloaded (pagehide).
  useEffect(() => {
    const flush = () => persist(latestDraft.current);
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [persist]);

  const ratingValues = Object.values(ratings);
  const allRated = ratingValues.every(v => v != null);
  const composite = allRated ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length : null;
  const due = deadlineState(assignment.due_at);

  const handleSubmit = async () => {
    if (!allRated || !recommendation) {
      setError('Score all four criteria and choose a final recommendation.');
      return;
    }
    if (!summary.trim() || !strengths.trim() || !weaknesses.trim()) {
      setError('Summary, strengths, and weaknesses are all required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitReview(assignment.manuscript_id, {
        ...ratings,
        recommendation,
        summary: summary.trim(),
        strengths: strengths.trim(),
        weaknesses: weaknesses.trim(),
        confidential_to_editor: confidential.trim(),
      });
      finished.current = true;
      if (userId) clearDraft(userId, assignmentId);
      await store?.refetch();
      navigate('/reviewer/assignments');
    } catch (err) {
      setError(err.message || 'Could not submit the review. Please try again.');
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <AppShell role="reviewer" searchPlaceholder="Search your assignments...">
        <div className="page-header fade-up">
          <h1 className="page-title">{loadError}</h1>
          <Link to="/reviewer/assignments" className="btn btn-ghost btn-sm">← Back to assignments</Link>
        </div>
      </AppShell>
    );
  }

  if (!manuscript) {
    return (
      <AppShell role="reviewer" searchPlaceholder="Search your assignments...">
        <div className="card fade-up"><div style={{ padding: 24 }}>Loading…</div></div>
      </AppShell>
    );
  }

  return (
    <AppShell role="reviewer" searchPlaceholder="Search your assignments...">
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
        .review-readonly-grid { display:grid; grid-template-columns:1.35fr .85fr; gap:24px; }
        .review-section { padding: 18px 20px; border: 1px solid var(--ink-200); border-radius: var(--r-md); background: var(--white); }
        .review-section + .review-section { margin-top: 14px; }
        .review-section-title { font-size: 12px; font-weight: 700; color: var(--ink-600); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
        .review-section-body { font-size: 14px; line-height: 1.65; color: var(--navy-900); white-space: pre-wrap; }
        .review-score-grid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:10px; margin-bottom: 14px; }
        .review-score { border: 1px solid var(--ink-200); border-radius: var(--r-md); padding: 12px; background: var(--ink-50); }
        .review-score strong { display:block; font-family: var(--font-display); font-size: 24px; color: var(--teal-700); line-height: 1; margin-bottom: 4px; }
        .review-score span { font-size: 11px; font-weight: 700; color: var(--ink-600); text-transform: uppercase; letter-spacing: .04em; }
        .assessment-card { border-left: 3px solid var(--teal-500); background: var(--teal-50); }
        .review-form-grid { grid-template-columns: 1.6fr 1fr; }
        .assessment-score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .recommend-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .draft-status { font-size: 12.5px; color: var(--ink-600); margin-right: auto; }
        @media (max-width: 900px) {
          .review-readonly-grid, .review-form-grid { grid-template-columns: minmax(0, 1fr); }
          .review-score-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .recommend-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Review · #{assignment.manuscript_id}</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            <em className="serif-italic">{manuscript.title}</em>.
          </h1>
          <p className="page-subtitle">
            {alreadySubmitted
              ? 'You already submitted your review for this manuscript.'
              : <>Evaluate the manuscript and submit your recommendation.
                {assignment.due_at
                  ? <> Due {formatDate(assignment.due_at)}.</>
                  : <> Your deadline is set once the editor registers your acceptance.</>}
              </>}
          </p>
        </div>
        <Link to="/reviewer/assignments" className="btn btn-ghost btn-sm">← Back to assignments</Link>
      </div>

      {!alreadySubmitted && due.tone === 'overdue' && (
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

      {alreadySubmitted ? (
        <div className="review-readonly-grid fade-up delay-1">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Your submitted review</div>
                <div className="card-meta">
                  Submitted {formatDate(assignment.review?.submitted_at)} - {recommendationLabel(assignment.review?.recommendation)}
                </div>
              </div>
              <span className="pill pill-approved">Read-only</span>
            </div>

            {assignment.review?.ratings && (
              <div className="review-score-grid">
                {RATING_CRITERIA.map(c => (
                  <div key={c.key} className="review-score">
                    <strong>{assignment.review.ratings[c.key]} / 5</strong>
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="review-section">
              <div className="review-section-title">Summary of contributions</div>
              <div className="review-section-body">{assignment.review?.summary || 'Not recorded.'}</div>
            </div>
            <div className="review-section">
              <div className="review-section-title">Strengths</div>
              <div className="review-section-body">{assignment.review?.strengths || 'Not recorded.'}</div>
            </div>
            <div className="review-section">
              <div className="review-section-title">Weaknesses and suggestions</div>
              <div className="review-section-body">{assignment.review?.weaknesses || 'Not recorded.'}</div>
            </div>
            {assignment.review?.confidential_to_editor && (
              <div className="review-section confidential-field">
                <div className="review-section-title">Confidential to editor</div>
                <div className="review-section-body">{assignment.review.confidential_to_editor}</div>
              </div>
            )}
          </div>

          <div className="gap-grid">
            <div className="card assessment-card">
              <div className="card-header">
                <div>
                  <div className="card-title">Chief editor assessment</div>
                  <div className="card-meta">
                    {assignment.review?.assessment
                      ? `Assessed by ${assignment.review.assessment.assessed_by}`
                      : 'No assessment note has been added yet.'}
                  </div>
                </div>
              </div>
              {assignment.review?.assessment ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div className="assessment-score-grid">
                    <div className="review-score"><strong>{assignment.review.assessment.quality} / 5</strong><span>Quality</span></div>
                    <div className="review-score"><strong>{assignment.review.assessment.accuracy} / 5</strong><span>Accuracy</span></div>
                    <div className="review-score"><strong>{assignment.review.assessment.errors}</strong><span>Corrections</span></div>
                  </div>
                  <div className="review-section-body">
                    {assignment.review.assessment.note || 'No private note recorded.'}
                  </div>
                </div>
              ) : (
                <div className="card-meta">Once the chief editor assesses this review, their note will appear here for your reference.</div>
              )}
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Manuscript</div><span className="pill pill-pending">Reference</span></div>
              <div style={{ padding: 14, background: 'var(--ink-50)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 56, background: 'var(--red-50)', color: 'var(--red-700)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{manuscript.file_name}</div>
                </div>
                <a href={manuscript.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Open</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><div className="label" style={{ marginBottom: 4 }}>Category</div><div style={{ fontSize: 13.5, color: 'var(--navy-900)', fontWeight: 500 }}>{manuscript.category}</div></div>
                {manuscript.sub_category && <div><div className="label" style={{ marginBottom: 4 }}>Sub-category</div><div style={{ fontSize: 13.5, color: 'var(--navy-900)' }}>{manuscript.sub_category}</div></div>}
                <div><div className="label" style={{ marginBottom: 4 }}>Review due</div><div style={{ fontSize: 13.5, color: 'var(--navy-900)' }}>{formatDate(assignment.due_at)}</div></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="split-grid review-form-grid fade-up delay-1">
        <div className="card">
          {RATING_CRITERIA.map(c => (
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
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, color: 'var(--teal-700)', letterSpacing: '-0.02em' }}>{composite == null ? '—' : composite.toFixed(1)} / 5</span>
            </div>
            <div className="progress" style={{ '--accent': 'var(--teal-500)', height: 8 }}>
              <div className="progress-fill" style={{ width: `${((composite || 0) / 5) * 100}%` }}></div>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Summary of contributions <span className="req">*</span></label>
            <textarea
              className="field-textarea"
              rows="3"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="What does this paper contribute?"
            />
          </div>
          <div className="field">
            <label className="field-label">Strengths <span className="req">*</span></label>
            <textarea
              className="field-textarea"
              rows="3"
              value={strengths}
              onChange={e => setStrengths(e.target.value)}
              placeholder="What does the paper do well?"
            />
          </div>
          <div className="field">
            <label className="field-label">Weaknesses & suggestions <span className="req">*</span></label>
            <textarea
              className="field-textarea"
              rows="4"
              value={weaknesses}
              onChange={e => setWeaknesses(e.target.value)}
              placeholder="What should the authors address?"
            />
          </div>

          {/* Editor-only channel. The author never sees this — see
              api/reviews.js for the contract the backend must honour. */}
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
            <div className="recommend-grid">
              {RECOMMENDATIONS.map(r => (
                <div key={r.id} className={`recommend-card ${recommendation === r.id ? 'selected' : ''}`} onClick={() => setRecommendation(r.id)}>
                  <div className="recommend-card-title">{r.title}</div>
                  <div className="recommend-card-desc">{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="field-hint" style={{ color: 'var(--red-800)', marginTop: 12 }}>{error}</div>
          )}

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--ink-200)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="draft-status">
              {savedAt
                ? `Draft saved on this device · ${new Date(savedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                : 'Your draft saves automatically on this device.'}
            </span>
            <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Review →'}
            </button>
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
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{manuscript.file_name}</div>
              </div>
              <a href={manuscript.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Open</a>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Paper Metadata</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><div className="label" style={{ marginBottom: 4 }}>Category</div><div style={{ fontSize: 13.5, color: 'var(--navy-900)', fontWeight: 500 }}>{manuscript.category}</div></div>
              {assignment.responded_at && (
                <div><div className="label" style={{ marginBottom: 4 }}>You accepted</div><div style={{ fontSize: 13.5, color: 'var(--navy-900)' }}>{formatDate(assignment.responded_at)}</div></div>
              )}
              <div><div className="label" style={{ marginBottom: 4 }}>Review due</div><div style={{ fontSize: 13.5, color: 'var(--navy-900)' }}>{formatDate(assignment.due_at)}</div></div>
            </div>
          </div>
          {/* No co-reviewer panel here by design: a reviewer must not learn who
              else is assigned, nor how many, nor how far along they are. Even
              anonymised, progress leaks the size and state of the review panel. */}

        </div>
      </div>
      )}
    </AppShell>
  );
}
