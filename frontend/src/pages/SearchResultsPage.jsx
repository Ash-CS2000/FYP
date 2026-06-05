import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PublicNav from '../components/PublicNav.jsx';

export const PAPERS = [
  {
    id: 'MS-2026-014',
    title: 'Deep Learning Methods in Medical Imaging',
    author: 'Ahmad Razif',
    category: 'Computer Science',
    price: 'RM 18',
    access: 'Paid',
    downloads: 248,
    keywords: ['deep learning', 'medical imaging', 'CNN'],
    abstract: 'A comparative study of deep learning models for diagnostic image classification using public medical imaging datasets.',
  },
  {
    id: 'MS-2025-208',
    title: 'A Survey of Natural Language Processing in 2025',
    author: 'Ahmad Razif',
    category: 'Linguistics',
    price: 'Free',
    access: 'Open',
    downloads: 621,
    keywords: ['NLP', 'language model', 'survey'],
    abstract: 'This survey reviews current NLP techniques, evaluation practices, and major application areas across academic and industrial settings.',
  },
  {
    id: 'MS-2026-008',
    title: 'A Survey of Quantum Computing Applications',
    author: 'Wong Mei Ling',
    category: 'Physics',
    price: 'RM 24',
    access: 'Paid',
    downloads: 139,
    keywords: ['quantum computing', 'optimization', 'simulation'],
    abstract: 'A structured overview of quantum computing use cases in simulation, cryptography, optimization, and emerging hybrid systems.',
  },
  {
    id: 'MS-2026-019',
    title: 'Renewable Energy Grid Optimization',
    author: 'Siti Khadijah',
    category: 'Engineering',
    price: 'Free',
    access: 'Open',
    downloads: 402,
    keywords: ['renewable energy', 'smart grid', 'optimization'],
    abstract: 'An optimization framework for improving renewable energy integration and balancing grid loads in distributed systems.',
  },
  {
    id: 'MS-2025-187',
    title: 'A Framework for IoT Security in Smart Cities',
    author: 'Ahmad Razif',
    category: 'Engineering',
    price: 'RM 15',
    access: 'Paid',
    downloads: 314,
    keywords: ['IoT', 'smart city', 'cybersecurity'],
    abstract: 'A security framework for identifying, classifying, and mitigating IoT vulnerabilities in smart city infrastructure.',
  },
  {
    id: 'MS-2026-021',
    title: 'Supply Chain Blockchain Use Cases in ASEAN',
    author: 'Roslan Tahir',
    category: 'Business',
    price: 'RM 12',
    access: 'Paid',
    downloads: 197,
    keywords: ['blockchain', 'supply chain', 'ASEAN'],
    abstract: 'A regional analysis of blockchain adoption in supply chain transparency, traceability, and procurement workshops.',
  },
];

