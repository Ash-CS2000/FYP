import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicNav from '../components/PublicNav.jsx';

const TOPICS = [
  {
    id: 'topic-001',
    topic: 'Deep Learning Applications in Medical Imaging',
    summary: 'Investigates how convolutional and transformer-based neural networks are used for diagnostic classification in radiology and pathology.',
    institution: 'University of Malaya',
    level: "Master's",
    year: 2024,
    rating: 5,
    area: 'Computer Science',
    keywords: ['deep learning', 'medical imaging', 'CNN', 'computer vision'],
  },
  {
    id: 'topic-002',
    topic: 'Large Language Models and NLP Benchmarks',
    summary: 'Reviews the landscape of large language model evaluation methodologies, benchmark design, and limitations in open-domain tasks.',
    institution: 'Universiti Teknologi Malaysia',
    level: "Master's",
    year: 2025,
    rating: 4,
    area: 'Computer Science',
    keywords: ['NLP', 'language model', 'benchmarks', 'evaluation'],
  },
  {
    id: 'topic-003',
    topic: 'Quantum Computing in Combinatorial Optimization',
    summary: 'Examines the practical viability of quantum annealing and variational algorithms for solving NP-hard logistics and scheduling problems.',
    institution: 'Universiti Sains Malaysia',
    level: 'Doctoral',
    year: 2024,
    rating: 4,
    area: 'Physics',
    keywords: ['quantum computing', 'optimization', 'QAOA', 'simulation'],
  },
  {
    id: 'topic-004',
    topic: 'Smart Grid Load Balancing with Renewable Sources',
    summary: 'Analyzes demand-response strategies and optimization frameworks for integrating solar and wind energy into distributed grid systems.',
    institution: 'Universiti Putra Malaysia',
    level: "Bachelor's",
    year: 2024,
    rating: 3,
    area: 'Engineering',
    keywords: ['renewable energy', 'smart grid', 'optimization', 'load balancing'],
  },
  {
    id: 'topic-005',
    topic: 'IoT Security Architectures for Smart City Infrastructure',
    summary: 'Develops threat classification models and mitigation frameworks for IoT device vulnerabilities in urban sensor networks.',
    institution: 'University of Malaya',
    level: "Master's",
    year: 2025,
    rating: 4,
    area: 'Engineering',
    keywords: ['IoT', 'smart city', 'cybersecurity', 'threat modelling'],
  },
  {
    id: 'topic-006',
    topic: 'Blockchain Transparency in ASEAN Supply Chains',
    summary: 'Surveys adoption patterns and governance challenges of blockchain-based traceability in manufacturing and procurement across Southeast Asia.',
    institution: 'Universiti Malaya',
    level: "Bachelor's",
    year: 2024,
    rating: 3,
    area: 'Business',
    keywords: ['blockchain', 'supply chain', 'ASEAN', 'traceability'],
  },
  {
    id: 'topic-007',
    topic: 'Federated Learning for Privacy-Preserving Health Analytics',
    summary: 'Explores decentralized model training approaches that enable cross-hospital collaboration without sharing raw patient data.',
    institution: 'Universiti Kebangsaan Malaysia',
    level: 'Doctoral',
    year: 2025,
    rating: 5,
    area: 'Computer Science',
    keywords: ['federated learning', 'privacy', 'healthcare', 'machine learning'],
  },
  {
    id: 'topic-008',
    topic: 'Carbon Capture Material Design Using Computational Chemistry',
    summary: 'Investigates metal-organic frameworks and porous materials simulated at atomic scale for selective CO2 adsorption and sequestration.',
    institution: 'Universiti Sains Malaysia',
    level: "Master's",
    year: 2023,
    rating: 4,
    area: 'Chemistry',
    keywords: ['carbon capture', 'MOF', 'computational chemistry', 'climate'],
  },
];

const AREAS = ['All', 'Computer Science', 'Engineering', 'Physics', 'Business', 'Chemistry'];

