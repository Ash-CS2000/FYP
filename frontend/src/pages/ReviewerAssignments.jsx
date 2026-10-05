// src/pages/ReviewerAssignments.jsx
// Everything the logged-in reviewer has been asked to review, in every state:
// waiting on their response, accepted and in progress, declined, done.
//
// Before this screen existed, assigned manuscripts appeared on the dashboard and
// clicking one opened the review form directly. There was no point at which the
// reviewer agreed to anything, which meant the "access only after accepting"
// rule had nothing to check against. This is that missing step.
//
// What an invited-but-not-accepted reviewer may see is deliberately thin: title,
// category, abstract. Enough to judge competence and conflict, and nothing more.
// No manuscript file, no author, and nothing at all about the other reviewers.
// See api/invitations.js for the contract the backend must hold up.

import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { useCurrentUser } from '../auth/CurrentUserContext.jsx';
import { useReviewerAssignments } from '../hooks/useReviewerAssignments.jsx';
import { clearDraft } from '../utils/reviewDraft.js';
import {
  saveResponse,
  DECLINE_REASONS,
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_TONE,
  deadlineState,
  formatDate,
} from '../data/invitations.js';
import {
  acceptAssignment,
  declineAssignment,
  recuseAssignment,
  requestExtension,
} from '../api/invitations.js';

const FILTERS = [
  { id: 'all',       label: 'All',        match: () => true },
  { id: 'invited',   label: 'Invitations', match: a => a.status === 'invited' },
  { id: 'active',    label: 'Accepted',   match: a => a.status === 'accepted' },
  { id: 'closed',    label: 'Closed',     match: a => a.status === 'declined' || a.status === 'submitted' },
];

function DeadlinePill({ iso }) {
  const state = deadlineState(iso);
  if (state.tone === 'none') return <span className="muted">—</span>;
  const tone = {
    overdue: { bg: 'var(--red-50)',   fg: 'var(--red-800)' },
    due:     { bg: 'var(--amber-50)', fg: 'var(--amber-800)' },
    ok:      { bg: 'var(--ink-100)',  fg: 'var(--ink-700)' },
  }[state.tone];
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 'var(--r-pill)', fontSize: 12,
      fontWeight: 700, background: tone.bg, color: tone.fg, whiteSpace: 'nowrap',
    }}>
      {state.label}
    </span>
  );
}

