// src/components/DecisionHistory.jsx
// The full audit trail on a manuscript: every decision the editor has taken,
// interleaved with every revision the author has resubmitted, newest first.
// Self-fetching, same pattern as OriginalityCard/DecisionCard — drop it in
// and give it a manuscriptId.

import { useEffect, useState } from 'react';
import { listDecisions } from '../api/editorial.js';
import { listRevisions } from '../api/revisions.js';
import { DECISION_LABELS, DECISION_TONE, formatDecidedAt, isFinal } from '../data/editorial.js';

// The decision itself. Exported so callers that only ever have the latest
// decision (not the full history) can still render it the same way.
export function DecisionEntry({ decision }) {
  const tone = DECISION_TONE[decision.type];
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Decision</div>
          <div className="card-meta">
            {decision.decided_by} · {formatDecidedAt(decision.decided_at)}
          </div>
        </div>
        <span className="md-rec" style={{ background: tone?.bg, color: tone?.fg }}>
          {DECISION_LABELS[decision.type]}
        </span>
      </div>
      <div className="md-letter">{decision.letter}</div>
      <div className="card-meta" style={{ marginTop: 12 }}>
        {isFinal(decision.type)
          ? 'This decision is final. The manuscript is closed.'
          : 'The author has been invited to revise and resubmit.'}
      </div>
    </div>
  );
}

function RevisionEntry({ revision }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Revision {revision.round} submitted</div>
          <div className="card-meta">{formatDecidedAt(revision.submitted_at)}</div>
        </div>
        {revision.file_url && (
          <a
            href={revision.file_url}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}
          >
            {revision.file_name || 'View file'} →
          </a>
        )}
      </div>
      {revision.response_letter && <div className="md-letter">{revision.response_letter}</div>}
    </div>
  );
}

export default function DecisionHistory({ manuscriptId }) {
  const [state, setState] = useState('loading'); // loading | ready | failed
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([listDecisions(manuscriptId), listRevisions(manuscriptId)])
      .then(([decisions, revisions]) => {
        if (cancelled) return;
        const merged = [
          ...decisions.map(d => ({ kind: 'decision', at: d.decided_at, data: d })),
          ...revisions.map(r => ({ kind: 'revision', at: r.submitted_at, data: r })),
        ].sort((a, b) => new Date(b.at) - new Date(a.at));
        setEntries(merged);
        setState('ready');
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message || 'Could not load the decision history.');
        setState('failed');
      });
    return () => { cancelled = true; };
  }, [manuscriptId]);

  if (state === 'loading') {
    return (
      <div className="card">
        <div className="card-header"><div className="card-title">Decision history</div></div>
        <div className="card-meta">Loading…</div>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="card">
        <div className="card-header"><div className="card-title">Decision history</div></div>
        <div className="card-meta" style={{ color: 'var(--red-800)' }}>{error}</div>
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <div className="gap-grid">
      {entries.length > 1 && (
        <div className="card-meta" style={{ padding: '0 4px' }}>
          {entries.length} rounds on this manuscript, newest first.
        </div>
      )}
      {entries.map(e => (
        e.kind === 'decision'
          ? <DecisionEntry key={`decision-${e.data.id}`} decision={e.data} />
          : <RevisionEntry key={`revision-${e.data.id}`} revision={e.data} />
      ))}
    </div>
  );
}