export const CATEGORIES = ['All', 'Computer Science', 'Engineering', 'Physics', 'Linguistics', 'Business'];

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [sort, setSort] = useState('latest');

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category !== 'All') params.set('category', category);
    setSearchParams(params);
  }

  function handleKeywordClick(keyword) {
    setQuery(keyword);
    setCategory('All');
    const params = new URLSearchParams();
    params.set('q', keyword);
    setSearchParams(params);
  }

  function clearFilters() {
    setQuery('');
    setCategory('All');
    setSort('latest');
    setSearchParams({});
  }

  const activeQuery = searchParams.get('q') || '';
  const activeCategory = searchParams.get('category') || 'All';

  const filteredPapers = useMemo(() => {
    const term = activeQuery.trim().toLowerCase();

    let result = PAPERS.filter((paper) => {
      const matchesCategory = activeCategory === 'All' || paper.category === activeCategory;
      const matchesAccess = sort === 'open' ? paper.access === 'Open' : true;
      const searchable = [
        paper.title,
        paper.author,
        paper.category,
        paper.abstract,
        ...paper.keywords,
      ].join(' ').toLowerCase();

      return matchesCategory && matchesAccess && (!term || searchable.includes(term));
    });

    if (sort === 'downloads') {
      result = [...result].sort((a, b) => b.downloads - a.downloads);
    }

    return result;
  }, [activeQuery, activeCategory, sort]);

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
          max-width: 1280px;
          margin: 0 auto;
        }
        .search-bar-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 180px auto;
          gap: 12px;
          background: var(--ink-50);
          border: 1px solid var(--ink-200);
          border-radius: var(--r-lg);
          padding: 12px;
          margin-top: 16px;
        }
        .search-bar-row input,
        .search-bar-row select {
          width: 100%;
          border: 1px solid var(--ink-200);
          background: var(--white);
          border-radius: var(--r-md);
          padding: 13px 14px;
          outline: none;
          color: var(--ink-800);
        }
        .search-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: var(--ink-500);
        }
        .search-breadcrumb a {
          color: var(--navy-600, #2563eb);
          text-decoration: none;
        }
        .search-breadcrumb a:hover { text-decoration: underline; }

        .search-main {
          padding: 28px 32px;
        }
        .search-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .paper-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
          gap: 18px;
        }
        .paper-card {
          background: var(--white);
          border: 1px solid var(--ink-200);
          border-radius: var(--r-lg);
          padding: 22px;
          display: flex;
          flex-direction: column;
          min-height: 310px;
          transition: all var(--t-base);
        }
        .paper-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--navy-300);
        }
        .paper-card-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 14px;
        }
        .paper-card h2 {
          font-family: var(--font-display);
          font-size: 22px;
          color: var(--navy-900);
          line-height: 1.18;
          font-weight: 500;
          letter-spacing: -0.01em;
        }
        .paper-abstract {
          color: var(--ink-600);
          font-size: 13.5px;
          line-height: 1.65;
          margin: 14px 0;
        }
        .paper-meta {
          color: var(--ink-500);
          font-size: 12.5px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .paper-keywords {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 14px;
        }
        .paper-keyword-tag {
          background: var(--ink-100);
          color: var(--ink-700);
          font-size: 11.5px;
          padding: 4px 8px;
          border-radius: var(--r-pill);
          border: none;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          font-family: inherit;
        }
        .paper-keyword-tag:hover {
          background: var(--navy-100, #dbeafe);
          color: var(--navy-700, #1d4ed8);
        }
        .paper-card-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
          padding-top: 18px;
          flex-wrap: wrap;
        }
        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 64px 24px;
        }
        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.4;
        }
        .empty-state h3 {
          font-family: var(--font-display);
          font-size: 22px;
          color: var(--navy-900);
          margin-bottom: 8px;
        }
        .empty-state p {
          color: var(--ink-500);
          font-size: 15px;
          margin-bottom: 24px;
        }
        @media (max-width: 760px) {
          .search-bar-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <PublicNav />

      <div className="search-hero">
        <div className="search-inner">
          <div className="search-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <span>Search Results</span>
            {activeQuery && <><span>for</span><strong style={{ color: 'var(--navy-900)' }}>"{activeQuery}"</strong></>}
          </div>
          <form className="search-bar-row" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="Search by title, author, keyword, or abstract..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
        </div>
      </div>

      <main className="search-main">
        <div className="search-inner">
          <div className="search-toolbar">
            <div>
              <div className="card-title">{filteredPapers.length} papers found</div>
              <div className="card-meta">View details, download open access papers, or buy paid publications.</div>
            </div>
            <div className="row">
              <button
                className={`filter-chip${sort === 'latest' ? ' active' : ''}`}
                onClick={() => setSort('latest')}
              >
                Latest
              </button>
              <button
                className={`filter-chip${sort === 'downloads' ? ' active' : ''}`}
                onClick={() => setSort('downloads')}
              >
                Most Downloaded
              </button>
              <button
                className={`filter-chip${sort === 'open' ? ' active' : ''}`}
                onClick={() => setSort(sort === 'open' ? 'latest' : 'open')}
              >
                Open Access
              </button>
            </div>
          </div>

          <div className="paper-grid">
            {filteredPapers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>No papers match your search</h3>
                <p>
                  {activeQuery && `No results for "${activeQuery}"`}
                  {activeQuery && activeCategory !== 'All' && ` in category "${activeCategory}"`}
                  {!activeQuery && activeCategory !== 'All' && `No papers in category "${activeCategory}"`}
                  {sort === 'open' && !activeQuery && activeCategory === 'All' && 'No open access papers available right now'}
                </p>
                <button className="btn btn-primary" onClick={clearFilters}>
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredPapers.map((paper) => (
                <article className="paper-card" key={paper.id}>
                  <div className="paper-card-top">
                    <h2>{paper.title}</h2>
                    <span className={paper.access === 'Open' ? 'pill pill-approved' : 'pill pill-review'}>{paper.price}</span>
                  </div>
                  <div className="paper-meta">
                    <span>{paper.author}</span>
                    <span>{paper.category}</span>
                    <span>{paper.downloads} downloads</span>
                  </div>
                  <p className="paper-abstract">{paper.abstract}</p>
                  <div className="paper-keywords">
                    {paper.keywords.map((keyword) => (
                      <button
                        key={keyword}
                        className="paper-keyword-tag"
                        onClick={() => handleKeywordClick(keyword)}
                        title={`Filter by "${keyword}"`}
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                  <div className="paper-card-actions">
                    <button className="btn btn-primary btn-sm">View</button>
                    <button className="btn btn-ghost btn-sm">Download</button>
                    {paper.access !== 'Open' && <button className="btn btn-accent btn-sm">Buy</button>}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