// The accept path. A conflict declared here is not a refusal — the reviewer is
// saying "you should know this before I start" and the editor decides whether it
// disqualifies them. A reviewer who judges the conflict disqualifying should
// decline instead, which is why the two are separate buttons.
function AcceptPanel({ assignment, onDone, onCancel }) {
  const [coi, setCoi] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (coi && !note.trim()) {
      setError('Describe the conflict — the editor needs it to judge whether it disqualifies you.');
      return;
    }
    setSaving(true);
    setError('');
    // due_at is the server's to set. Offline, fall back to the invitation's own
    // due_at rather than inventing one.
    let patch = {
      status: 'accepted',
      coi_declared: coi,
      coi_note: note.trim(),
      due_at: assignment.due_at,
      responded_at: new Date().toISOString(),
    };
    try {
      const updated = await acceptAssignment(assignment.id, { coi_declared: coi, coi_note: note.trim() });
      patch = { ...patch, ...updated };
    } catch {
      patch.local_only = true;
    }
    saveResponse(assignment.id, patch);
    setSaving(false);
    onDone(patch);
  };

  return (
    <div className="asg-panel">
      <div className="field-label">Before you accept</div>
      <label className="asg-check">
        <input type="checkbox" checked={coi} onChange={e => { setCoi(e.target.checked); setError(''); }} />
        <span>
          I have a possible conflict of interest the editor should know about, but I
          believe I can still review this fairly.
        </span>
      </label>

      {coi && (
        <div className="field" style={{ marginTop: 12 }}>
          <label className="field-label">Describe it <span className="req">*</span></label>
          <textarea
            className="field-textarea"
            rows="3"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. I co-authored with one of the likely authors in 2023, but we have no current collaboration."
          />
        </div>
      )}

      {error && <div className="field-hint" style={{ color: 'var(--red-800)' }}>{error}</div>}

      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving}>
          {saving ? 'Accepting…' : 'Confirm and accept'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// The decline path. A reason code is required rather than free text alone: "too
// busy" tells an editor nothing they can act on, but 'expertise' versus
// 'unavailable' is the difference between never inviting this person for this
// topic again and inviting them next month.
function DeclinePanel({ assignment, onDone, onCancel }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason) {
      setError('Pick a reason so the editor knows how to reassign.');
      return;
    }
    if (reason === 'other' && !note.trim()) {
      setError('Say a little more — "another reason" on its own is not actionable.');
      return;
    }
    setSaving(true);
    setError('');
    let patch = {
      status: 'declined',
      decline_reason: reason,
      decline_note: note.trim(),
      responded_at: new Date().toISOString(),
    };
    try {
      const updated = await declineAssignment(assignment.id, { reason, note: note.trim() });
      patch = { ...patch, ...updated };
    } catch {
      patch.local_only = true;
    }
    saveResponse(assignment.id, patch);
    setSaving(false);
    onDone(patch);
  };

  return (
    <div className="asg-panel">
      <div className="field-label">Why are you declining? <span className="req">*</span></div>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {DECLINE_REASONS.map(r => (
          <button
            key={r.id}
            type="button"
            className={`asg-option ${reason === r.id ? 'selected' : ''}`}
            onClick={() => { setReason(r.id); setError(''); }}
          >
            <span className="asg-option-title">{r.label}</span>
            {r.blurb && <span className="asg-option-desc">{r.blurb}</span>}
          </button>
        ))}
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label className="field-label">
          Anything else {reason === 'other' ? <span className="req">*</span> : <span className="muted">(optional)</span>}
        </label>
        <textarea
          className="field-textarea"
          rows="2"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Suggest an alternative reviewer, or note when you would be free."
        />
      </div>

      {error && <div className="field-hint" style={{ color: 'var(--red-800)' }}>{error}</div>}

      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn btn-danger btn-sm" onClick={submit} disabled={saving}>
          {saving ? 'Declining…' : 'Confirm decline'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// Recusal is decline-after-accepting. Kept separate because it usually happens
// for a different reason: the conflict only became visible once the reviewer read
// the manuscript.
function RecusePanel({ assignment, onDone, onCancel }) {
  const { user } = useCurrentUser();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!note.trim()) {
      setError('Say what came up. The editor has to justify the reassignment.');
      return;
    }
    setSaving(true);
    setError('');
    let patch = {
      status: 'declined',
      decline_reason: 'conflict',
      decline_note: note.trim(),
      recused: true,
      responded_at: new Date().toISOString(),
    };
    try {
      const updated = await recuseAssignment(assignment.id, { note: note.trim() });
      patch = { ...patch, ...updated, recused: true };
      if (user?.id) clearDraft(user.id, assignment.id);
    } catch {
      patch.local_only = true;
    }
    saveResponse(assignment.id, patch);
    setSaving(false);
    onDone(patch);
  };

  return (
    <div className="asg-panel">
      <div className="field">
        <label className="field-label">Why are you recusing yourself? <span className="req">*</span></label>
        <div className="field-hint" style={{ marginTop: 0, marginBottom: 8 }}>
          Any partial review you have drafted will be discarded.
        </div>
        <textarea
          className="field-textarea"
          rows="3"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. The methods section makes the author group identifiable, and I have an active collaboration with them."
        />
      </div>
      {error && <div className="field-hint" style={{ color: 'var(--red-800)' }}>{error}</div>}
      <div className="row">
        <button className="btn btn-danger btn-sm" onClick={submit} disabled={saving}>
          {saving ? 'Recusing…' : 'Confirm recusal'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// A request, never a grant — the deadline does not move until the editor says so.
function ExtensionPanel({ assignment, onDone, onCancel }) {
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      setError('Give the editor a reason — they are balancing this against the author waiting.');
      return;
    }
    if (days < 1 || days > 30) {
      setError('Between 1 and 30 days.');
      return;
    }
    setSaving(true);
    setError('');
    let patch = {
      extension: { requested_days: Number(days), reason: reason.trim(), status: 'pending' },
    };
    try {
      const updated = await requestExtension(assignment.id, { days: Number(days), reason: reason.trim() });
      patch = { ...patch, ...updated };
    } catch {
      patch.local_only = true;
    }
    saveResponse(assignment.id, patch);
    setSaving(false);
    onDone(patch);
  };

  return (
    <div className="asg-panel">
      <div className="field-grid">
        <div className="field">
          <label className="field-label">Extra days</label>
          <input
            className="field-input"
            type="number"
            min="1"
            max="30"
            value={days}
            onChange={e => setDays(e.target.value)}
            style={{ maxWidth: 120 }}
          />
        </div>
      </div>
      <div className="field">
        <label className="field-label">Reason <span className="req">*</span></label>
        <textarea
          className="field-textarea"
          rows="2"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. I am away at a conference until the 14th."
        />
      </div>
      {error && <div className="field-hint" style={{ color: 'var(--red-800)' }}>{error}</div>}
      <div className="row">
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving}>
          {saving ? 'Sending…' : 'Request extension'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function AssignmentCard({ assignment, onChanged }) {
  const [panel, setPanel] = useState('');
  const tone = ASSIGNMENT_TONE[assignment.status];
  const close = () => setPanel('');
  const done = (patch) => { setPanel(''); onChanged(patch); };

  const declineReasonLabel = DECLINE_REASONS.find(r => r.id === assignment.decline_reason)?.label;

  return (
    <div className="asg-card">
      <div className="asg-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="asg-title">{assignment.title}</div>
          <div className="asg-meta">
            Manuscript #{assignment.manuscript_id} · {assignment.category}
          </div>
        </div>
        <span className="asg-status" style={{ background: tone.bg, color: tone.fg }}>
          {ASSIGNMENT_STATUS_LABELS[assignment.status]}
        </span>
      </div>

      <p className="asg-abstract">{assignment.abstract}</p>

      <div className="asg-facts">
        <div>
          <div className="asg-fact-label">Invited</div>
          <div className="asg-fact-value">{formatDate(assignment.invited_at)}</div>
        </div>
        {assignment.status === 'invited' && (
          <div>
            <div className="asg-fact-label">Respond by</div>
            <div className="asg-fact-value"><DeadlinePill iso={assignment.respond_by} /></div>
          </div>
        )}
        {assignment.status === 'accepted' && (
          <div>
            <div className="asg-fact-label">Review due</div>
            <div className="asg-fact-value">
              {assignment.due_at
                ? <DeadlinePill iso={assignment.due_at} />
                : (
                  // The server sets due_at when it registers the acceptance. Say
                  // so rather than showing a bare dash, which reads as a bug.
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    Set by the editor once your acceptance registers
                  </span>
                )}
            </div>
          </div>
        )}
        {assignment.status === 'submitted' && (
          <div>
            <div className="asg-fact-label">Submitted</div>
            <div className="asg-fact-value">{formatDate(assignment.review?.submitted_at)}</div>
          </div>
        )}
      </div>

      {assignment.coi_declared && assignment.status === 'accepted' && (
        <div className="asg-note">
          <strong>Conflict declared:</strong> {assignment.coi_note}
          <div style={{ marginTop: 4, fontSize: 12 }}>
            The editor has been told and may reassign this manuscript.
          </div>
        </div>
      )}

      {assignment.status === 'declined' && (
        <div className="asg-note">
          <strong>{assignment.recused ? 'You recused yourself' : 'You declined'}</strong>
          {declineReasonLabel ? ` — ${declineReasonLabel}.` : '.'}
          {assignment.decline_note && <div style={{ marginTop: 4 }}>{assignment.decline_note}</div>}
        </div>
      )}

      {assignment.extension?.status === 'pending' && (
        <div className="asg-note">
          <strong>Extension requested:</strong> {assignment.extension.requested_days} extra days.
          Waiting on the editor — the deadline above has not moved.
        </div>
      )}

      {assignment.local_only && (
        <div className="asg-note">
          Recorded locally — the assignment service is unavailable, so the editor has
          not been notified yet.
        </div>
      )}

      {!panel && (
        <div className="row" style={{ marginTop: 16, gap: 10, flexWrap: 'wrap' }}>
          {assignment.status === 'invited' && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => setPanel('accept')}>Accept</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPanel('decline')}>Decline</button>
              <span className="asg-hint">
                You will get the manuscript once you accept.
              </span>
            </>
          )}
          {assignment.status === 'accepted' && (
            <>
              <Link to={`/reviewer/review/${assignment.manuscript_id}`} className="btn btn-primary btn-sm">
                Open the manuscript →
              </Link>
              {!assignment.extension && (
                <button className="btn btn-ghost btn-sm" onClick={() => setPanel('extension')}>
                  Request extension
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setPanel('recuse')}>Recuse</button>
            </>
          )}
        </div>
      )}

      {panel === 'accept'    && <AcceptPanel    assignment={assignment} onDone={done} onCancel={close} />}
      {panel === 'decline'   && <DeclinePanel   assignment={assignment} onDone={done} onCancel={close} />}
      {panel === 'recuse'    && <RecusePanel    assignment={assignment} onDone={done} onCancel={close} />}
      {panel === 'extension' && <ExtensionPanel assignment={assignment} onDone={done} onCancel={close} />}
    </div>
  );
}

const matchesQuery = (a, q) => (
  [a.title, a.abstract, a.category, String(a.manuscript_id)]
    .some(field => (field || '').toLowerCase().includes(q))
);

export default function ReviewerAssignments({ initialFilter = 'all' }) {
  const [filter, setFilter] = useState(initialFilter);
  const { assignments, loading, error: loadError, patch } = useReviewerAssignments();
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') || '').trim();
  const location = useLocation();
  const navigate = useNavigate();
  // Set by AssignmentGate when it sends the reviewer back here.
  const notice = location.state?.notice;

  // Search narrows every chip, so the counts and the list stay consistent.
  const searched = query ? assignments.filter(a => matchesQuery(a, query.toLowerCase())) : assignments;
  const matcher = id => (FILTERS.find(f => f.id === id) || FILTERS[0]).match;
  const counts = id => searched.filter(matcher(id)).length;
  const visible = searched.filter(matcher(filter));
  const heading = FILTERS.find(f => f.id === filter) || FILTERS[0];

  return (
    <AppShell role="reviewer" searchPlaceholder="Search your assignments...">
      <style>{`
        .asg-card { border: 1px solid var(--ink-200); border-radius: var(--r-lg); padding: 22px 24px; margin-bottom: 16px; background: var(--white); }
        .asg-head { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 10px; }
        .asg-title { font-size: 15.5px; font-weight: 600; color: var(--navy-900); line-height: 1.4; }
        .asg-meta { font-size: 12px; color: var(--ink-500); margin-top: 3px; }
        .asg-status { font-size: 12px; font-weight: 700; padding: 4px 11px; border-radius: 99px; white-space: nowrap; }
        .asg-abstract { font-size: 13.5px; color: var(--ink-700); line-height: 1.65; margin-bottom: 16px; }
        .asg-facts { display: flex; gap: 32px; flex-wrap: wrap; padding-top: 14px; border-top: 1px solid var(--ink-100); }
        .asg-fact-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-600); font-weight: 600; }
        .asg-fact-value { font-size: 13.5px; color: var(--navy-900); font-weight: 500; margin-top: 4px; }
        .asg-note { margin-top: 14px; padding: 12px 14px; background: var(--ink-50); border-left: 3px solid var(--ink-300); border-radius: var(--r-md); font-size: 13px; color: var(--navy-900); line-height: 1.6; }
        .asg-hint { font-size: 12.5px; color: var(--ink-600); }
        .asg-panel { margin-top: 16px; padding: 18px 20px; border: 1px solid var(--ink-200); border-radius: var(--r-md); background: var(--ink-50); }
        .asg-check { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--navy-900); line-height: 1.55; cursor: pointer; margin-top: 8px; }
        .asg-option { text-align: left; border: 1.5px solid var(--ink-200); border-radius: var(--r-md); padding: 11px 14px; background: var(--white); cursor: pointer; transition: all var(--t-fast); display: block; width: 100%; }
        .asg-option:hover { border-color: var(--navy-700); }
        .asg-option.selected { border-color: var(--navy-900); background: var(--navy-100); }
        .asg-option-title { display: block; font-weight: 600; font-size: 13.5px; color: var(--navy-900); }
        .asg-option-desc { display: block; font-size: 12.5px; color: var(--ink-600); margin-top: 2px; line-height: 1.5; }
        .asg-empty { padding: 40px 24px; text-align: center; color: var(--ink-600); font-size: 13.5px; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Reviewer Workspace</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Your <em className="serif-italic">assignments</em>.</h1>
          <p className="page-subtitle">
            Invitations, reviews in progress, and everything you have closed out.
          </p>
        </div>
      </div>

      {notice && (
        <div className="lms-banner is-todo fade-up" role="status">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" />
          </svg>
          <span style={{ flex: 1 }}>{notice}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`${location.pathname}${location.search}`, { replace: true, state: null })}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="card fade-up delay-1" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="card-title">
              {visible.length} {filter === 'all' ? 'assignments' : `· ${heading.label}`}
            </div>
            {query && (
              <div className="card-meta">
                Showing results for “{query}” ·{' '}
                <button
                  type="button"
                  className="link-btn"
                  style={{ background: 'none', border: 0, padding: 0, color: 'var(--navy-700)', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => { params.delete('q'); setParams(params); }}
                >
                  Clear
                </button>
              </div>
            )}
            {filter === 'invited' && (
              <div className="card-meta">
                You are seeing the title and abstract only. The manuscript itself opens
                once you accept.
              </div>
            )}
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
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
      </div>

      <div className="fade-up delay-2">
        {loading && <div className="card"><div className="asg-empty">Loading…</div></div>}
        {!loading && loadError && (
          <div className="card"><div className="asg-empty" style={{ color: 'var(--red-800)' }}>{loadError}</div></div>
        )}
        {!loading && !loadError && visible.length === 0 && (
          <div className="card"><div className="asg-empty">{query ? 'No assignments match your search.' : 'Nothing here right now.'}</div></div>
        )}
        {!loading && !loadError && visible.length > 0 && (
          visible.map(a => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              onChanged={(changes) => patch(a.id, changes)}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}
