// src/components/ReviewerPanel.jsx
// The editor's side of the assignment lifecycle: who is on this manuscript, what
// state each of them is in, and who to invite next.
//
// Rendered inside ManuscriptDetail. Admins get the same panel with every action
// removed — assigning reviewers is editorial work, and the platform owner does
// not do editorial work. See api/editorial.js for why that split is enforced
// server-side rather than trusted to this component.
//
// The recommended list is ranked by an opaque `match_score` the backend produces.
// This component only sorts and displays it, so however the ranking is
// eventually built — embeddings, keyword overlap, citation graph, or a hand-tuned
// heuristic to start with — nothing here changes. What the editor actually reads
// is `match_reasons`: a bare 94% is not something anyone can sanity-check.

import { useEffect, useState } from 'react';
import {
  saveAssignments,
  AVAILABILITY_LABELS,
  AVAILABILITY_TONE,
  deadlineState,
  formatDate,
} from '../data/invitations.js';
import { SPECIALTY_TAG_LABELS } from '../data/specialtyTags.js';
import {
  decideExtension, inviteReviewers, listCandidates, listManuscriptAssignments, remindReviewer,
} from '../api/invitations.js';

const STATUS_LABELS = {
  invited:   'Invited',
  accepted:  'Reviewing',
  declined:  'Declined',
  submitted: 'Submitted',
};

const STATUS_TONE = {
  invited:   { bg: 'var(--amber-50)', fg: 'var(--amber-800)' },
  accepted:  { bg: 'var(--navy-100)', fg: 'var(--navy-800)' },
  declined:  { bg: 'var(--ink-100)',  fg: 'var(--ink-700)' },
  submitted: { bg: 'var(--green-50)', fg: 'var(--green-800)' },
};

function DeadlineText({ iso }) {
  const state = deadlineState(iso);
  if (state.tone === 'none') return <span className="muted">no deadline</span>;
  const color = {
    overdue: 'var(--red-700)',
    due: 'var(--amber-800)',
    ok: 'var(--ink-600)',
  }[state.tone];
  return <span style={{ color, fontWeight: state.tone === 'ok' ? 400 : 600 }}>{state.label}</span>;
}

