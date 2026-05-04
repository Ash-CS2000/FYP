import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';

const PAPERS = [
  { id: 'MS-2026-014', title: 'Deep Learning Methods in Medical Imaging', cat: 'Computer Science', date: '12 Jan 2026', status: 'review', statusLabel: 'In Review' },
  { id: 'MS-2025-208', title: 'A Survey of Natural Language Processing in 2025', cat: 'Linguistics', date: '04 Nov 2025', status: 'approved', statusLabel: 'Approved' },
  { id: 'MS-2025-187', title: 'A Framework for IoT Security in Smart Cities', cat: 'Engineering', date: '22 Oct 2025', status: 'revision', statusLabel: 'Revision Needed' },
  { id: 'MS-2025-142', title: 'Blockchain Applications in Finance', cat: 'Finance', date: '18 Aug 2025', status: 'approved', statusLabel: 'Approved' },
];

export default function MyPapers() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? PAPERS : PAPERS.filter(p => filter === 'active' ? (p.status === 'review' || p.status === 'revision') : p.status === filter);

  return (
    <AppShell role="author" searchPlaceholder="Search your papers..." topbarActions={<Link to="/author/submit" className="btn btn-primary btn-sm">+ New Paper</Link>}>
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Author Workspace</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>My <em className="serif-italic">Papers</em>.</h1>
          <p className="page-subtitle">All papers you have submitted to the journal.</p>
        </div>
      </div>

      <div className="card fade-up delay-1">
        <div className="card-header">
          <div>
            <div className="card-title">Submissions ({filtered.length})</div>
            <div className="card-meta">Click a paper to see review progress and feedback.</div>
          </div>
          <div className="row">
            {[
              { id: 'all', label: 'All', count: PAPERS.length },
              { id: 'active', label: 'Active', count: PAPERS.filter(p => p.status === 'review' || p.status === 'revision').length },
              { id: 'approved', label: 'Approved', count: PAPERS.filter(p => p.status === 'approved').length },
            ].map(f => (
              <button key={f.id} className={`filter-chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label} <span style={{ opacity: .6 }}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Paper</th><th>Category</th><th>Submitted</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="table-title">{p.title}</div>
                  <div className="table-meta">3 reviewers · {p.id}</div>
                </td>
                <td><span className="muted">{p.cat}</span></td>
                <td><span className="muted">{p.date}</span></td>
                <td><span className={`pill pill-${p.status}`}>{p.statusLabel}</span></td>
                <td>
                  {p.status === 'revision' ? (
                    <Link to="/author/revision" style={{ color: 'var(--amber-700)', fontWeight: 600, fontSize: 13 }}>Resubmit →</Link>
                  ) : (
                    <a href="#" style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}>View →</a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
