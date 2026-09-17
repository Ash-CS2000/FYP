// src/pages/ManuscriptDetail.jsx
// One manuscript, everything the editor needs to decide on it, and the decision
// itself. Until this page existed the submissions table linked straight to two
// sub-views and there was nowhere to actually act — this is where the editorial
// pipeline terminates.
//
// Admins reach the same route and get the same screen with the action rail
// replaced by an oversight notice: they may read every input to the decision and
// take none of the actions. See api/editorial.js for why that split exists and
// why the server has to enforce it independently of this component.

import { useParams, Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { getStoredUser } from '../utils/user.js';
import { getManuscript } from '../api/manuscripts.js';
import {
  compositeScore,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_TONE,
} from '../data/reviews.js';
import { getReviews } from '../api/reviews.js';
import { useEffect, useState } from 'react';
import { getPlagiarismStatus } from '../api/similarity.js';
import {
  availableDecisions,
  letterTemplate,
  isFinal,
  DESK_REJECT_REASONS,
  ISSUES,
  openIssues,
  issueFor,
  saveIssueAssignment,
} from '../data/editorial.js';
import { getDecision, postDecision, publishManuscript } from '../api/editorial.js';
import { TERMINAL_STATUSES } from '../data/manuscriptStatus.js';
import ReviewerPanel from '../components/ReviewerPanel.jsx';
import DecisionHistory from '../components/DecisionHistory.jsx';
import { listManuscriptAssignments } from '../api/invitations.js';
import { formatDate } from '../data/invitations.js';

// The editor's own name goes on the letter, so the author sees who decided.
function editorName() {
  const u = getStoredUser();
  const full = [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim();
  return full || u?.name || 'The Editorial Office';
}

function SimilarityLine({ manuscriptId, basePath }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPlagiarismStatus(manuscriptId)
      .then(result => { if (!cancelled) setState(result); })
      .catch(err => { if (!cancelled) setError(err.message || 'Could not load check.'); });
    return () => { cancelled = true; };
  }, [manuscriptId]);

  if (error) return <span className="pill pill-revision" title={error}>Check unavailable</span>;
  if (!state) return <span className="muted">Loading…</span>;
  if (state.status === 'pending') return <span className="pill pill-pending">Checking…</span>;
  if (state.status === 'failed') {
    return <span className="pill pill-revision" title={state.error_message}>Check failed</span>;
  }

  const pct = state.similarity_score ?? 0;
  const tone = pct >= 30
    ? { bg: 'var(--red-100)', fg: 'var(--red-800)' }
    : pct >= 15
      ? { bg: 'var(--amber-100)', fg: 'var(--amber-800)' }
      : { bg: 'var(--green-100)', fg: 'var(--green-800)' };

  return (
    <span className="row" style={{ gap: 10 }}>
      <span style={{
        padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 700,
        background: tone.bg, color: tone.fg,
      }}>
        {pct}%
      </span>
      <Link to={`${basePath}/submissions/${manuscriptId}/similarity`}
            style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 12.5 }}>
        Full report →
      </Link>
    </span>
  );
}