// One candidate in the recommended list. Conflicts are shown, never filtered
// out: an editor needs to see that a strong match was ruled out and why —
// silently dropping them looks exactly like the person not existing.
function CandidateRow({ candidate, checked, onToggle, alreadyOn, priorRound }) {
  const tone = AVAILABILITY_TONE[candidate.availability];
  const blocked = alreadyOn || candidate.availability === 'unavailable';
  const expertiseLabels = (candidate.specialty_tags || []).map(s => SPECIALTY_TAG_LABELS[s] || s);

  return (
    <label className={`rp-cand ${checked ? 'selected' : ''} ${blocked ? 'blocked' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={blocked}
        onChange={() => onToggle(candidate.id)}
      />
      <span className="rp-cand-body">
        <span className="rp-cand-head">
          <span className="rp-cand-name">{candidate.name}</span>
          <span className="rp-cand-score">{candidate.match_score}</span>
        </span>
        <span className="rp-cand-meta">
          {candidate.institution}{expertiseLabels.length > 0 && ` · ${expertiseLabels.join(', ')}`}
        </span>
        <span className="rp-cand-reasons">
          {candidate.match_reasons.join(' · ')}
        </span>
        <span className="rp-cand-facts">
          <span className="rp-tag" style={{ background: tone.bg, color: tone.fg }}>
            {AVAILABILITY_LABELS[candidate.availability]}
          </span>
          <span className="muted">{candidate.active_reviews} active</span>
          <span className="muted">
            {candidate.avg_turnaround_days == null ? 'no history yet' : `~${candidate.avg_turnaround_days}d turnaround`}
          </span>
        </span>
        {candidate.conflict && (
          <span className="rp-conflict">Conflict: {candidate.conflict}</span>
        )}
        {alreadyOn && <span className="rp-cand-note">Already on this round.</span>}
        {!alreadyOn && priorRound && (
          <span className="rp-cand-note">Reviewed round {priorRound} — free to reassign.</span>
        )}
      </span>
    </label>
  );
}

export default function ReviewerPanel({ manuscriptId, reviews, isAdmin, currentRound = 1 }) {
  const [rows, setRows] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  // Who's already on this manuscript, real — survives a reload and reflects
  // what any editor invited, not just optimistic local state from this tab.
  useEffect(() => {
    let cancelled = false;
    listManuscriptAssignments(manuscriptId)
      .then((data) => { if (!cancelled) setRows(data); })
      .catch(() => { /* left empty — the panel still renders, just starts from zero */ });
    return () => { cancelled = true; };
  }, [manuscriptId]);

  // Candidates are ranked server-side and only needed once the editor opens
  // the invite picker — no point computing them on every manuscript page.
  useEffect(() => {
    if (!inviting || candidatesLoaded) return;
    let cancelled = false;
    listCandidates(manuscriptId)
      .then((data) => { if (!cancelled) { setCandidates(data); setCandidatesLoaded(true); } })
      .catch(() => { if (!cancelled) setFlash('Could not load candidates — the matching service is unavailable.'); });
    return () => { cancelled = true; };
  }, [inviting, candidatesLoaded, manuscriptId]);

  // Two sources, deliberately: `reviews` is the seeded editorial view from
  // data/reviews.js, `rows` is what this editor has invited since. They are
  // merged for display only — nothing writes back into data/reviews.js.
  const seeded = reviews.map(r => ({
    id: r.id,
    name: r.reviewer_label,
    status: r.status,
    due_at: null,
    seeded: true,
  }));
  const all = [...seeded, ...rows];

  // Blocking is scoped to the current round, by reviewer id — not by name —
  // so a reviewer whose only assignment is from an earlier, now-superseded
  // round shows up as reassignable rather than permanently "already on this
  // manuscript". See ReviewAssignment.round on the backend.
  const onCurrentRound = new Set(
    rows.filter(r => r.round === currentRound).map(r => r.reviewer_id),
  );
  const priorRoundByReviewerId = new Map();
  rows.forEach((r) => {
    if (r.round < currentRound) {
      const prev = priorRoundByReviewerId.get(r.reviewer_id) || 0;
      if (r.round > prev) priorRoundByReviewerId.set(r.reviewer_id, r.round);
    }
  });
  const rankedCandidates = [...candidates].sort((a, b) => b.match_score - a.match_score);

  const toggle = (id) =>
    setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  const invite = async () => {
    setBusy(true);
    const chosen = candidates.filter(c => picked.includes(c.id));
    const force = chosen.some(c => c.conflict);
    const localPlaceholder = [
      ...rows,
      ...chosen.map(c => ({
        id: `LOCAL-${c.id}-${Date.now()}`,
        reviewer_id: c.id,
        name: c.name,
        status: 'invited',
        round: currentRound,
        invited_at: new Date().toISOString(),
        // The server owns the real deadline; this is a display placeholder that
        // matches the default respond_by_days / due_days in the contract.
        due_at: new Date(Date.now() + 21 * 86400000).toISOString(),
        extension: null,
      })),
    ];
    try {
      const created = await inviteReviewers(manuscriptId, { reviewer_ids: picked, force });
      setRows([...rows, ...created]);
      setFlash(`Invited ${chosen.length} reviewer${chosen.length === 1 ? '' : 's'}.`);
    } catch {
      setFlash('Recorded locally — the assignment service is unavailable, so no invitations were sent.');
      saveAssignments(manuscriptId, localPlaceholder);
      setRows(localPlaceholder);
    }
    setPicked([]);
    setInviting(false);
    setBusy(false);
  };

  const remind = async (row) => {
    setBusy(true);
    try {
      await remindReviewer(manuscriptId, row.id);
      setFlash(`Reminder sent to ${row.name}.`);
    } catch (err) {
      setFlash(
        err.status === 409
          ? `${row.name} was already reminded in the last 24 hours.`
          : 'Reminder not sent — the assignment service is unavailable.',
      );
    }
    setBusy(false);
  };

  const resolveExtension = async (row, status) => {
    setBusy(true);
    const next = rows.map(r =>
      r.id === row.id
        ? {
            ...r,
            extension: { ...r.extension, status },
            due_at:
              status === 'granted'
                ? new Date(new Date(r.due_at).getTime() + r.extension.requested_days * 86400000).toISOString()
                : r.due_at,
          }
        : r,
    );
    try {
      await decideExtension(manuscriptId, row.id, { status });
    } catch {
      /* offline — the local record still reflects the editor's decision */
    }
    saveAssignments(manuscriptId, next);
    setRows(next);
    setFlash(status === 'granted' ? 'Extension granted; the deadline has moved.' : 'Extension refused.');
    setBusy(false);
  };

  return (
    <div className="card">
      <style>{`
        .rp-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--ink-100); flex-wrap: wrap; }
        .rp-row:last-child { border-bottom: none; }
        .rp-name { font-weight: 600; color: var(--navy-900); font-size: 13.5px; }
        .rp-status { font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 99px; }
        .rp-spacer { margin-left: auto; }
        .rp-ext { width: 100%; margin-top: 8px; padding: 12px 14px; background: var(--amber-50); border-left: 3px solid var(--amber-500); border-radius: var(--r-md); font-size: 12.5px; color: var(--amber-800); line-height: 1.55; }
        .rp-cand { display: flex; gap: 12px; align-items: flex-start; border: 1.5px solid var(--ink-200); border-radius: var(--r-md); padding: 13px 15px; background: var(--white); cursor: pointer; margin-bottom: 9px; transition: all var(--t-fast); }
        .rp-cand:hover { border-color: var(--navy-700); }
        .rp-cand.selected { border-color: var(--navy-900); background: var(--navy-100); }
        .rp-cand.blocked { opacity: .55; cursor: not-allowed; }
        .rp-cand-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .rp-cand-head { display: flex; align-items: baseline; gap: 10px; }
        .rp-cand-name { font-weight: 600; font-size: 13.5px; color: var(--navy-900); }
        .rp-cand-score { margin-left: auto; font-family: var(--font-display); font-size: 17px; font-weight: 500; color: var(--teal-700); }
        .rp-cand-meta { font-size: 12px; color: var(--ink-600); }
        .rp-cand-reasons { font-size: 12px; color: var(--ink-700); }
        .rp-cand-facts { display: flex; gap: 12px; align-items: center; font-size: 11.5px; margin-top: 2px; }
        .rp-tag { padding: 2px 8px; border-radius: 99px; font-weight: 700; font-size: 11px; }
        .rp-conflict { font-size: 12px; color: var(--red-800); font-weight: 600; }
        .rp-cand-note { font-size: 12px; color: var(--ink-600); font-style: italic; }
        .rp-flash { margin-top: 12px; padding: 10px 13px; background: var(--ink-50); border-radius: var(--r-md); font-size: 12.5px; color: var(--navy-900); }
      `}</style>

      <div className="card-header">
        <div>
          <div className="card-title">Reviewer panel</div>
          <div className="card-meta">
            {all.length === 0
              ? 'Nobody invited yet.'
              : `${all.length} on this manuscript · ${all.filter(a => a.status === 'submitted').length} submitted`}
          </div>
        </div>
        {!isAdmin && !inviting && (
          <button className="btn btn-ghost btn-sm" onClick={() => setInviting(true)}>
            + Invite reviewers
          </button>
        )}
      </div>

      {all.length === 0 && !inviting && (
        <div className="card-meta">
          A manuscript with no reviewers can still be desk rejected, but it cannot be
          accepted or sent back for revision.
        </div>
      )}

      {all.map(row => (
        <div className="rp-row" key={row.id}>
          <span className="rp-name">{row.name}</span>
          {row.round > 1 && <span className="muted" style={{ fontSize: 12 }}>round {row.round}</span>}
          <span className="rp-status" style={{ background: STATUS_TONE[row.status]?.bg, color: STATUS_TONE[row.status]?.fg }}>
            {STATUS_LABELS[row.status]}
          </span>
          {row.status === 'accepted' && row.due_at && (
            <span style={{ fontSize: 12.5 }}><DeadlineText iso={row.due_at} /></span>
          )}
          {row.status === 'invited' && row.invited_at && (
            <span className="muted" style={{ fontSize: 12.5 }}>invited {formatDate(row.invited_at)}</span>
          )}

          {!isAdmin && (row.status === 'invited' || row.status === 'accepted') && !row.seeded && (
            <span className="rp-spacer">
              <button className="btn btn-ghost btn-sm" onClick={() => remind(row)} disabled={busy}>
                Send reminder
              </button>
            </span>
          )}

          {row.extension?.status === 'pending' && (
            <div className="rp-ext">
              <strong>Extension requested:</strong> {row.extension.requested_days} extra days.
              {row.extension.reason && <> “{row.extension.reason}”</>}
              {!isAdmin && (
                <div className="row" style={{ marginTop: 10, gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => resolveExtension(row, 'granted')} disabled={busy}>
                    Grant
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => resolveExtension(row, 'refused')} disabled={busy}>
                    Refuse
                  </button>
                </div>
              )}
            </div>
          )}
          {row.extension?.status === 'granted' && (
            <div className="rp-ext">Extension granted — {row.extension.requested_days} days added.</div>
          )}
        </div>
      ))}

      {inviting && (
        <div style={{ marginTop: 18 }}>
          <div className="field-label">Recommended reviewers</div>
          <div className="field-hint" style={{ marginTop: 0, marginBottom: 12 }}>
            Ranked by fit. The score is a suggestion — read the reasons, and check the
            conflicts before inviting anyone.
          </div>

          {!candidatesLoaded && <div className="card-meta">Loading candidates…</div>}
          {rankedCandidates.map(c => (
            <CandidateRow
              key={c.id}
              candidate={c}
              checked={picked.includes(c.id)}
              onToggle={toggle}
              alreadyOn={onCurrentRound.has(c.id)}
              priorRound={priorRoundByReviewerId.get(c.id)}
            />
          ))}

          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={invite} disabled={busy || picked.length === 0}>
              {busy ? 'Inviting…' : `Invite ${picked.length || ''}`.trim()}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setInviting(false); setPicked([]); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {flash && <div className="rp-flash">{flash}</div>}
    </div>
  );
}
