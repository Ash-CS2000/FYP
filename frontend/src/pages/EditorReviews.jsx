// src/pages/EditorReviews.jsx
// Consolidated review view: every review for one manuscript in one place, which
// is what the editor needs in order to decide. This is the ONLY screen that
// renders confidential_to_editor — see data/reviews.js for the contract.

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import {
  compositeScore,
  RATING_CRITERIA,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_TONE,
} from '../data/reviews.js';
import { formatDate } from '../data/invitations.js';
import { getManuscript } from '../api/manuscripts.js';
import { assessReview, getReviews } from '../api/reviews.js';

function StatusPill({ review }) {
  if (review.status === 'submitted') return <span className="pill pill-approved">Submitted</span>;
  if (review.status === 'declined')  return <span className="pill pill-revision">Declined</span>;
  if (review.status === 'accepted')  return <span className="pill pill-pending">In progress</span>;
  return <span className="pill pill-pending">Invited</span>;
}

function AssessmentForm({ review, onSaved }) {
  const [quality, setQuality] = useState(review.assessment?.quality || 4);
  const [accuracy, setAccuracy] = useState(review.assessment?.accuracy || 4);
  const [errors, setErrors] = useState(review.assessment?.errors || 0);
  const [note, setNote] = useState(review.assessment?.note || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const assessment = await assessReview(review.manuscript_id, review.id, { quality, accuracy, errors, note });
      onSaved(review.id, assessment);
      setMessage('Assessment saved.');
    } catch (err) {
      setMessage(err.message || 'Could not save assessment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rv-assess">
      <div className="rv-assess-title">Reviewer KPI assessment</div>
      <div className="rv-assess-grid">
        <label>
          <span>Quality</span>
          <select value={quality} onChange={(event) => setQuality(Number(event.target.value))}>
            {[5, 4, 3, 2, 1].map(v => <option key={v} value={v}>{v} / 5</option>)}
          </select>
        </label>
        <label>
          <span>Accuracy</span>
          <select value={accuracy} onChange={(event) => setAccuracy(Number(event.target.value))}>
            {[5, 4, 3, 2, 1].map(v => <option key={v} value={v}>{v} / 5</option>)}
          </select>
        </label>
        <label>
          <span>Corrections needed</span>
          <input type="number" min="0" max="20" value={errors} onChange={(event) => setErrors(Number(event.target.value))} />
        </label>
      </div>
      <label className="rv-assess-note">
        <span>Private assessment note</span>
        <textarea value={note} rows={3} onChange={(event) => setNote(event.target.value)} />
      </label>
      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : review.assessment ? 'Update assessment' : 'Save assessment'}
        </button>
        {message && <span className="muted" style={{ fontSize: 12.5 }}>{message}</span>}
      </div>
    </div>
  );
}

