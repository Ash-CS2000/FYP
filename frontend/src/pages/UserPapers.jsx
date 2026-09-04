// src/pages/UserPapers.jsx
// Discover Topics (/author/discover) — research from across the literature,
// sourced from OpenAlex.
//
// This page used to show our own published corpus. It no longer does, and that
// is the point. Two published papers cannot tell an author what their field is
// talking about, and mixing our reviewed work with fetched preprints in one list
// would blur the only thing a peer-review system has to be unambiguous about.
// Our library keeps its homes on /search and the landing page; this page is
// entirely external, and says so.
//
// Three states, driven by the URL (?field=&topic=) so Back moves between them
// and any view can be linked:
//
//   1. the 26 fields as a grid   — the landing state
//   2. topics within one field   — most-cited first, with activity counts
//   3. works under one topic     — each linking out to its DOI
//
// Search is submit-driven and server-side. The old page held the whole library
// in memory and filtered as you typed, which data/topics.js justifies because
// the corpus is small — an assumption that does not survive ~250 million works.

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import WorkCard from '../components/WorkCard.jsx';
import { listFields, listFieldTopics, listTopicWorks, searchWorks } from '../api/openalex.js';

const compact = (n) => {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
};

/**
 * Load-once-per-key async data with loading and error state.
 *
 * Every view on this page has the same shape — fetch on key change, ignore a
 * response that arrives after the key moved on — so it is written once here
 * rather than three times as near-identical useEffects.
 */