// Scheduling an accepted paper into an issue. Deliberately gated on an 'accept'
// decision existing: putting a manuscript in an issue before it is accepted is
// how a journal ends up announcing something it has to pull.
// Where acceptance turns into publication. Accepting is the judgement about the
// science; publishing is the separate act of releasing the paper to the public
// library at /author/discover and /search, and only an editor may do it.
//
// Gated on manuscript.status, NOT on the fetched decision: the decision endpoint
// 404s for anything accepted before it existed (that 404 is swallowed as normal
// below), which would leave the card invisible on exactly the older manuscripts
// most likely to be ready for publication.
function PublicationCard({ manuscript, isAdmin, onPublished }) {
  const manuscriptId = manuscript.id;
  const [assigned, setAssigned] = useState(() => issueFor(manuscriptId));
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const isPublished = manuscript.status === 'published';
  if (!['accepted', 'published'].includes(manuscript.status)) return null;

  const choose = (issueId) => {
    saveIssueAssignment(manuscriptId, issueId);
    setAssigned(ISSUES.find(i => i.id === issueId) || null);
    setPicking(false);
  };

  const publish = () => {
    setPublishing(true);
    setError('');
    publishManuscript(manuscriptId)
      .then(() => { setConfirming(false); onPublished(); })
      .catch(err => setError(err.message || 'Could not publish this manuscript.'))
      .finally(() => setPublishing(false));
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Publication</div>
          <div className="card-meta">
            {isPublished
              ? `Published ${manuscript.published_at ? new Date(manuscript.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} — now discoverable to readers.`
              : assigned
                ? `Scheduled for ${assigned.label}, publishing ${assigned.publish_on}.`
                : 'Accepted but not yet published.'}
          </div>
        </div>
        {!isAdmin && !picking && !isPublished && (
          <button className="btn btn-ghost btn-sm" onClick={() => setPicking(true)}>
            {assigned ? 'Change issue' : 'Assign to issue'}
          </button>
        )}
      </div>

      {!isAdmin && !isPublished && (
        <>
          {error && <div className="field-hint" style={{ color: 'var(--red-800)' }}>{error}</div>}
          {!confirming ? (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setConfirming(true)}>
              Publish manuscript →
            </button>
          ) : (
            <div className="md-confirm" style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13.5, color: 'var(--navy-900)', marginBottom: 12 }}>
                Publish this manuscript? It becomes publicly visible in the research
                library, and cannot be unpublished from here.
              </div>
              <div className="row">
                <button className="btn btn-primary btn-sm" onClick={publish} disabled={publishing}>
                  {publishing ? 'Publishing…' : 'Confirm'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {picking && (
        <>
          <div className="md-options">
            {openIssues().map(i => {
              const full = i.filled >= i.capacity;
              return (
                <button
                  key={i.id}
                  type="button"
                  className={`md-option ${assigned?.id === i.id ? 'selected' : ''}`}
                  onClick={() => choose(i.id)}
                  disabled={full}
                  style={full ? { opacity: .55, cursor: 'not-allowed' } : undefined}
                >
                  <span className="md-option-title">{i.label}</span>
                  <span className="md-option-desc">
                    Publishing {i.publish_on} · {i.filled} of {i.capacity} papers
                    {full && ' · full'}
                    {i.status === 'planned' && ' · not yet open for production'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="card-meta" style={{ marginTop: 10 }}>
            Published issues are not listed — their contents are the historical record.
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setPicking(false)}>
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

// The action rail. Editor only — never rendered for an admin.
//
// `hasReviewers` counts INVITATIONS, not submitted reviews. Desk rejection means
// "rejected without troubling a reviewer", so the moment anyone has been asked —
// even if they have not replied — that description is no longer true and the
// option has to go. `assignmentCount` is fetched real by the parent (see
// ManuscriptDetail below) rather than read from ReviewerPanel's local store,
// so this gate reflects invitations sent by any editor, not just this tab.
function DecisionPanel({ manuscript, reviews, assignmentCount, onDecided }) {
  const hasReviewers = reviews.length > 0 || assignmentCount > 0;
  const options = availableDecisions({ hasReviews: hasReviewers });
  const [type, setType] = useState('');
  const [reasons, setReasons] = useState([]);
  const [letter, setLetter] = useState('');
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Regenerate the draft when the inputs to it change — but never clobber an
  // editor's own edits. Once they have typed, the letter is theirs.
  const redraft = (nextType, nextReasons) => {
    if (touched) return;
    setLetter(letterTemplate({
      manuscript,
      type: nextType,
      reviews,
      reasons: nextReasons,
      editorName: editorName(),
    }));
  };

  const pickType = (id) => {
    setType(id);
    setError('');
    setConfirming(false);
    redraft(id, reasons);
  };

  const toggleReason = (reason) => {
    const next = reasons.includes(reason)
      ? reasons.filter(r => r !== reason)
      : [...reasons, reason];
    setReasons(next);
    redraft(type, next);
  };

  const submit = async () => {
    if (!letter.trim()) {
      setError('The letter cannot be empty — this is the text the author receives.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await postDecision(manuscript.id, { type, letter: letter.trim(), reasons });
      onDecided(created);
    } catch (err) {
      setError(err.message || 'Could not record this decision. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const chosen = options.find(o => o.id === type);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Make a decision</div>
          <div className="card-meta">
            {hasReviewers
              ? `${reviews.filter(r => r.status === 'submitted').length} of ${reviews.length} reviews in. Reviewers have been involved, so desk rejection is no longer on the table.`
              : 'No reviewers involved yet — this manuscript can still be desk rejected.'}
          </div>
        </div>
      </div>

      <div className="md-options">
        {options.map(o => (
          <button
            key={o.id}
            type="button"
            className={`md-option ${type === o.id ? 'selected' : ''}`}
            onClick={() => pickType(o.id)}
          >
            <span className="md-option-title">{o.label}</span>
            <span className="md-option-desc">{o.blurb}</span>
          </button>
        ))}
      </div>

      {type === 'desk_reject' && (
        <div className="md-reasons">
          <div className="field-label">Reasons</div>
          <div className="field-hint" style={{ marginTop: 0, marginBottom: 10 }}>
            Folded into the letter. A desk rejection without a reason is the thing
            authors most often complain about.
          </div>
          {DESK_REJECT_REASONS.map(r => (
            <label key={r} className="md-reason">
              <input
                type="checkbox"
                checked={reasons.includes(r)}
                onChange={() => toggleReason(r)}
              />
              <span>{r}</span>
            </label>
          ))}
        </div>
      )}

      {type && (
        <>
          <div className="field" style={{ marginTop: 20 }}>
            <label className="field-label">Letter to the author <span className="req">*</span></label>
            <div className="field-hint" style={{ marginTop: 0, marginBottom: 8 }}>
              Sent verbatim. Reviewer comments are already filtered to the parts an
              author may read — scores and confidential notes are not included and
              must not be pasted in.
            </div>
            <textarea
              className="field-textarea"
              rows="16"
              value={letter}
              onChange={(e) => { setLetter(e.target.value); setTouched(true); }}
            />
          </div>

          {error && <div className="field-hint" style={{ color: 'var(--red-800)' }}>{error}</div>}

          {!confirming ? (
            <button className="btn btn-primary" onClick={() => setConfirming(true)}>
              Record {chosen?.label} →
            </button>
          ) : (
            <div className="md-confirm">
              <div style={{ fontSize: 13.5, color: 'var(--navy-900)', marginBottom: 12 }}>
                {isFinal(type)
                  ? `Record ${chosen?.label} and send this letter? This closes the manuscript and cannot be undone here.`
                  : `Record ${chosen?.label} and send this letter? The author will be invited to resubmit.`}
              </div>
              <div className="row">
                <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving}>
                  {saving ? 'Recording…' : 'Confirm'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ManuscriptDetail({ role = 'editor' }) {
  const { id } = useParams();
  const isAdmin = role === 'admin';
  const basePath = isAdmin ? '/admin' : '/editor';

  const [manuscript, setManuscript] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getManuscript(id)
      .then(m => { if (!cancelled) setManuscript(m); })
      .catch(err => { if (!cancelled) setLoadError(err.message || 'Could not load manuscript.'); });
    return () => { cancelled = true; };
  }, [id]);

  const [reviews, setReviews] = useState([]);
  const submitted = reviews.filter(r => r.status === 'submitted');
  const [decision, setDecision] = useState(null);
  const [assignmentCount, setAssignmentCount] = useState(0);

  // Real, not ReviewerPanel's local store — the desk-reject gate below must
  // reflect an invitation the moment it's sent, by any editor, not just what
  // this tab optimistically wrote to localStorage.
  useEffect(() => {
    if (!manuscript) return;
    let cancelled = false;
    listManuscriptAssignments(manuscript.id)
      .then(rows => { if (!cancelled) setAssignmentCount(rows.length); })
      .catch(() => { /* left at 0 — worst case the gate is briefly too permissive */ });
    return () => { cancelled = true; };
  }, [manuscript?.id]);

  useEffect(() => {
    if (!manuscript) return;
    let cancelled = false;
    getReviews(manuscript.id)
      .then(rows => { if (!cancelled) setReviews(rows); })
      .catch(() => { /* left empty — the summary below just reads as "no reviews yet" */ });
    return () => { cancelled = true; };
  }, [manuscript?.id]);

  useEffect(() => {
    if (!manuscript) return;
    let cancelled = false;
    getDecision(manuscript.id)
      .then(d => { if (!cancelled) setDecision(d); })
      .catch(err => { if (!cancelled && err.status !== 404) console.error(err); });
    return () => { cancelled = true; };
  }, [manuscript?.id]);

  // A fresh decision may have reopened the manuscript for another round (if
  // the author resubmits) or closed it for good — refetch rather than
  // hand-rolling the status transition here, so this stays in sync with
  // whatever Decision.STATUS_MAP actually did server-side.
  const handleDecided = (created) => {
    setDecision(created);
    getManuscript(id).then(m => setManuscript(m)).catch(() => {});
  };

  // Same reasoning as handleDecided — refetch rather than flipping status
  // locally, so published_at comes from the server that stamped it.
  const handlePublished = () => {
    getManuscript(id).then(m => setManuscript(m)).catch(() => {});
  };

  if (loadError) {
    return (
      <AppShell role={role} searchPlaceholder="Search submissions...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">{isAdmin ? 'Oversight' : 'Editorial'}</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>Couldn't load this manuscript.</h1>
            <p className="page-subtitle">{loadError}</p>
          </div>
          <Link to={`${basePath}/submissions`} className="btn btn-ghost btn-sm">Back to submissions</Link>
        </div>
      </AppShell>
    );
  }

  if (!manuscript) {
    return (
      <AppShell role={role} searchPlaceholder="Search submissions...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">{isAdmin ? 'Oversight' : 'Editorial'}</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>Loading…</h1>
          </div>
          <Link to={`${basePath}/submissions`} className="btn btn-ghost btn-sm">Back to submissions</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role={role} searchPlaceholder="Search submissions...">
      <style>{`
        .md-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 22px; align-items: start; }
        @media (max-width: 1100px) { .md-grid { grid-template-columns: 1fr; } }
        .md-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; }
        .md-meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-600); font-weight: 600; }
        .md-meta-value { font-size: 13.5px; color: var(--navy-900); font-weight: 500; margin-top: 3px; }
        .md-rec { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 99px; }
        .md-letter { white-space: pre-wrap; font-size: 13.5px; line-height: 1.7; color: var(--navy-900); background: var(--ink-50); border-radius: var(--r-md); padding: 18px 20px; }
        .md-options { display: grid; gap: 10px; }
        .md-option { text-align: left; border: 1.5px solid var(--ink-200); border-radius: var(--r-md); padding: 13px 15px; background: var(--white); cursor: pointer; transition: all var(--t-fast); display: block; width: 100%; }
        .md-option:hover { border-color: var(--navy-700); }
        .md-option.selected { border-color: var(--navy-900); background: var(--navy-100); }
        .md-option-title { display: block; font-weight: 600; font-size: 14px; color: var(--navy-900); }
        .md-option-desc { display: block; font-size: 12.5px; color: var(--ink-600); margin-top: 3px; line-height: 1.5; }
        .md-reasons { margin-top: 20px; padding: 16px 18px; border: 1px solid var(--ink-200); border-radius: var(--r-md); background: var(--ink-50); }
        .md-reason { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; font-size: 13px; color: var(--navy-900); cursor: pointer; }
        .md-confirm { margin-top: 16px; padding: 16px 18px; border-left: 3px solid var(--amber-500); background: var(--amber-50); border-radius: var(--r-md); }
        .md-review-row { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px solid var(--ink-100); font-size: 13px; }
        .md-review-row:last-child { border-bottom: none; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">{isAdmin ? 'Oversight' : 'Editorial'} · {manuscript.id}</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            <em className="serif-italic">{manuscript.title}</em>.
          </h1>
          <p className="page-subtitle">
            {manuscript.category} · Submitted {formatDate(manuscript.submitted_at)}
          </p>
        </div>
        <Link to={`${basePath}/submissions`} className="btn btn-ghost btn-sm">Back to submissions</Link>
      </div>

      {isAdmin && (
        <div className="lms-banner is-todo fade-up">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
          <span>Oversight view, read only. Editorial decisions belong to the editor.</span>
        </div>
      )}

      <div className="md-grid fade-up delay-1">
        <div className="gap-grid">
          <div className="card">
            <div className="card-header"><div className="card-title">Overview</div></div>
            <div className="md-meta">
              <div>
                <div className="md-meta-label">Status</div>
                <div className="md-meta-value">
                  <span className={`pill pill-${manuscript.status}`}>{manuscript.status}</span>
                </div>
              </div>
              <div>
                <div className="md-meta-label">Category</div>
                <div className="md-meta-value">{manuscript.category}</div>
              </div>
              <div>
                <div className="md-meta-label">Submitted</div>
                <div className="md-meta-value">{formatDate(manuscript.submitted_at)}</div>
              </div>
              <div>
                <div className="md-meta-label">Similarity</div>
                <div className="md-meta-value">
                  <SimilarityLine manuscriptId={manuscript.id} basePath={basePath} />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Reviews</div>
                <div className="card-meta">
                  {submitted.length} of {reviews.length} submitted
                  {submitted.length > 0 && ' · confidential comments are on the full view'}
                </div>
              </div>
              {reviews.length > 0 && (
                <Link to={`${basePath}/submissions/${manuscript.id}/reviews`}
                      style={{ color: 'var(--navy-700)', fontSize: 13, fontWeight: 600 }}>
                  Read all →
                </Link>
              )}
            </div>
            {reviews.length === 0 ? (
              <div className="card-meta">
                No reviews submitted yet. Invite reviewers from the panel below.
              </div>
            ) : reviews.map(r => {
              const tone = RECOMMENDATION_TONE[r.recommendation];
              return (
                <div className="md-review-row" key={r.id}>
                  <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{r.reviewer_label}</span>
                  {r.status === 'submitted' ? (
                    <>
                      <span className="muted">{compositeScore(r.ratings)} / 5</span>
                      {tone && (
                        <span className="md-rec" style={{ background: tone.bg, color: tone.fg }}>
                          {RECOMMENDATION_LABELS[r.recommendation]}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="muted" style={{ fontStyle: 'italic' }}>
                      {r.status === 'declined' ? 'Declined' : 'Not submitted yet'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {manuscript.is_own_submission ? (
            <div className="card">
              <div className="card-header"><div className="card-title">Reviewers</div></div>
              <div className="card-meta">
                You are an author of this manuscript, so reviewer invitations and decisions are
                handled by another editor.
              </div>
            </div>
          ) : (
            <ReviewerPanel
              manuscriptId={manuscript.id}
              reviews={reviews}
              isAdmin={isAdmin}
              currentRound={manuscript.current_review_round}
            />
          )}
        </div>

        <div className="gap-grid">
          {!manuscript.is_own_submission && (
            <PublicationCard manuscript={manuscript} isAdmin={isAdmin} onPublished={handlePublished} />
          )}

          {!isAdmin && !manuscript.is_own_submission && !TERMINAL_STATUSES.includes(manuscript.status) && manuscript.status !== 'revisions_requested' && (
            <DecisionPanel
              manuscript={manuscript}
              reviews={reviews}
              assignmentCount={assignmentCount}
              onDecided={handleDecided}
            />
          )}

          {!isAdmin && manuscript.status === 'revisions_requested' && (
            <div className="card">
              <div className="card-header"><div className="card-title">Next round</div></div>
              <div className="card-meta">
                Waiting on the author&apos;s revision. When it arrives, the resubmission
                opens a fresh decision on this manuscript.
              </div>
            </div>
          )}

          <DecisionHistory manuscriptId={manuscript.id} />
        </div>
      </div>
    </AppShell>
  );
}
