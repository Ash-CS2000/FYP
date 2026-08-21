// src/pages/AuthorPaper.jsx
// One of the author's own papers: where it stands, the decision letter if a
// decision has been taken, and the reviewer comments once that decision releases
// them.
//
// This screen is the author side of the double-blind boundary, so what it does
// NOT show is as deliberate as what it does:
//
//   · no reviewer identities — reviewers are numbered, and the numbering is not
//     stable across manuscripts
//   · no numeric scores and no reviewer recommendation — the editor's decision is
//     the outcome; a reviewer who recommended accept against a reject is exactly
//     what the confidential channel exists to keep private
//   · no confidential comments to the editor, ever
//   · no similarity report — the author gets their own pre-submission self-check
//     in the wizard, never the editorial screening report, which names matched
//     sources
//
// The filtering is toAuthorReview() in data/editorial.js. It is an allow-list, and
// the backend must apply the same one — see api/editorial.js getAuthorReviews.

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { MANUSCRIPTS, reviewsFor } from '../data/reviews.js';
import {
  decisionFor,
  toAuthorReview,
  isFinal,
  DECISION_LABELS,
  DECISION_TONE,
  formatDecidedAt,
} from '../data/editorial.js';
import { withdrawalFor, saveWithdrawal, WITHDRAW_REASONS } from '../data/drafts.js';
import { withdrawSubmission } from '../api/submissions.js';

// A manuscript that has already reached the end of the pipeline. Checked
// alongside the decision record because the two can disagree: manuscripts
// predating the decision layer carry a terminal `status` and no decision, and an
// approved paper with no decision row is still an approved paper. Trusting only
// the decision record would offer to withdraw it.
const TERMINAL_STATUSES = ['approved', 'rejected', 'published', 'withdrawn'];