function useRemote(fetcher, key, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const run = useCallback(() => {
    if (!enabled) { setData(null); setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetcher()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Something went wrong.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // fetcher is recreated every render by design; key is what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(run, [run]);
  return { data, loading, error, retry: run };
}

function Loading({ label }) {
  return <div className="dv-state">{label}</div>;
}

function Failed({ message, onRetry }) {
  return (
    <div className="dv-state">
      <div className="alert alert-error" style={{ justifyContent: 'center' }}>{message}</div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>Try again</button>
    </div>
  );
}

export default function UserPapers() {
  const [params, setParams] = useSearchParams();
  const fieldId = params.get('field') || '';
  const topicId = params.get('topic') || '';
  const activeQuery = params.get('q') || '';

  const [queryInput, setQueryInput] = useState(activeQuery);
  const [sort, setSort] = useState('cited');

  // Keep the box in step when the URL changes underneath us — a Back press, or
  // clearing a search by navigating.
  useEffect(() => { setQueryInput(activeQuery); }, [activeQuery]);

  const searching = Boolean(activeQuery);

  const fields = useRemote(listFields, 'fields');
  const topics = useRemote(
    () => listFieldTopics(fieldId),
    `topics:${fieldId}`,
    Boolean(fieldId) && !searching,
  );
  const works = useRemote(
    () => listTopicWorks(topicId, { sort }),
    `works:${topicId}:${sort}`,
    Boolean(topicId) && !searching,
  );
  const results = useRemote(
    () => searchWorks({ q: activeQuery, field: fieldId, sort }),
    `search:${activeQuery}:${fieldId}:${sort}`,
    searching,
  );

  const field = (fields.data || []).find(f => f.id === fieldId);
  const topic = (topics.data || []).find(t => t.id === topicId);

  const go = (next) => setParams(
    Object.fromEntries(Object.entries(next).filter(([, v]) => v)),
    { replace: false },
  );

  const submitSearch = (e) => {
    e.preventDefault();
    const q = queryInput.trim();
    // Keep the field as a filter when searching from inside one; drop the topic,
    // which no longer describes what is on screen.
    go(q ? { q, field: fieldId } : { field: fieldId });
  };

  return (
    <AppShell role="author" searchPlaceholder="Search settings...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Research</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Discover <em className="serif-italic">topics</em>.
          </h1>
          <p className="page-subtitle">
            Published research from across the literature, via OpenAlex — to read around
            your subject and find an angle for your own paper. These papers are{' '}
            <strong>not</strong> peer-reviewed by PaperBridge.
          </p>
        </div>
      </div>

      {/* Breadcrumb doubles as the way back up. Rendered only once you are
          somewhere, so the landing state stays uncluttered. */}
      {(fieldId || searching) && (
        <nav className="dv-crumbs fade-up" aria-label="Breadcrumb">
          <button type="button" className="dv-crumb" onClick={() => go({})}>All fields</button>
          {field && (
            <>
              <span className="dv-crumb-sep">/</span>
              <button
                type="button"
                className="dv-crumb"
                onClick={() => go({ field: fieldId })}
                disabled={!topicId && !searching}
              >
                {field.name}
              </button>
            </>
          )}
          {topic && !searching && (
            <>
              <span className="dv-crumb-sep">/</span>
              <span className="dv-crumb dv-crumb-here">{topic.name}</span>
            </>
          )}
          {searching && (
            <>
              <span className="dv-crumb-sep">/</span>
              <span className="dv-crumb dv-crumb-here">“{activeQuery}”</span>
            </>
          )}
        </nav>
      )}

      <form className="dv-search fade-up" onSubmit={submitSearch}>
        <input
          className="field-input"
          value={queryInput}
          onChange={e => setQueryInput(e.target.value)}
          placeholder={field ? `Search within ${field.name}…` : 'Search the literature…'}
          aria-label="Search published research"
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={queryInput.trim().length < 2}>
          Search
        </button>
        {searching && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => go({ field: fieldId })}>
            Clear
          </button>
        )}
        {(searching || topicId) && (
          <select className="field-select dv-sort" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="cited">Most cited</option>
            <option value="recent">Most recent</option>
          </select>
        )}
      </form>

      <div className="fade-up delay-1">
        {/* ── Search results ─────────────────────────────────────────────── */}
        {searching && (
          results.loading ? <Loading label="Searching the literature…" />
          : results.error ? <Failed message={results.error} onRetry={results.retry} />
          : (results.data || []).length === 0
            ? <div className="dv-state">No papers matched “{activeQuery}”.</div>
            : (
              <>
                <div className="dv-count">
                  {results.data.length} result{results.data.length === 1 ? '' : 's'}
                  {field && <> in {field.name}</>}
                </div>
                <div className="dv-list">
                  {results.data.map(w => <WorkCard key={w.id} work={w} />)}
                </div>
              </>
            )
        )}

        {/* ── Works under a topic ────────────────────────────────────────── */}
        {!searching && topicId && (
          works.loading ? <Loading label="Loading papers…" />
          : works.error ? <Failed message={works.error} onRetry={works.retry} />
          : (
            <>
              {topic?.description && <p className="dv-topic-desc">{topic.description}</p>}
              <div className="dv-list">
                {(works.data || []).map(w => <WorkCard key={w.id} work={w} />)}
              </div>
            </>
          )
        )}

        {/* ── Topics in a field ──────────────────────────────────────────── */}
        {!searching && fieldId && !topicId && (
          topics.loading ? <Loading label="Loading topics…" />
          : topics.error ? <Failed message={topics.error} onRetry={topics.retry} />
          : (
            <>
              <div className="dv-count">
                Active research topics in {field?.name || 'this field'}, most cited first.
              </div>
              <div className="dv-topics">
                {(topics.data || []).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className="dv-topic"
                    onClick={() => go({ field: fieldId, topic: t.id })}
                  >
                    <span className="dv-topic-name">{t.name}</span>
                    {t.subfield && <span className="dv-topic-sub">{t.subfield}</span>}
                    <span className="dv-topic-counts">
                      {compact(t.works_count)} papers
                      <span className="wk-sep">·</span>
                      {compact(t.cited_by_count)} citations
                    </span>
                  </button>
                ))}
              </div>
            </>
          )
        )}

        {/* ── The 26 fields ──────────────────────────────────────────────── */}
        {!searching && !fieldId && (
          fields.loading ? <Loading label="Loading research fields…" />
          : fields.error ? <Failed message={fields.error} onRetry={fields.retry} />
          : (
            <div className="dv-fields">
              {(fields.data || []).map(f => (
                <button
                  key={f.id}
                  type="button"
                  className="dv-field"
                  onClick={() => go({ field: f.id })}
                >
                  <span className="dv-field-domain">{f.domain}</span>
                  <span className="dv-field-name">{f.name}</span>
                  <span className="dv-field-count">{compact(f.works_count)} papers</span>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      <p className="dv-credit">
        Metadata from <a href="https://openalex.org" target="_blank" rel="noopener noreferrer">OpenAlex</a>,
        an open catalogue of scholarly work. Summaries only — follow a paper’s DOI to read it at
        the publisher.
      </p>
    </AppShell>
  );
}
