// The manuscript is reached only through an accepted assignment — auth/AssignmentGate
// redirects anyone else back to the assignment list before this component renders.
// The gate is a courtesy; the server still has to check (see api/reviews.js).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { deadlineState, formatDate } from '../data/invitations.js';
import { DECISION_LABELS, DECISION_TONE, RATING_CRITERIA, RECOMMENDATION_LABELS, rubricFor } from '../data/reviews.js';
import { getReviewOutcome, submitReview } from '../api/reviews.js';
import { declareConflict } from '../api/invitations.js';
import ReviewerGuidelines from '../components/ReviewerGuidelines.jsx';
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

// Each written section needs some substance. Mirrors MIN_REVIEW_TEXT in
// backend/apps/reviews/serializers.py, which enforces it.
const MIN_TEXT = 50;

function LengthHint({ value }) {
  const n = value.trim().length;
  const met = n >= MIN_TEXT;
  return (
    <div className="field-hint" style={{ color: met ? 'var(--teal-700)' : 'var(--ink-600)' }}>
      {met ? `${n} characters` : `${n} / ${MIN_TEXT} characters minimum`}
    </div>
  );
}

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
  // Submitting is two steps: preview what each audience will see, then confirm.
  const [previewing, setPreviewing] = useState(false);

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

  const validationError = () => {
    if (!allRated || !recommendation) return 'Score all four criteria and choose a final recommendation.';
    if (!summary.trim() || !strengths.trim() || !weaknesses.trim()) {
      return 'Summary, strengths, and weaknesses are all required.';
    }
    if ([summary, strengths, weaknesses].some(t => t.trim().length < MIN_TEXT)) {
      return `Each of summary, strengths and weaknesses needs at least ${MIN_TEXT} characters.`;
    }
    return '';
  };

  const openPreview = () => {
    const problem = validationError();
    setError(problem);
    if (problem) return;
    setPreviewing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    const problem = validationError();
    if (problem) {
      setError(problem);
      setPreviewing(false);
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
        .preview-label { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: var(--ink-600); text-transform: uppercase; letter-spacing: .06em; margin: 22px 0 10px; }
        .preview-label:first-of-type { margin-top: 4px; }
        .guidelines-card summary { cursor: pointer; font-family: var(--font-display); font-size: 17px; color: var(--navy-900); list-style: none; display: flex; align-items: center; justify-content: space-between; }
        .guidelines-card summary::-webkit-details-marker { display: none; }
        .guidelines-card summary::after { content: '+'; font-size: 20px; color: var(--ink-500); }
        .guidelines-card[open] summary::after { content: '–'; }
        .guidelines-card[open] summary { margin-bottom: 14px; }
        .outcome-review { padding: 16px 18px; border: 1px solid var(--ink-200); border-radius: var(--r-md); background: var(--white); }
        .outcome-review + .outcome-review { margin-top: 12px; }
        .outcome-review.is-you { border-color: var(--navy-300, var(--ink-300)); background: var(--ink-50); }
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
      {!alreadySubmitted && assignment.extension?.status === 'granted' && (
        <div className="lms-banner fade-up">
          <span>
            Extension granted: {assignment.extension.requested_days} extra days. Your new deadline
            is {formatDate(assignment.due_at)}.
          </span>
        </div>
      )}
      {!alreadySubmitted && assignment.extension?.status === 'refused' && (
        <div className="lms-banner is-todo fade-up">
          <span>
            Your request for {assignment.extension.requested_days} extra days was refused. The
            original deadline stands.
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
          {assignment.decision && <OutcomeCard manuscriptId={assignment.manuscript_id} />}
        </div>
      ) : (
      <div className="split-grid review-form-grid fade-up delay-1">
        {previewing ? (
          <ReviewPreview
            ratings={ratings}
            composite={composite}
            recommendation={recommendation}
            summary={summary}
            strengths={strengths}
            weaknesses={weaknesses}
            confidential={confidential}
            conflict={assignment.coi_declared ? (assignment.coi_note || 'Declared') : ''}
            error={error}
            submitting={submitting}
            onEdit={() => setPreviewing(false)}
            onConfirm={handleSubmit}
          />
        ) : (
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
                    title={`${n} — ${rubricFor(c, n)}`}
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
            <LengthHint value={summary} />
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
            <LengthHint value={strengths} />
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
            <LengthHint value={weaknesses} />
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
            <button onClick={openPreview} className="btn btn-primary">
              Preview review →
            </button>
          </div>
        </div>
        )}

        <div className="gap-grid">
          <details className="card guidelines-card">
            <summary>Reviewer guidelines</summary>
            <ReviewerGuidelines compact />
          </details>

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
          <ConflictCard assignment={assignment} onDeclared={(changes) => store?.patch(assignment.id, changes)} />

          {/* No co-reviewer panel here by design: a reviewer must not learn who
              else is assigned, nor how many, nor how far along they are. Even
              anonymised, progress leaks the size and state of the review panel. */}

        </div>
      </div>
      )}
    </AppShell>
  );
}