export default function EditorReviews({ role = 'editor' }) {
  const { id } = useParams();
  const isAdmin = role === 'admin';
  const backTo = isAdmin ? '/admin/submissions' : '/editor/submissions';

  const [manuscript, setManuscript] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    Promise.all([getManuscript(id), getReviews(id)])
      .then(([m, r]) => { if (!cancelled) { setManuscript(m); setReviews(r); } })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load reviews.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const submitted = reviews.filter(r => r.status === 'submitted');
  const updateAssessment = (assignmentId, assessment) => {
    setReviews(rows => rows.map(r => (r.id === assignmentId ? { ...r, assessment } : r)));
  };

  if (loading) {
    return (
      <AppShell role={role} searchPlaceholder="Search submissions...">
        <div className="card fade-up"><div style={{ padding: 24 }}>Loading…</div></div>
      </AppShell>
    );
  }

  if (loadError || !manuscript) {
    return (
      <AppShell role={role} searchPlaceholder="Search submissions...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Editorial</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>{loadError || 'Manuscript not found.'}</h1>
            <p className="page-subtitle">No manuscript matches that reference.</p>
          </div>
          <Link to={backTo} className="btn btn-ghost btn-sm">Back to submissions</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} searchPlaceholder="Search submissions...">
      <style>{`
        .rv-card { border: 1px solid var(--ink-200); border-radius: var(--r-lg); padding: 22px 24px; margin-bottom: 16px; background: var(--white); }
        .rv-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .rv-who { font-weight: 600; font-size: 15px; color: var(--navy-900); }
        .rv-rec { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 99px; }
        .rv-when { margin-left: auto; font-size: 12px; color: var(--ink-500); }
        .rv-scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 10px; margin-bottom: 18px; }
        .rv-score { background: var(--ink-50); border-radius: var(--r-md); padding: 10px 12px; }
        .rv-score-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-600); font-weight: 600; }
        .rv-score-value { font-size: 18px; font-weight: 600; color: var(--navy-900); margin-top: 2px; }
        .rv-block { margin-bottom: 16px; }
        .rv-block h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-600); font-weight: 700; margin-bottom: 6px; }
        .rv-block p { font-size: 13.5px; color: var(--navy-900); line-height: 1.65; white-space: pre-wrap; }
        .rv-conf { border-left: 3px solid var(--amber-500); background: var(--amber-50); border-radius: var(--r-md); padding: 14px 16px; }
        .rv-conf h4 { color: var(--amber-800); display: flex; align-items: center; gap: 6px; }
        .rv-conf p { color: var(--amber-800); }
        .rv-muted { font-size: 13px; color: var(--ink-600); font-style: italic; }
        .rv-empty { padding: 28px; text-align: center; color: var(--ink-600); font-size: 13.5px; }
        .rv-assess { margin-top: 16px; border: 1px solid var(--ink-200); background: var(--ink-50); border-radius: var(--r-md); padding: 14px 16px; }
        .rv-assess-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-700); font-weight: 700; margin-bottom: 10px; }
        .rv-assess-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 10px; }
        .rv-assess label, .rv-assess-note { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--ink-700); font-weight: 700; }
        .rv-assess select, .rv-assess input, .rv-assess textarea { width: 100%; border: 1px solid var(--ink-200); border-radius: var(--r-sm); background: var(--white); color: var(--navy-900); padding: 9px 10px; font: inherit; font-size: 13px; }
        .rv-assess-note { margin-bottom: 10px; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">{isAdmin ? 'Oversight' : 'Editorial'} · #{manuscript.id}</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Reviews for <em className="serif-italic">{manuscript.title}</em>.
          </h1>
          <p className="page-subtitle">
            {submitted.length} of {reviews.length} reviews submitted · {manuscript.category} · Submitted {formatDate(manuscript.submitted_at)}
          </p>
        </div>
        <Link to={backTo} className="btn btn-ghost btn-sm">Back to submissions</Link>
      </div>

      {isAdmin && (
        <div className="lms-banner is-todo fade-up">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
          <span>Oversight view, read only. Editorial decisions belong to the editor.</span>
        </div>
      )}

      <div className="fade-up delay-1">
        {reviews.length === 0 && (
          <div className="card"><div className="rv-empty">No reviewers assigned to this manuscript yet.</div></div>
        )}

        {reviews.map(r => {
          const tone = RECOMMENDATION_TONE[r.recommendation];
          return (
            <div className="rv-card" key={r.id}>
              <div className="rv-head">
                <span className="rv-who">{r.reviewer_label}</span>
                <StatusPill review={r} />
                {r.recommendation && tone && (
                  <span className="rv-rec" style={{ background: tone.bg, color: tone.fg }}>
                    {RECOMMENDATION_LABELS[r.recommendation]}
                  </span>
                )}
                {r.submitted_at && (
                  <span className="rv-when">{new Date(r.submitted_at).toLocaleDateString()}</span>
                )}
              </div>

              {r.status !== 'submitted' ? (
                <p className="rv-muted">
                  This reviewer has accepted the invitation but has not submitted their report yet.
                </p>
              ) : (
                <>
                  <div className="rv-scores">
                    {RATING_CRITERIA.map(c => (
                      <div className="rv-score" key={c.key}>
                        <div className="rv-score-label">{c.label}</div>
                        <div className="rv-score-value">{r.ratings[c.key]} / 5</div>
                      </div>
                    ))}
                    <div className="rv-score" style={{ background: 'var(--teal-50)' }}>
                      <div className="rv-score-label">Composite</div>
                      <div className="rv-score-value" style={{ color: 'var(--teal-800)' }}>{compositeScore(r.ratings)} / 5</div>
                    </div>
                  </div>

                  <div className="rv-block"><h4>Summary</h4><p>{r.summary}</p></div>
                  <div className="rv-block"><h4>Strengths</h4><p>{r.strengths}</p></div>
                  <div className="rv-block"><h4>Weaknesses and suggestions</h4><p>{r.weaknesses}</p></div>

                  <div className="rv-conf">
                    <h4>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                      Confidential to editor, not shown to the author
                    </h4>
                    {r.confidential_to_editor
                      ? <p>{r.confidential_to_editor}</p>
                      : <p className="rv-muted">No confidential comments left.</p>}
                  </div>

                  {!isAdmin && <AssessmentForm review={r} onSaved={updateAssessment} />}
                </>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
