import { useState } from 'react';

// One externally-published paper on Discover Topics.
//
// Deliberately NOT components/TopicCard.jsx, which renders our own published
// manuscripts on /search. That card is documented as linking nowhere, because
// our library has no DOIs and there is no single-paper page to link to. An
// external work is the opposite: the DOI is the only useful destination, and
// sending a reader to a PaperBridge route for a paper we did not publish would
// be actively misleading. Two different objects, two cards — bending TopicCard
// to cover both would have put a conditional link into the page that shows our
// own reviewed work.
//
// Collapsed: title, authors, venue · year, citations. Expanded: the full
// abstract. Nothing here costs a request — the list endpoint already sent it.

function citeLabel(n) {
  if (!n) return 'Not yet cited';
  if (n === 1) return '1 citation';
  return `${n.toLocaleString()} citations`;
}

export default function WorkCard({ work }) {
  const [open, setOpen] = useState(false);

  const authors = work.authors || [];
  // A paper with 80 authors would otherwise push the title off screen.
  const shownAuthors = authors.slice(0, 4);
  const moreAuthors = authors.length - shownAuthors.length;

  const meta = [work.venue, work.year].filter(Boolean);
  const hasAbstract = Boolean(work.abstract);

  return (
    <article className={`wk${open ? ' wk-open' : ''}`}>
      <button
        type="button"
        className="wk-head"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <div className="wk-head-text">
          <h3 className="wk-title">{work.title}</h3>

          {authors.length > 0 && (
            <div className="wk-authors">
              {shownAuthors.join(', ')}
              {moreAuthors > 0 && <span className="muted"> +{moreAuthors} more</span>}
            </div>
          )}

          {!open && hasAbstract && <p className="wk-snippet">{work.abstract}</p>}

          <div className="wk-meta">
            {meta.map((m, i) => (
              <span key={m}>{i > 0 && <span className="wk-sep">·</span>}{m}</span>
            ))}
            <span className="wk-sep">·</span>
            <span>{citeLabel(work.cited_by_count)}</span>
            {work.is_open_access && <span className="pill pill-approved wk-oa">Open access</span>}
          </div>
        </div>
        <svg className="wk-chev" viewBox="0 0 24 24" width="16" height="16" fill="none"
             stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="wk-body">
          {hasAbstract ? (
            <p className="wk-abstract">{work.abstract}</p>
          ) : (
            // Common, and worth saying plainly rather than leaving a blank gap:
            // OpenAlex holds no abstract for a large share of older records.
            <p className="wk-abstract muted">No abstract available for this record.</p>
          )}

          {(work.institutions || []).length > 0 && (
            <div className="wk-insts">{work.institutions.join(' · ')}</div>
          )}

          {work.doi ? (
            <a className="btn btn-ghost btn-sm wk-doi" href={work.doi}
               target="_blank" rel="noopener noreferrer">
              Read at publisher
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
                   stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          ) : (
            <div className="field-hint">No DOI recorded for this work.</div>
          )}
        </div>
      )}
    </article>
  );
}