// What each audience will receive, before anything is sent. The author part is
// shown first because it is the one people forget is going to the authors.
function ReviewPreview({
  ratings, composite, recommendation, summary, strengths, weaknesses, confidential, conflict,
  error, submitting, onEdit, onConfirm,
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Preview your review</div>
          <div className="card-meta">Nothing has been sent yet. Check it, then confirm.</div>
        </div>
      </div>

      <div className="preview-label">What the author will see (as “Reviewer N”, after a decision)</div>
      {[['Summary of contributions', summary], ['Strengths', strengths], ['Weaknesses and suggestions', weaknesses]].map(([title, body]) => (
        <div key={title} className="review-section">
          <div className="review-section-title">{title}</div>
          <div className="review-section-body">{body.trim()}</div>
        </div>
      ))}

      <div className="preview-label">Only the editor sees</div>
      <div className="review-score-grid">
        {RATING_CRITERIA.map(c => (
          <div key={c.key} className="review-score"><strong>{ratings[c.key]} / 5</strong><span>{c.label}</span></div>
        ))}
      </div>
      <div className="review-section">
        <div className="review-section-title">Recommendation</div>
        <div className="review-section-body">
          {RECOMMENDATION_LABELS[recommendation]} · composite {composite?.toFixed(1)} / 5
        </div>
      </div>
      <div className="review-section confidential-field">
        <div className="review-section-title">Confidential comments</div>
        <div className="review-section-body">{confidential.trim() || 'None.'}</div>
      </div>
      {conflict && (
        <div className="review-section confidential-field">
          <div className="review-section-title">Conflict of interest declared</div>
          <div className="review-section-body">{conflict}</div>
        </div>
      )}

      {error && <div className="field-hint" style={{ color: 'var(--red-800)', marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--ink-200)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" onClick={onEdit} disabled={submitting}>← Edit review</button>
        <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Confirm and submit →'}
        </button>
      </div>
    </div>
  );
}

// A conflict the reviewer only noticed while reading. Declaring one is not a
// withdrawal: the editor is told and decides. A conflict that rules them out is
// a recusal, which lives with the other assignment actions.
function ConflictCard({ assignment, onDeclared }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!note.trim()) {
      setError('Describe the conflict so the editor can judge it.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await declareConflict(assignment.id, note.trim());
      onDeclared({ coi_declared: true, coi_note: updated?.coi_note ?? note.trim() });
      setOpen(false);
    } catch (err) {
      setError(err.message || 'Could not send the declaration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Conflict of interest</div></div>
      {assignment.coi_declared ? (
        <div className="field-hint" style={{ marginTop: 0 }}>
          <strong style={{ color: 'var(--navy-900)' }}>You declared:</strong> {assignment.coi_note || 'A possible conflict.'}
          <div style={{ marginTop: 6 }}>The editor has been told and may reassign this manuscript.</div>
        </div>
      ) : open ? (
        <div>
          <div className="field-hint" style={{ marginTop: 0, marginBottom: 8 }}>
            The editor is notified and decides whether it disqualifies you. You can keep reviewing meanwhile.
          </div>
          <textarea
            className="field-textarea"
            rows="3"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. I recognise the dataset from a collaborator's lab."
          />
          {error && <div className="field-hint" style={{ color: 'var(--red-800)' }}>{error}</div>}
          <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={send} disabled={saving}>
              {saving ? 'Sending…' : 'Tell the editor'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setError(''); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="field-hint" style={{ marginTop: 0 }}>
            Noticed something while reading — a collaborator's work, a competing project?
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
            I can still review fairly — tell the editor
          </button>
          <Link to="/reviewer/assigned" className="btn btn-ghost btn-sm" style={{ textAlign: 'center' }}>
            I can't review this fairly — recuse
          </Link>
        </div>
      )}
    </div>
  );
}

// The editorial decision and every released report, so the reviewer can see
// how their judgement compared. Labels only; see getReviewOutcome.
function OutcomeCard({ manuscriptId }) {
  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getReviewOutcome(manuscriptId)
      .then((data) => { if (!cancelled) setOutcome(data); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load the outcome.'); });
    return () => { cancelled = true; };
  }, [manuscriptId]);

  const tone = outcome ? DECISION_TONE[outcome.decision.type] : null;
  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <div>
          <div className="card-title">Editorial outcome</div>
          <div className="card-meta">
            {outcome
              ? `Decided ${formatDate(outcome.decision.decided_at)} · every report on this manuscript, anonymised`
              : (error || 'Loading…')}
          </div>
        </div>
        {outcome && (
          <span className="pill" style={{ background: tone?.bg, color: tone?.fg }}>
            {DECISION_LABELS[outcome.decision.type] || outcome.decision.type}
          </span>
        )}
      </div>
      {outcome?.reviews.map((r) => (
        <div key={r.label} className={`outcome-review ${r.is_you ? 'is-you' : ''}`}>
          <div className="row" style={{ marginBottom: 8, gap: 8 }}>
            <strong style={{ color: 'var(--navy-900)', fontSize: 14 }}>{r.is_you ? `${r.label} (you)` : r.label}</strong>
            <span className="spacer"></span>
            <span className="muted" style={{ fontSize: 12.5 }}>Recommended {RECOMMENDATION_LABELS[r.recommendation] || r.recommendation}</span>
          </div>
          <div className="review-section-title">Summary</div>
          <div className="review-section-body" style={{ marginBottom: 10 }}>{r.summary}</div>
          <div className="review-section-title">Strengths</div>
          <div className="review-section-body" style={{ marginBottom: 10 }}>{r.strengths}</div>
          <div className="review-section-title">Weaknesses and suggestions</div>
          <div className="review-section-body">{r.weaknesses}</div>
        </div>
      ))}
    </div>
  );
}
