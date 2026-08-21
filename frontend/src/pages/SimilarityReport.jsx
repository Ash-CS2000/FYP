// src/pages/SimilarityReport.jsx
// The full similarity report for one manuscript: overall score, every matched
// source, and the aligned passages behind each one. Editors act on it; admins get
// the same screen read-only. Reviewers never reach it — a report names the matched
// sources, which would break double-blind.
//
// The report shape and the endpoints live in data/similarity.js and
// api/similarity.js. Nothing here recomputes a percentage.

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { MANUSCRIPTS } from '../data/reviews.js';
import {
  reportFor,
  bandFor,
  thresholdsFrom,
  loadLocalSettings,
  formatCheckedAt,
  BAND_LABELS,
  BAND_HINTS,
  SIMILARITY_TONE,
  SOURCE_TYPE_LABELS,
} from '../data/similarity.js';

function SourceCard({ source, rank }) {
  const [open, setOpen] = useState(rank === 1);
  return (
    <div className="sim-source">
      <button className="sim-source-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="sim-rank">{rank}</span>
        <span className="sim-source-main">
          <span className="sim-source-title">{source.title}</span>
          <span className="sim-source-meta">
            {SOURCE_TYPE_LABELS[source.source_type] || source.source_type}
            {source.url && <> · <span className="sim-url">{source.url}</span></>}
            {' · '}{source.matched_chars.toLocaleString()} characters matched
          </span>
        </span>
        <span className="sim-source-pct">{source.similarity_pct}%</span>
        <span className={`sim-chevron ${open ? 'open' : ''}`}>›</span>
      </button>

      <div className="progress" style={{ '--accent': 'var(--navy-700)', margin: '2px 0 0' }}>
        <div className="progress-fill" style={{ width: `${Math.min(source.similarity_pct, 100)}%` }}></div>
      </div>

      {open && (
        <div className="sim-passages">
          {source.passages.length === 0 && (
            <p className="sim-muted">No passages available for this source.</p>
          )}
          {source.passages.map((p, i) => (
            <div className="sim-passage" key={i}>
              <div className="sim-side">
                <h5>This manuscript</h5>
                <p>{p.query_excerpt}</p>
              </div>
              <div className="sim-side sim-side-source">
                <h5>Matched source</h5>
                <p>{p.source_excerpt}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SimilarityReport({ role = 'editor' }) {
  const { id } = useParams();
  const isAdmin = role === 'admin';
  const backTo = isAdmin ? '/admin/submissions' : '/editor/submissions';

  const manuscript = MANUSCRIPTS[id];
  const report = reportFor(id);
  const settings = loadLocalSettings();

  // Exclusions start from what the server already applied to this report. Changing
  // one re-requests the report server-side (getReport takes them as query params);
  // until /api/analysis/ exists they only reflect intent in the UI.
  const [exclusions, setExclusions] = useState(() => ({
    quotes: report?.exclusions?.quotes ?? settings.exclude_quotes,
    bibliography: report?.exclusions?.bibliography ?? settings.exclude_bibliography,
    minWords: report?.exclusions?.min_words ?? settings.min_words,
  }));

  if (!manuscript) {
    return (
      <AppShell role={role} searchPlaceholder="Search submissions...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">{isAdmin ? 'Oversight' : 'Editorial'}</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>Manuscript not found.</h1>
            <p className="page-subtitle">No manuscript matches that reference.</p>
          </div>
          <Link to={backTo} className="btn btn-ghost btn-sm">Back to submissions</Link>
        </div>
      </AppShell>
    );
  }

  const thresholds = thresholdsFrom(settings);
  const band = report?.status === 'done' ? bandFor(report.overall_similarity_pct, thresholds) : null;
  const tone = band ? SIMILARITY_TONE[band] : null;

  return (
    <AppShell role={role} searchPlaceholder="Search submissions...">
      <style>{`
        .sim-hero { display: flex; gap: 28px; align-items: center; flex-wrap: wrap; }
        .sim-dial { width: 132px; height: 132px; border-radius: 50%; display: flex; flex-direction: column;
                    align-items: center; justify-content: center; flex-shrink: 0; }
        .sim-dial-pct { font-family: var(--font-display); font-size: 34px; font-weight: 500; line-height: 1; letter-spacing: -0.02em; }
        .sim-dial-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-top: 6px; }
        .sim-hero-body { flex: 1; min-width: 260px; }
        .sim-hero-body h3 { font-size: 15px; font-weight: 600; color: var(--navy-900); margin-bottom: 6px; }
        .sim-hero-body p { font-size: 13.5px; color: var(--ink-700); line-height: 1.6; }
        .sim-facts { display: flex; gap: 22px; flex-wrap: wrap; margin-top: 14px; }
        .sim-fact-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-600); font-weight: 600; }
        .sim-fact-value { font-size: 13.5px; color: var(--navy-900); font-weight: 500; margin-top: 2px; }
        .sim-caveat { margin-top: 16px; padding: 12px 14px; background: var(--ink-50); border-radius: var(--r-md);
                      font-size: 12.5px; color: var(--ink-700); line-height: 1.55; }
        .sim-source { border: 1px solid var(--ink-200); border-radius: var(--r-lg); padding: 16px 18px 14px; margin-bottom: 12px; background: var(--white); }
        .sim-source-head { display: flex; align-items: center; gap: 14px; width: 100%; background: none; border: 0;
                           padding: 0 0 12px; text-align: left; cursor: pointer; }
        .sim-rank { width: 26px; height: 26px; border-radius: 50%; background: var(--ink-100); color: var(--navy-900);
                    font-size: 12.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sim-source-main { flex: 1; min-width: 0; }
        .sim-source-title { display: block; font-size: 14.5px; font-weight: 600; color: var(--navy-900); line-height: 1.35; }
        .sim-source-meta { display: block; font-size: 12px; color: var(--ink-500); margin-top: 3px; }
        .sim-url { word-break: break-all; }
        .sim-source-pct { font-family: var(--font-display); font-size: 20px; font-weight: 500; color: var(--navy-900); flex-shrink: 0; }
        .sim-chevron { font-size: 20px; color: var(--ink-500); transition: transform var(--t-fast); flex-shrink: 0; }
        .sim-chevron.open { transform: rotate(90deg); }
        .sim-passages { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--ink-100); }
        .sim-passage { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .sim-side { background: var(--ink-50); border-radius: var(--r-md); padding: 12px 14px; }
        .sim-side-source { background: var(--amber-50); }
        .sim-side h5 { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-600);
                       font-weight: 700; margin-bottom: 6px; }
        .sim-side p { font-size: 13px; color: var(--navy-900); line-height: 1.6; }
        .sim-excl { display: flex; gap: 20px; flex-wrap: wrap; align-items: center; }
        .sim-excl label { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-800); cursor: pointer; }
        .sim-muted { font-size: 13px; color: var(--ink-600); font-style: italic; }
        .sim-empty { padding: 28px; text-align: center; color: var(--ink-600); font-size: 13.5px; }
        @media (max-width: 720px) { .sim-passage { grid-template-columns: 1fr; } }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">{isAdmin ? 'Oversight' : 'Editorial'} · {manuscript.id}</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Similarity for <em className="serif-italic">{manuscript.title}</em>.
          </h1>
          <p className="page-subtitle">
            {manuscript.category} · Submitted {manuscript.submitted}
          </p>
        </div>
        <div className="row">
          <Link to={`${isAdmin ? '/admin' : '/editor'}/submissions/${manuscript.id}/reviews`} className="btn btn-ghost btn-sm">
            View reviews
          </Link>
          <Link to={backTo} className="btn btn-ghost btn-sm">Back to submissions</Link>
        </div>
      </div>

      {isAdmin && (
        <div className="lms-banner is-todo fade-up">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
          <span>Oversight view, read only. Screening decisions belong to the editor.</span>
        </div>
      )}

      {!report && (
        <div className="card fade-up delay-1">
          <div className="sim-empty">
            No originality check has been run for this manuscript yet.
            {!isAdmin && <div style={{ marginTop: 14 }}><button className="btn btn-primary btn-sm">Run check</button></div>}
          </div>
        </div>
      )}

      {report?.status === 'failed' && (
        <div className="card fade-up delay-1">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ color: 'var(--red-800)' }}>Check failed</div>
              <div className="card-meta">Attempted {formatCheckedAt(report.checked_at)}</div>
            </div>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-800)', lineHeight: 1.6 }}>{report.error}</p>
          {!isAdmin && (
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-sm">Retry check</button>
            </div>
          )}
        </div>
      )}

      {(report?.status === 'queued' || report?.status === 'running') && (
        <div className="card fade-up delay-1">
          <div className="sim-empty">
            The originality check is {report.status === 'queued' ? 'queued' : 'running'}. This usually takes under a minute.
          </div>
        </div>
      )}

      {report?.status === 'done' && (
        <>
          <div className="card fade-up delay-1">
            <div className="sim-hero">
              <div className="sim-dial" style={{ background: tone.bg, color: tone.fg }}>
                <span className="sim-dial-pct">{report.overall_similarity_pct}%</span>
                <span className="sim-dial-label">{BAND_LABELS[band]}</span>
              </div>
              <div className="sim-hero-body">
                <h3>Overall similarity across {report.sources.length} source{report.sources.length === 1 ? '' : 's'}</h3>
                <p>{BAND_HINTS[band]}</p>
                <div className="sim-facts">
                  <div>
                    <div className="sim-fact-label">Checked</div>
                    <div className="sim-fact-value">{formatCheckedAt(report.checked_at)}</div>
                  </div>
                  <div>
                    <div className="sim-fact-label">Engine</div>
                    <div className="sim-fact-value">{report.engine_version}</div>
                  </div>
                  <div>
                    <div className="sim-fact-label">Flag threshold</div>
                    <div className="sim-fact-value">{thresholds.high}%</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="sim-caveat">
              This score measures <strong>verbatim and near-verbatim text reuse</strong> only. Quotations,
              standard methods wording and reference lists all contribute to it, and paraphrased or
              translated material is not detected at all. Treat it as a prompt to read the passages
              below, not as a finding.
            </div>
          </div>

          <div className="card fade-up delay-2">
            <div className="card-header">
              <div>
                <div className="card-title">Exclusions</div>
                <div className="card-meta">What was left out when the score was calculated.</div>
              </div>
            </div>
            <div className="sim-excl">
              <label>
                <input
                  type="checkbox"
                  checked={exclusions.quotes}
                  disabled={isAdmin}
                  onChange={e => setExclusions(x => ({ ...x, quotes: e.target.checked }))}
                />
                Exclude quotations
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={exclusions.bibliography}
                  disabled={isAdmin}
                  onChange={e => setExclusions(x => ({ ...x, bibliography: e.target.checked }))}
                />
                Exclude bibliography
              </label>
              <label>
                Ignore matches under
                <input
                  className="field-input"
                  type="number"
                  min="1"
                  max="60"
                  style={{ width: 72, padding: '6px 8px' }}
                  value={exclusions.minWords}
                  disabled={isAdmin}
                  onChange={e => setExclusions(x => ({ ...x, minWords: Number(e.target.value) }))}
                />
                words
              </label>
              {!isAdmin && <button className="btn btn-ghost btn-sm">Recalculate</button>}
            </div>
          </div>

          <div className="card fade-up delay-3">
            <div className="card-header">
              <div>
                <div className="card-title">Matched sources</div>
                <div className="card-meta">Highest overlap first. Expand a source to compare the passages.</div>
              </div>
            </div>
            {report.sources.length === 0 && (
              <div className="sim-empty">No sources matched above the current exclusion settings.</div>
            )}
            {report.sources.map((s, i) => (
              <SourceCard key={s.id} source={s} rank={i + 1} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
