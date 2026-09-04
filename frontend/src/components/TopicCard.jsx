// src/components/TopicCard.jsx
//
// One published paper in the research library, collapsed or expanded. Shared by
// the author's Discover page and the public /search results, which previously
// rendered near-identical markup under two sets of class names — including
// .topic-attribution and .topic-attribution-sep, which were declared in both
// pages with different rules and silently fought over the global namespace.
// One component, one definition.
//
// Collapsed, the card shows what it always showed: title, a three-line slice of
// the abstract, and institution · area · year. That is enough to skim.
// Expanded, it shows the rest of what the list endpoint already sent — the full
// abstract, every author, every institution, the article type and the exact
// publication date. None of that costs a request; the data is already here.
//
// What it deliberately does NOT do is link anywhere. The library serves
// summaries only, the endpoint behind it never returns a file URL, and there is
// no DOI, citation export or reading list in the system to link to. When there
// is, a real single-paper page earns its place; until then a page would just
// repeat this card with more whitespace.

import { useState } from 'react';
import { topicDate, topicMeta } from '../data/topics.js';

export default function TopicCard({ topic, onKeywordClick }) {
  // Per-card state, following SourceCard in pages/SimilarityReport.jsx — the
  // codebase's only other accordion. Cards are keyed by topic.id, so an open
  // card stays open when the list re-filters around it, and any number may be
  // open at once.
  const [open, setOpen] = useState(false);

  const meta = topicMeta(topic);
  const typeLine = [topic.article_type, topic.category, topic.sub_category].filter(Boolean);
  const published = topicDate(topic);

  return (
    <article className="topic-entry">
      <style>{`
        .topic-entry { border-bottom: 1px solid var(--ink-100); transition: background 0.12s; }
        .topic-entry:last-child { border-bottom: none; }
        .topic-entry:hover { background: var(--ink-50); }
        .topic-head {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          width: 100%;
          background: none;
          border: 0;
          padding: 20px 24px;
          text-align: left;
          cursor: pointer;
          font: inherit;
        }
        .topic-head-main { flex: 1; min-width: 0; }
        .topic-entry-title {
          display: block;
          font-size: 15px;
          font-weight: 600;
          color: var(--navy-800, #1e3a5f);
          margin-bottom: 6px;
          line-height: 1.35;
        }
        .topic-entry-summary {
          display: block;
          font-size: 13.5px;
          color: var(--ink-700);
          line-height: 1.65;
          margin-bottom: 10px;
        }
        /* Collapsed only — expanding is the whole point, so the clamp lifts.
           The display must be set here and NOT inline on the element: an inline
           display:block beats this rule and the clamp silently does nothing. */
        .topic-entry-summary.clamped {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .topic-attribution {
          font-size: 12.5px;
          color: var(--ink-500);
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .topic-attribution-sep { color: var(--ink-300); }
        .topic-chevron {
          font-size: 20px;
          color: var(--ink-500);
          transition: transform var(--t-fast);
          flex-shrink: 0;
          line-height: 1;
        }
        .topic-chevron.open { transform: rotate(90deg); }

        .topic-body { padding: 0 24px 22px; }
        .topic-section { margin-bottom: 16px; }
        .topic-section:last-child { margin-bottom: 0; }
        .topic-section h4 {
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--ink-600);
          font-weight: 700;
          margin-bottom: 6px;
        }
        .topic-section p, .topic-section li {
          font-size: 13.5px;
          color: var(--ink-700);
          line-height: 1.7;
        }
        .topic-authors { list-style: none; padding: 0; margin: 0; }
        .topic-authors li { color: var(--navy-900); font-weight: 500; }
        .topic-affil { color: var(--ink-500); font-size: 12.5px; margin-top: 4px; }
        .topic-entry-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .topic-tag {
          background: var(--ink-100);
          color: var(--ink-600);
          font-size: 11.5px;
          padding: 3px 8px;
          border-radius: var(--r-pill);
          border: 0;
          font-family: inherit;
        }
        button.topic-tag { cursor: pointer; }
        button.topic-tag:hover { background: var(--ink-200); color: var(--navy-900); }
      `}</style>

      <button
        type="button"
        className="topic-head"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="topic-head-main">
          <span className="topic-entry-title">{topic.title}</span>
          <span className={`topic-entry-summary${open ? '' : ' clamped'}`}>
            {topic.abstract}
          </span>
          {!open && meta.length > 0 && (
            <span className="topic-attribution">
              {meta.map((part, i) => (
                <span key={part} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  {i > 0 && <span className="topic-attribution-sep">·</span>}
                  <span>{part}</span>
                </span>
              ))}
            </span>
          )}
        </span>
        <span className={`topic-chevron ${open ? 'open' : ''}`} aria-hidden="true">›</span>
      </button>

      {/* Outside the header button on purpose: the keyword tags are buttons of
          their own, and a button nested inside a button is invalid HTML. */}
      {open && (
        <div className="topic-body">
          {typeLine.length > 0 && (
            <div className="topic-section">
              <span className="topic-attribution">
                {typeLine.map((part, i) => (
                  <span key={part} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    {i > 0 && <span className="topic-attribution-sep">·</span>}
                    <span>{part}</span>
                  </span>
                ))}
              </span>
            </div>
          )}

          {topic.authors?.length > 0 && (
            <div className="topic-section">
              <h4>{topic.authors.length === 1 ? 'Author' : 'Authors'}</h4>
              <ul className="topic-authors">
                {topic.authors.map((name) => <li key={name}>{name}</li>)}
              </ul>
              {topic.institutions?.length > 0 && (
                <div className="topic-affil">{topic.institutions.join(' · ')}</div>
              )}
            </div>
          )}

          {topic.keywords?.length > 0 && (
            <div className="topic-section">
              <h4>Keywords</h4>
              <div className="topic-entry-tags">
                {topic.keywords.map((kw) => (
                  onKeywordClick ? (
                    <button
                      key={kw}
                      type="button"
                      className="topic-tag"
                      // Without this the click bubbles to the header and
                      // collapses the card the reader just opened.
                      onClick={(e) => { e.stopPropagation(); onKeywordClick(kw); }}
                      title={`Search "${kw}"`}
                    >
                      {kw}
                    </button>
                  ) : (
                    <span key={kw} className="topic-tag">{kw}</span>
                  )
                ))}
              </div>
            </div>
          )}

          {published && (
            <div className="topic-section">
              <h4>Published</h4>
              <p>{published}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
