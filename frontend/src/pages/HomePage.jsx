import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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
    abstract: 'A regional analysis of blockchain adoption in supply chain transparency, traceability, and procurement workflows.',
  },
];

export const CATEGORIES = ['All', 'Computer Science', 'Engineering', 'Physics', 'Linguistics', 'Business'];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const filteredPapers = useMemo(() => {
    const term = query.trim().toLowerCase();

    return PAPERS.filter((paper) => {
      const matchesCategory = category === 'All' || paper.category === category;
      const searchable = [
        paper.title,
        paper.author,
        paper.category,
        paper.abstract,
        ...paper.keywords,
      ].join(' ').toLowerCase();

      return matchesCategory && (!term || searchable.includes(term));
    });
  }, [query, category]);

  return (
    <div className="paper-portal">
      <style>{`
        .paper-portal {
          min-height: 100vh;
          background: var(--ink-50);
        }
        .portal-hero {
          background: var(--white);
          border-bottom: 1px solid var(--ink-200);
          padding: 54px 32px 38px;
        }
        .portal-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .portal-heading {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 28px;
          align-items: end;
          margin-bottom: 32px;
        }
        .portal-heading h1 {
          font-family: var(--font-display);
          font-size: clamp(38px, 5vw, 58px);
          font-weight: 500;
          line-height: 1.04;
          letter-spacing: -0.03em;
          color: var(--navy-900);
          margin: 8px 0 12px;
        }
        .portal-heading h1 em {
          color: var(--amber-700);
          font-style: italic;
          font-weight: 400;
        }
        .portal-heading p {
          color: var(--ink-600);
          max-width: 680px;
          font-size: 16px;
          line-height: 1.65;
        }
        .portal-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .paper-search {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 180px;
          gap: 12px;
          background: var(--ink-50);
          border: 1px solid var(--ink-200);
          border-radius: var(--r-lg);
          padding: 12px;
        }
        .paper-search input,
        .paper-search select {
          width: 100%;
          border: 1px solid var(--ink-200);
          background: var(--white);
          border-radius: var(--r-md);
          padding: 13px 14px;
          outline: none;
          color: var(--ink-800);
        }
        .portal-main {
          padding: 32px;
        }
        .portal-toolbar {
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
        .paper-keywords span {
          background: var(--ink-100);
          color: var(--ink-700);
          font-size: 11.5px;
          padding: 4px 8px;
          border-radius: var(--r-pill);
        }
        .paper-card-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
          padding-top: 18px;
          flex-wrap: wrap;
        }
        @media (max-width: 760px) {
          .portal-heading { grid-template-columns: 1fr; }
          .portal-actions { justify-content: flex-start; }
          .paper-search { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav className="public-nav">
        <div className="public-nav-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">PaperBridge</span>
            <span className="brand-sub">Research Portal</span>
          </Link>
          <div className="public-nav-links">
            <Link to="/" className="active">Papers</Link>
            <Link to="/about">About</Link>
            <Link to="/resources">Resources</Link>
          </div>
          <div className="public-nav-cta">
            <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Create Account</Link>
          </div>
        </div>
      </nav>

      <section className="portal-hero">
        <div className="portal-inner">
          <div className="portal-heading">
            <div>
              <span className="eyebrow">Public Research Library</span>
              <h1>Find papers, learn methods, and build your <em>research skills</em>.</h1>
              <p>Search published papers, preview abstracts, download open papers, purchase paid papers, and access training modules from one normal user account.</p>
            </div>
            <div className="portal-actions">
              <Link to="/user/training" className="btn btn-accent">Open Training</Link>
              <Link to="/register" className="btn btn-primary">Join as User</Link>
            </div>
          </div>

          <div className="paper-search">
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
          </div>
        </div>
      </section>

      <main className="portal-main">
        <div className="portal-inner">
          <div className="portal-toolbar">
            <div>
              <div className="card-title">{filteredPapers.length} papers found</div>
              <div className="card-meta">View details, download open access papers, or buy paid publications.</div>
            </div>
            <div className="row">
              <button className="filter-chip active">Latest</button>
              <button className="filter-chip">Most Downloaded</button>
              <button className="filter-chip">Open Access</button>
            </div>
          </div>

          <div className="paper-grid">
            {filteredPapers.map((paper) => (
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
                  {paper.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
                </div>
                <div className="paper-card-actions">
                  <button className="btn btn-primary btn-sm">View</button>
                  <button className="btn btn-ghost btn-sm">Download</button>
                  {paper.access !== 'Open' && <button className="btn btn-accent btn-sm">Buy</button>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
