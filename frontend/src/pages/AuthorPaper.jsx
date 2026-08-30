// src/pages/AuthorPaper.jsx
// One of the author's own papers: where it stands, the decision (if one has
// been made), and the originality check result. Reviewer comments are NOT
// wired to a real backend yet — there is no reviews API on the Manuscript
// model as of this writing, so that section is shown as "not available yet"
// rather than faked from mock data.
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
//   · similarity report: shown below, sourced live from
//     /api/manuscripts/<id>/plagiarism-status/ — the author's own check only,
//     scoped server-side to manuscripts they own
//   · decision letter: shown below, sourced live from
//     /api/manuscripts/<id>/decision/ — same double-blind allow-list the editor
//     side reads from, see data/editorial.js

import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { getManuscript } from '../api/manuscripts.js';
import { withdrawalFor, saveWithdrawal, WITHDRAW_REASONS } from '../data/drafts.js';
import { withdrawSubmission } from '../api/submissions.js';
import { getPlagiarismStatus, pollPlagiarismStatus } from '../api/similarity.js';
import { bandFor, DEFAULT_THRESHOLDS, BAND_LABELS, BAND_HINTS, SIMILARITY_TONE } from '../data/similarity.js';
import { TERMINAL_STATUSES, statusLabel, statusPillClass } from '../data/manuscriptStatus.js';
import { getDecision } from '../api/editorial.js';
import { DECISION_LABELS, DECISION_TONE, formatDecidedAt } from '../data/editorial.js';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function normalizeSimilarityScore(check) {
  const raw = check?.similarity_score ?? check?.report?.overall_similarity_pct;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function formatSimilarityScore(pct) {
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

// Withdrawal, and the rule that governs it: an author may withdraw right up
// until the paper is finally decided. After accept or reject there is nothing to
// withdraw from.
function WithdrawCard({ manuscript }) {
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
            <div className="card-meta">{formatDate(record.withdrawn_at)}</div>
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

// Originality check result, live from the backend. No mock fallback: loading,
// none, pending, completed and failed are the only states — each renders only
// what the API actually returned.
function OriginalityCard({ manuscriptId }) {
  const [state, setState] = useState('loading'); // loading | none | pending | completed | failed
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const initial = await getPlagiarismStatus(manuscriptId);
        if (controller.signal.aborted) return;
        setData(initial);
        if (initial.status === 'pending') {
          setState('pending');
          const final = await pollPlagiarismStatus(manuscriptId, {
            onUpdate: (s) => !controller.signal.aborted && setData(s),
            signal: controller.signal,
          });
          if (!controller.signal.aborted) { setData(final); setState(final.status); }
        } else {
          setState(initial.status);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err.status === 404) setState('none');
        else { setData({ error_message: err.message }); setState('failed'); }
      }
    })();

    return () => controller.abort();
  }, [manuscriptId]);

  if (state === 'loading') {
    return (
      <div className="card">
        <div className="card-header"><div className="card-title">Originality check</div></div>
        <div className="card-meta">Loading…</div>
      </div>
    );
  }

  if (state === 'none') return null;

  if (state === 'pending') {
    return (
      <div className="card">
        <div className="card-header"><div className="card-title">Originality check</div></div>
        <div className="card-meta">
          {data?.polling_timed_out
            ? 'Still running on the server. You can refresh this page later to pick up the result.'
            : 'Still running — this can take a couple of minutes on larger PDFs.'}
        </div>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="card">
        <div className="card-header"><div className="card-title">Originality check</div></div>
        <div className="card-meta" style={{ color: 'var(--red-800)' }}>
          {data?.error_message || 'The check could not be completed.'}
        </div>
      </div>
    );
  }

  const pct = normalizeSimilarityScore(data);
  const band = pct != null ? bandFor(pct, DEFAULT_THRESHOLDS) : null;
  const tone = band ? SIMILARITY_TONE[band] : null;
  const report = data?.report || {};
  const sources = Array.isArray(report.sources) ? report.sources : [];

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Originality check</div></div>

      {pct != null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={{
            padding: '6px 14px', borderRadius: 'var(--r-pill)', fontSize: 17, fontWeight: 700,
            background: tone.bg, color: tone.fg,
          }}>
            {formatSimilarityScore(pct)}%
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy-900)' }}>{BAND_LABELS[band]}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>{BAND_HINTS[band]}</div>
          </div>
        </div>
      ) : (
        <div className="card-meta" style={{ marginBottom: 14 }}>No score returned.</div>
      )}

      {report.coverage === 'partial' && (
        <div className="card-meta" style={{ marginBottom: 12 }}>
          Partial check{report.checked_chunks != null && report.total_chunks != null
            ? ` — ${report.checked_chunks} of ${report.total_chunks} sections compared`
            : ''}
          {report.coverage_reason ? ` (${report.coverage_reason.replace(/_/g, ' ')})` : ''}.
        </div>
      )}

      {sources.length > 0 && (
        <div style={{ borderTop: '1px solid var(--ink-100)', paddingTop: 12 }}>
          <div className="label" style={{ marginBottom: 8 }}>Matched sources</div>
          {sources.map((src, i) => (
            <div key={src.id ?? i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 13, marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: 'var(--navy-900)', minWidth: 44 }}>
                {src.similarity_pct ?? src.match_pct ?? '—'}%
              </span>
              <span style={{ color: 'var(--ink-800)' }}>{src.title ?? src.name ?? src.url ?? 'Unnamed source'}</span>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.55, marginTop: 12, marginBottom: 0 }}>
        This measures verbatim text reuse only. It is a prompt to check your citations, not a
        finding about your work.
      </p>
    </div>
  );
}