function StarRating({ rating }) {
  return (
    <span className="star-rating" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          className={`star-icon${n <= rating ? ' star-filled' : ' star-empty'}`}
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [area, setArea] = useState(searchParams.get('area') || 'All');
  const [sort, setSort] = useState('relevant');

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (area !== 'All') params.set('area', area);
    setSearchParams(params);
  }

  function handleKeywordClick(keyword) {
    setQuery(keyword);
    setArea('All');
    const params = new URLSearchParams();
    params.set('q', keyword);
    setSearchParams(params);
  }

  function clearFilters() {
    setQuery('');
    setArea('All');
    setSort('relevant');
    setSearchParams({});
  }

  const activeQuery = searchParams.get('q') || '';
  const activeArea = searchParams.get('area') || 'All';

  const filteredTopics = useMemo(() => {
    const term = activeQuery.trim().toLowerCase();

    let result = TOPICS.filter((t) => {
      const matchesArea = activeArea === 'All' || t.area === activeArea;
      const searchable = [t.topic, t.summary, t.area, t.institution, ...t.keywords]
        .join(' ')
        .toLowerCase();
      return matchesArea && (!term || searchable.includes(term));
    });

    if (sort === 'top-rated') {
      result = [...result].sort((a, b) => b.rating - a.rating);
    } else if (sort === 'newest') {
      result = [...result].sort((a, b) => b.year - a.year);
    }

    return result;
  }, [activeQuery, activeArea, sort]);

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
        .topic-row {
          padding: 20px 24px;
          border-bottom: 1px solid var(--ink-100);
          transition: background 0.12s;
        }
        .topic-row:last-child { border-bottom: none; }
        .topic-row:hover { background: var(--ink-50); }

        .topic-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--navy-800, #1e3a5f);
          margin-bottom: 6px;
          line-height: 1.3;
        }
        .topic-summary {
          font-size: 14px;
          color: var(--ink-700);
          line-height: 1.6;
          margin-bottom: 10px;
        }
        .topic-keywords {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .topic-keyword-tag {
          background: var(--ink-100);
          color: var(--ink-600);
          font-size: 11.5px;
          padding: 3px 8px;
          border-radius: var(--r-pill);
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.12s, color 0.12s;
        }
        .topic-keyword-tag:hover {
          background: var(--navy-100, #dbeafe);
          color: var(--navy-700, #1d4ed8);
        }
        .topic-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .topic-attribution {
          font-size: 12.5px;
          color: var(--ink-500);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .topic-attribution-sep { color: var(--ink-300); }

        .star-rating {
          display: inline-flex;
          gap: 2px;
          align-items: center;
        }
        .star-icon {
          width: 14px;
          height: 14px;
          fill: currentColor;
        }
        .star-filled { color: #f59e0b; }
        .star-empty  { color: var(--ink-200); }

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
          .topic-footer { flex-direction: column; align-items: flex-start; }
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
              {AREAS.map((a) => (
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
              <strong>{filteredTopics.length}</strong> research {filteredTopics.length === 1 ? 'topic' : 'topics'} found
              {activeQuery && <> for <em>"{activeQuery}"</em></>}
            </p>
            <div className="sort-chips">
              <button
                className={`filter-chip${sort === 'relevant' ? ' active' : ''}`}
                onClick={() => setSort('relevant')}
              >
                Relevant
              </button>
              <button
                className={`filter-chip${sort === 'top-rated' ? ' active' : ''}`}
                onClick={() => setSort('top-rated')}
              >
                Top Rated
              </button>
              <button
                className={`filter-chip${sort === 'newest' ? ' active' : ''}`}
                onClick={() => setSort('newest')}
              >
                Newest
              </button>
            </div>
          </div>

          {filteredTopics.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">&#x1F50D;</div>
              <h3>No topics match your search</h3>
              <p>
                {activeQuery && `No results for "${activeQuery}"`}
                {activeQuery && activeArea !== 'All' && ` in area "${activeArea}"`}
                {!activeQuery && activeArea !== 'All' && `No topics in area "${activeArea}"`}
              </p>
              <button className="btn btn-primary" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <ul className="topic-list" role="list">
              {filteredTopics.map((t) => (
                <li className="topic-row" key={t.id}>
                  <div className="topic-name">{t.topic}</div>
                  <p className="topic-summary">{t.summary}</p>
                  <div className="topic-keywords">
                    {t.keywords.map((kw) => (
                      <button
                        key={kw}
                        className="topic-keyword-tag"
                        onClick={() => handleKeywordClick(kw)}
                        title={`Search "${kw}"`}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                  <div className="topic-footer">
                    <span className="topic-attribution">
                      <span>{t.institution}</span>
                      <span className="topic-attribution-sep">·</span>
                      <span>{t.level} level</span>
                      <span className="topic-attribution-sep">·</span>
                      <span>{t.year}</span>
                    </span>
                    <StarRating rating={t.rating} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