// Withdrawal, and the rule that governs it: an author may withdraw right up
// until the paper is finally decided. After accept or reject there is nothing to
// withdraw from. A pending revise-and-resubmit does NOT block it — an author is
// entitled to walk away from a revision request.
function WithdrawCard({ manuscript, decision }) {
  const [record, setRecord] = useState(() => withdrawalFor(manuscript.id));
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (record) {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Withdrawn</div>
            <div className="card-meta">{formatDecidedAt(record.withdrawn_at)}</div>
          </div>
          <span className="pill pill-revision">Withdrawn</span>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--navy-900)', lineHeight: 1.65 }}>
          {record.reason}
          {record.note && <><br />{record.note}</>}
        </p>
        <div className="card-meta" style={{ marginTop: 12 }}>
          The submission record, its reviews and its screening report are kept as part
          of the journal&apos;s audit trail. Withdrawing does not delete them.
        </div>
      </div>
    );
  }

  // Nothing to withdraw from once the paper is accepted or rejected.
  if (decision && isFinal(decision.type)) return null;
  if (TERMINAL_STATUSES.includes(manuscript.status)) return null;

  const submit = async () => {
    if (!reason) {
      setError('Pick a reason — the editor and any reviewers holding this need to be told something.');
      return;
    }
    setSaving(true);
    setError('');
    const next = {
      manuscript_id: manuscript.id,
      reason,
      note: note.trim(),
      withdrawn_at: new Date().toISOString(),
    };
    try {
      await withdrawSubmission(manuscript.id, { reason, note: note.trim() });
    } catch {
      next.local_only = true;
    }
    saveWithdrawal(next);
    setSaving(false);
    setRecord(next);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Withdraw this submission</div>
          <div className="card-meta">
            Available until a final decision is made. Any reviewers currently holding
            it will be told, and their access ends immediately.
          </div>
        </div>
        {!open && (
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Withdraw</button>
        )}
      </div>

      {open && (
        <>
          <div className="field">
            <label className="field-label">Why are you withdrawing? <span className="req">*</span></label>
            <select className="field-select" value={reason} onChange={e => { setReason(e.target.value); setError(''); }}>
              <option value="">Choose a reason…</option>
              {WITHDRAW_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Anything to add <span className="muted">(optional)</span></label>
            <textarea
              className="field-textarea"
              rows="2"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          {error && <div className="field-hint" style={{ color: 'var(--red-800)' }}>{error}</div>}
          <div className="row">
            <button className="btn btn-danger btn-sm" onClick={submit} disabled={saving}>
              {saving ? 'Withdrawing…' : 'Confirm withdrawal'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AuthorPaper() {
  const { id } = useParams();
  const manuscript = MANUSCRIPTS[id];
  const decision = manuscript ? decisionFor(id) : null;

  // Reviews are released BY the decision. No decision, nothing to show — an
  // author must not read reviews while the editor is still weighing them.
  const released = decision
    ? reviewsFor(id).filter(r => r.status === 'submitted').map(toAuthorReview)
    : [];

  if (!manuscript) {
    return (
      <AppShell role="author" searchPlaceholder="Search your papers...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Author Workspace</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>Paper not found.</h1>
            <p className="page-subtitle">No submission of yours matches that reference.</p>
          </div>
          <Link to="/author/papers" className="btn btn-ghost btn-sm">Back to my papers</Link>
        </div>
      </AppShell>
    );
  }

  const tone = decision ? DECISION_TONE[decision.type] : null;

  return (
    <AppShell role="author" searchPlaceholder="Search your papers...">
      <style>{`
        .ap-letter { white-space: pre-wrap; font-size: 13.5px; line-height: 1.7; color: var(--navy-900); background: var(--ink-50); border-radius: var(--r-md); padding: 20px 22px; }
        .ap-rec { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 99px; }
        .ap-review { border: 1px solid var(--ink-200); border-radius: var(--r-lg); padding: 20px 22px; margin-bottom: 14px; background: var(--white); }
        .ap-review h3 { font-size: 14.5px; font-weight: 600; color: var(--navy-900); margin-bottom: 14px; }
        .ap-block { margin-bottom: 14px; }
        .ap-block:last-child { margin-bottom: 0; }
        .ap-block h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-600); font-weight: 700; margin-bottom: 5px; }
        .ap-block p { font-size: 13.5px; color: var(--navy-900); line-height: 1.65; white-space: pre-wrap; }
        .ap-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; }
        .ap-meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-600); font-weight: 600; }
        .ap-meta-value { font-size: 13.5px; color: var(--navy-900); font-weight: 500; margin-top: 3px; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Author Workspace · {manuscript.id}</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            <em className="serif-italic">{manuscript.title}</em>.
          </h1>
          <p className="page-subtitle">{manuscript.category} · Submitted {manuscript.submitted}</p>
        </div>
        <Link to="/author/papers" className="btn btn-ghost btn-sm">Back to my papers</Link>
      </div>

      <div className="gap-grid fade-up delay-1">
        <div className="card">
          <div className="card-header"><div className="card-title">Where this stands</div></div>
          <div className="ap-meta">
            <div>
              <div className="ap-meta-label">Status</div>
              <div className="ap-meta-value">
                <span className={`pill pill-${manuscript.status}`}>{manuscript.status}</span>
              </div>
            </div>
            <div>
              <div className="ap-meta-label">Decision</div>
              <div className="ap-meta-value">
                {decision
                  ? <span className="ap-rec" style={{ background: tone?.bg, color: tone?.fg }}>
                      {DECISION_LABELS[decision.type]}
                    </span>
                  : <span className="muted">Not yet decided</span>}
              </div>
            </div>
            <div>
              <div className="ap-meta-label">Decided</div>
              <div className="ap-meta-value">
                {decision ? formatDecidedAt(decision.decided_at) : <span className="muted">—</span>}
              </div>
            </div>
          </div>
        </div>

        {decision ? (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Decision letter</div>
                <div className="card-meta">From {decision.decided_by}</div>
              </div>
            </div>
            <div className="ap-letter">{decision.letter}</div>
            {!isFinal(decision.type) && (
              <div style={{ marginTop: 16 }}>
                <Link to="/author/revision" className="btn btn-accent btn-sm">
                  Prepare your revision →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="card-header"><div className="card-title">Decision letter</div></div>
            <div className="card-meta">
              No decision has been made yet. When the editor decides, the letter appears
              here and the reviewer comments are released alongside it.
            </div>
          </div>
        )}

        {decision && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Reviewer comments</div>
                <div className="card-meta">
                  {released.length
                    ? `${released.length} review${released.length > 1 ? 's' : ''}, released with the decision.`
                    : 'This decision was taken without external review.'}
                </div>
              </div>
            </div>

            {released.map((r, i) => (
              <div className="ap-review" key={r.id}>
                <h3>Reviewer {i + 1}</h3>
                {r.summary && (
                  <div className="ap-block"><h4>Summary</h4><p>{r.summary}</p></div>
                )}
                {r.strengths && (
                  <div className="ap-block"><h4>Strengths</h4><p>{r.strengths}</p></div>
                )}
                {r.weaknesses && (
                  <div className="ap-block"><h4>Weaknesses and suggestions</h4><p>{r.weaknesses}</p></div>
                )}
              </div>
            ))}

            {released.length > 0 && (
              <div className="card-meta" style={{ marginTop: 4 }}>
                Reviewers are anonymous and the numbering here does not carry across
                papers. Scores and any confidential notes to the editor are not part of
                what is shared with authors.
              </div>
            )}
          </div>
        )}

        <WithdrawCard manuscript={manuscript} decision={decision} />
      </div>
    </AppShell>
  );
}
