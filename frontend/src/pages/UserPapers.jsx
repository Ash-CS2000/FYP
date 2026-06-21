import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { CATEGORIES, PAPERS } from './SearchResultsPage.jsx';

export default function UserPapers() {
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
    <AppShell role="user" searchPlaceholder="Search papers, authors, keywords...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Paper Discovery</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Discover published papers.</h1>
          <p className="page-subtitle">View abstracts, download open papers, or buy paid publications.</p>
        </div>
      </div>

      <div className="card fade-up delay-1" style={{ marginBottom: 22 }}>
        <div className="field-grid">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Search papers</label>
            <input
              className="field-input"
              type="search"
              placeholder="Search by title, author, keyword, or abstract..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Category</label>
            <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="portal-toolbar">
        <div>
          <div className="card-title">{filteredPapers.length} papers found</div>
          <div className="card-meta">Frontend demo paper catalogue.</div>
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
    </AppShell>
  );
}