// The decision letter, live from the backend. Same state-machine shape as
// OriginalityCard: loading, none, ready and failed are the only states.
function DecisionCard({ manuscriptId }) {
  const [state, setState] = useState('loading'); // loading | none | ready | failed
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getDecision(manuscriptId)
      .then(d => { if (!controller.signal.aborted) { setDecision(d); setState('ready'); } })
      .catch(err => {
        if (controller.signal.aborted) return;
        if (err.status === 404) setState('none');
        else { setError(err.message || 'Could not load the decision.'); setState('failed'); }
      });
    return () => controller.abort();
  }, [manuscriptId]);

  if (state === 'loading') {
    return (
      <div className="card">
        <div className="card-header"><div className="card-title">Decision letter</div></div>
        <div className="card-meta">Loading…</div>
      </div>
    );
  }

  if (state === 'none') {
    return (
      <div className="card">
        <div className="card-header"><div className="card-title">Decision letter</div></div>
        <div className="card-meta">
          No decision yet — check back once your paper has moved through review.
        </div>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="card">
        <div className="card-header"><div className="card-title">Decision letter</div></div>
        <div className="card-meta" style={{ color: 'var(--red-800)' }}>{error}</div>
      </div>
    );
  }

  const tone = DECISION_TONE[decision.type];
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Decision letter</div>
          <div className="card-meta">{decision.decided_by} · {formatDecidedAt(decision.decided_at)}</div>
        </div>
        <span className="md-rec" style={{ background: tone?.bg, color: tone?.fg }}>
          {DECISION_LABELS[decision.type]}
        </span>
      </div>
      <div className="md-letter">{decision.letter}</div>
    </div>
  );
}

export default function AuthorPaper() {
  const { id } = useParams();
  const [manuscript, setManuscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    getManuscript(id)
      .then((m) => { if (!cancelled) setManuscript(m); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load this paper.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <AppShell role="author" searchPlaceholder="Search your papers...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Author Workspace</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>Loading…</h1>
          </div>
        </div>
      </AppShell>
    );
  }

  if (loadError || !manuscript) {
    return (
      <AppShell role="author" searchPlaceholder="Search your papers...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Author Workspace</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>Paper not found.</h1>
            <p className="page-subtitle">{loadError || 'No submission of yours matches that reference.'}</p>
          </div>
          <Link to="/author/papers" className="btn btn-ghost btn-sm">Back to my papers</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="author" searchPlaceholder="Search your papers...">
      <style>{`
        .ap-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; }
        .ap-meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-600); font-weight: 600; }
        .ap-meta-value { font-size: 13.5px; color: var(--navy-900); font-weight: 500; margin-top: 3px; }
        .md-rec { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 99px; }
        .md-letter { white-space: pre-wrap; font-size: 13.5px; line-height: 1.7; color: var(--navy-900); background: var(--ink-50); border-radius: var(--r-md); padding: 18px 20px; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Author Workspace · #{manuscript.id}</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            <em className="serif-italic">{manuscript.title}</em>.
          </h1>
          <p className="page-subtitle">
            {manuscript.category}{manuscript.sub_category ? ` · ${manuscript.sub_category}` : ''} · Submitted {formatDate(manuscript.submitted_at)}
          </p>
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
                <span className={`pill ${statusPillClass(manuscript.status)}`}>{statusLabel(manuscript.status)}</span>
              </div>
            </div>
            <div>
              <div className="ap-meta-label">Last updated</div>
              <div className="ap-meta-value">{formatDate(manuscript.updated_at)}</div>
            </div>
          </div>
        </div>

        <OriginalityCard manuscriptId={manuscript.id} />

        <DecisionCard manuscriptId={manuscript.id} />

        <WithdrawCard manuscript={manuscript} />
      </div>
    </AppShell>
  );
}
