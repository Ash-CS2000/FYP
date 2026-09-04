// src/pages/SearchResultsPage.jsx
// The public research library at /search — reachable logged out, so everything
// here goes through api/discovery.js (plain fetch, no bearer token) rather than
// authFetch, which would bounce an anonymous or stale-session visitor to /login.
//
// Search is submit-driven and lives in the URL, so a result page is shareable.
// Sorting is deliberately NOT in the URL and never refetches: filtering narrows
// what we fetch, sorting reorders what we already hold.

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicNav from '../components/PublicNav.jsx';
import TopicCard from '../components/TopicCard.jsx';
import { listPublishedCategories, listPublishedTopics } from '../api/discovery.js';
import { AREA_ALL, areaOptions } from '../data/topics.js';

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // The param is `category`, matching the backend and the landing page's footer
  // links. It used to be read as `area` while HomePage linked to `?category=`,
  // which quietly made all four of those links do nothing.
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [area, setArea] = useState(searchParams.get('category') || AREA_ALL);
  const [sort, setSort] = useState('newest');

  const [topics, setTopics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const activeQuery = searchParams.get('q') || '';
  const activeArea = searchParams.get('category') || AREA_ALL;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    listPublishedTopics({ q: activeQuery, category: activeArea === AREA_ALL ? '' : activeArea })
      .then((data) => { if (!cancelled) setTopics(data); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load the research library.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeQuery, activeArea]);

  // Non-fatal: without it the dropdown is just 'All'.
  useEffect(() => {
    let cancelled = false;
    listPublishedCategories()
      .then((data) => { if (!cancelled) setCategories(data); })
      .catch(() => { /* dropdown degrades to 'All' */ });
    return () => { cancelled = true; };
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (area !== AREA_ALL) params.set('category', area);
    setSearchParams(params);
  }

  function handleKeywordClick(keyword) {
    setQuery(keyword);
    setArea(AREA_ALL);
    const params = new URLSearchParams();
    params.set('q', keyword);
    setSearchParams(params);
  }

  function clearFilters() {
    setQuery('');
    setArea(AREA_ALL);
    setSort('newest');
    setSearchParams({});
  }

  // Sort only — the server already filtered. No network call on a chip click.
  const filteredTopics = useMemo(() => {
    const result = [...topics];
    if (sort === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'oldest') {
      result.sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
    }
    // 'newest' is the order the server already returned.
    return result;
  }, [topics, sort]);

  return (
    <div className="search-portal">
      <style>{`
        .search-portal {
          min-height: 100vh;
          background: var(--ink-50);
        }

        .search-hero {
          background: var(--white);
          border-bottom: 1px solid var(--ink-200);
          padding: 28px 32px;
        }
        .search-inner {
          max-width: 860px;
          margin: 0 auto;
        }
        .search-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--ink-500);
          margin-bottom: 16px;
        }
        .search-breadcrumb a {
          color: var(--navy-600, #2563eb);
          text-decoration: none;
        }
        .search-breadcrumb a:hover { text-decoration: underline; }
        .search-bar-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 170px auto;
          gap: 10px;
          background: var(--ink-50);
          border: 1px solid var(--ink-200);
          border-radius: var(--r-lg);
          padding: 10px;
        }
        .search-bar-row input,
        .search-bar-row select {
          width: 100%;
          border: 1px solid var(--ink-200);
          background: var(--white);
          border-radius: var(--r-md);
          padding: 12px 14px;
          outline: none;
          color: var(--ink-800);
          font-size: 14px;
          font-family: inherit;
        }
        .search-bar-row input:focus,
        .search-bar-row select:focus {
          border-color: var(--navy-400, #60a5fa);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }

        .search-main {
          padding: 28px 32px;
        }
        .search-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .result-count {
          font-size: 14px;
          color: var(--ink-600);
        }
        .result-count strong {
          color: var(--navy-900);
          font-weight: 600;
        }
        .sort-chips {
          display: flex;
          gap: 8px;
        }

        .topic-list {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--ink-200);
          border-radius: var(--r-lg);
          overflow: hidden;
          background: var(--white);
        }
        /* The row itself is styled by components/TopicCard.jsx, which both this
           page and Discover share. These rules used to be duplicated here under
           different names, and .topic-attribution / .topic-attribution-sep were
           declared in both files with different values — whichever page mounted
           last won. */

        .empty-state {
          text-align: center;
          padding: 64px 24px;
          background: var(--white);
          border: 1px solid var(--ink-200);
          border-radius: var(--r-lg);
        }
        .empty-state-icon {
          font-size: 40px;
          margin-bottom: 14px;
          opacity: 0.4;
        }
        .empty-state h3 {
          font-family: var(--font-display);
          font-size: 20px;
          color: var(--navy-900);
          margin-bottom: 6px;
        }
        .empty-state p {
          color: var(--ink-500);
          font-size: 14px;
          margin-bottom: 20px;
        }

        @media (max-width: 680px) {
          .search-bar-row { grid-template-columns: 1fr; }
          .search-hero, .search-main { padding: 20px 16px; }
        }
      `}</style>

      <PublicNav />

      <div className="search-hero">
        <div className="search-inner">
          <nav className="search-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Research Topics</span>
            {activeQuery && (
              <>
                <span>—</span>
                <strong style={{ color: 'var(--navy-900)' }}>"{activeQuery}"</strong>
              </>
            )}
          </nav>
          <form className="search-bar-row" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="Search by topic, keyword, or research area..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              {areaOptions(categories).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
        </div>
      </div>

      <main className="search-main">
        <div className="search-inner">
          <div className="search-toolbar">
            <p className="result-count">
              {loading
                ? 'Searching…'
                : <>
                    <strong>{filteredTopics.length}</strong> published {filteredTopics.length === 1 ? 'paper' : 'papers'} found
                    {activeQuery && <> for <em>"{activeQuery}"</em></>}
                  </>}
            </p>
            {/* No "Top Rated" — there is no rating in the system — and no
                "Relevant", because the server has no relevance score and a chip
                that claims one would be a lie. */}
            <div className="sort-chips">
              <button
                className={`filter-chip${sort === 'newest' ? ' active' : ''}`}
                onClick={() => setSort('newest')}
              >
                Newest
              </button>
              <button
                className={`filter-chip${sort === 'oldest' ? ' active' : ''}`}
                onClick={() => setSort('oldest')}
              >
                Oldest
              </button>
              <button
                className={`filter-chip${sort === 'title' ? ' active' : ''}`}
                onClick={() => setSort('title')}
              >
                A–Z
              </button>
            </div>
          </div>

          {loading && <div className="empty-state"><p>Loading published research…</p></div>}

          {!loading && loadError && (
            <div className="empty-state">
              <div className="empty-state-icon">&#x26A0;&#xFE0F;</div>
              <h3>Could not load the research library</h3>
              <p>{loadError}</p>
            </div>
          )}

          {/* "Nothing published yet" and "nothing matched" are different
              situations. Telling a visitor to change their keywords when the
              library is simply empty sends them chasing a result that cannot
              exist. */}
          {!loading && !loadError && filteredTopics.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">&#x1F50D;</div>
              {activeQuery || activeArea !== AREA_ALL ? (
                <>
                  <h3>No papers match your search</h3>
                  <p>
                    {activeQuery && `No results for "${activeQuery}"`}
                    {activeQuery && activeArea !== AREA_ALL && ` in "${activeArea}"`}
                    {!activeQuery && activeArea !== AREA_ALL && `No published papers in "${activeArea}"`}
                  </p>
                  <button className="btn btn-primary" onClick={clearFilters}>
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <h3>Nothing published yet</h3>
                  <p>Published research will appear here as papers complete peer review.</p>
                </>
              )}
            </div>
          )}

          {!loading && !loadError && filteredTopics.length > 0 && (
            <ul className="topic-list" role="list">
              {filteredTopics.map((t) => (
                <li key={t.id}>
                  <TopicCard topic={t} onKeywordClick={handleKeywordClick} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
