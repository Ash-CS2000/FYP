import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { TOPICS, TOPIC_AREAS } from '../data/papers.js';

function StarRating({ rating }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="13"
          height="13"
          viewBox="0 0 20 20"
          style={{ color: n <= rating ? '#f59e0b' : 'var(--ink-200)', fill: 'currentColor' }}
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function UserPapers() {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('All');

  const filteredTopics = useMemo(() => {
    const term = query.trim().toLowerCase();
    return TOPICS.filter((t) => {
      const matchesArea = area === 'All' || t.area === area;
      const searchable = [t.topic, t.summary, t.area, t.institution, ...t.keywords]
        .join(' ')
        .toLowerCase();
      return matchesArea && (!term || searchable.includes(term));
    });
  }, [query, area]);

  return (
    <AppShell role="author" searchPlaceholder="Search research topics...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Research Discovery</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Explore research topics.</h1>
          <p className="page-subtitle">Browse summaries of peer-reviewed research to inspire your own original work.</p>
        </div>
      </div>

      <div className="card fade-up delay-1" style={{ marginBottom: 22 }}>
        <div className="field-grid">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Search topics</label>
            <input
              className="field-input"
              type="search"
              placeholder="Search by topic, keyword, or institution..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Research Area</label>
            <select className="field-select" value={area} onChange={(e) => setArea(e.target.value)}>
              {TOPIC_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="portal-toolbar">
        <div>
          <div className="card-title">
            {filteredTopics.length} research {filteredTopics.length === 1 ? 'topic' : 'topics'} found
          </div>
          <div className="card-meta">Summaries only — full documents are not available for download.</div>
        </div>
      </div>

      <div className="topic-feed fade-up delay-2">
        <style>{`
          .topic-feed {
            border: 1px solid var(--ink-200);
            border-radius: var(--r-lg);
            overflow: hidden;
            background: var(--white);
          }
          .topic-entry {
            padding: 20px 24px;
            border-bottom: 1px solid var(--ink-100);
            transition: background 0.12s;
          }
          .topic-entry:last-child { border-bottom: none; }
          .topic-entry:hover { background: var(--ink-50); }
          .topic-entry-title {
            font-size: 15px;
            font-weight: 600;
            color: var(--navy-800, #1e3a5f);
            margin-bottom: 6px;
            line-height: 1.35;
          }
          .topic-entry-summary {
            font-size: 13.5px;
            color: var(--ink-700);
            line-height: 1.65;
            margin-bottom: 10px;
          }
          .topic-entry-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-bottom: 12px;
          }
          .topic-tag {
            background: var(--ink-100);
            color: var(--ink-600);
            font-size: 11.5px;
            padding: 3px 8px;
            border-radius: var(--r-pill);
          }
          .topic-entry-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
          }
          .topic-attribution {
            font-size: 12.5px;
            color: var(--ink-500);
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .topic-attribution-sep { color: var(--ink-300); }
          .topic-empty {
            padding: 56px 24px;
            text-align: center;
            color: var(--ink-500);
            font-size: 14px;
          }
        `}</style>

        {filteredTopics.length === 0 ? (
          <div className="topic-empty">No topics match your search. Try different keywords or clear the area filter.</div>
        ) : (
          filteredTopics.map((t) => (
            <article className="topic-entry" key={t.id}>
              <div className="topic-entry-title">{t.topic}</div>
              <p className="topic-entry-summary">{t.summary}</p>
              <div className="topic-entry-tags">
                {t.keywords.map((kw) => (
                  <span key={kw} className="topic-tag">{kw}</span>
                ))}
              </div>
              <div className="topic-entry-footer">
                <span className="topic-attribution">
                  <span>{t.institution}</span>
                  <span className="topic-attribution-sep">·</span>
                  <span>{t.level} level</span>
                  <span className="topic-attribution-sep">·</span>
                  <span>{t.year}</span>
                </span>
                <StarRating rating={t.rating} />
              </div>
            </article>
          ))
        )}
      </div>
    </AppShell>
  );
}
