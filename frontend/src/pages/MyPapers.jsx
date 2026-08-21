import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { loadDrafts, deleteDraft, formatSavedAt } from '../data/drafts.js';
import { deleteDraftRemote } from '../api/submissions.js';
import { withdrawalFor } from '../data/drafts.js';

const PAPERS = [
  { id: 'MS-2026-014', title: 'Deep Learning Methods in Medical Imaging', cat: 'Computer Science', date: '12 Jan 2026', status: 'review', statusLabel: 'In Review' },
  { id: 'MS-2025-208', title: 'A Survey of Natural Language Processing in 2025', cat: 'Linguistics', date: '04 Nov 2025', status: 'approved', statusLabel: 'Approved' },
  { id: 'MS-2025-187', title: 'A Framework for IoT Security in Smart Cities', cat: 'Engineering', date: '22 Oct 2025', status: 'revision', statusLabel: 'Revision Needed' },
  { id: 'MS-2025-142', title: 'Blockchain Applications in Finance', cat: 'Finance', date: '18 Aug 2025', status: 'approved', statusLabel: 'Approved' },
];

export default function MyPapers() {
  const [filter, setFilter] = useState('all');
  const [drafts, setDrafts] = useState(() => loadDrafts());
  const filtered = filter === 'all' ? PAPERS : PAPERS.filter(p => filter === 'active' ? (p.status === 'review' || p.status === 'revision') : p.status === filter);

  const discard = async (id) => {
    try {
      await deleteDraftRemote(id);
    } catch {
      /* offline, or already gone server-side — the local delete still stands */
    }
    deleteDraft(id);
    setDrafts(loadDrafts());
  };

  return (
    <AppShell role="author" searchPlaceholder="Search your papers..." topbarActions={<Link to="/author/submit" className="btn btn-primary btn-sm">+ New Paper</Link>}>
      <style>{`
        .dr-row { display: flex; align-items: center; gap: 14px; padding: 13px 0; border-bottom: 1px solid var(--ink-100); }
        .dr-row:last-child { border-bottom: none; }
        .dr-title { font-weight: 600; font-size: 13.5px; color: var(--navy-900); }
        .dr-meta { font-size: 12px; color: var(--ink-500); margin-top: 2px; }
        .dr-actions { margin-left: auto; display: flex; gap: 10px; white-space: nowrap; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Author Workspace</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>My <em className="serif-italic">Papers</em>.</h1>
          <p className="page-subtitle">All papers you have submitted to the journal.</p>
        </div>
      </div>

      {drafts.length > 0 && (
        <div className="card fade-up" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Drafts ({drafts.length})</div>
              <div className="card-meta">
                Not submitted, and not visible to anyone but you. Files are not kept
                with a draft — you will be asked to re-attach the manuscript.
              </div>
            </div>
          </div>
          {drafts.map(dft => (
            <div className="dr-row" key={dft.id}>
              <div style={{ minWidth: 0 }}>
                <div className="dr-title">{dft.title || 'Untitled draft'}</div>
                <div className="dr-meta">
                  Step {dft.step} of 5 · saved {formatSavedAt(dft.updated_at)}
                  {dft.file_name && ` · was ${dft.file_name}`}
                </div>
              </div>
              <div className="dr-actions">
                <Link to={`/author/submit?draft=${encodeURIComponent(dft.id)}`}
                      style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}>
                  Resume →
                </Link>
                <button
                  onClick={() => discard(dft.id)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-600)', fontWeight: 600, fontSize: 13 }}
                >
                  Discard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            {filtered.map(p => {
              // A withdrawal overrides the pipeline status — the paper stopped
              // where the author stopped it.
              const withdrawn = withdrawalFor(p.id);
              return (
                <tr key={p.id} style={withdrawn ? { opacity: .65 } : undefined}>
                  <td>
                    <Link to={`/author/papers/${p.id}`} className="table-title" style={{ color: 'var(--navy-900)', display: 'block' }}>{p.title}</Link>
                    <div className="table-meta">{p.id}</div>
                  </td>
                  <td><span className="muted">{p.cat}</span></td>
                  <td><span className="muted">{p.date}</span></td>
                  <td>
                    {withdrawn
                      ? <span className="pill pill-revision">Withdrawn</span>
                      : <span className={`pill pill-${p.status}`}>{p.statusLabel}</span>}
                  </td>
                  <td>
                    {!withdrawn && p.status === 'revision' ? (
                      <Link to="/author/revision" style={{ color: 'var(--amber-700)', fontWeight: 600, fontSize: 13 }}>Resubmit →</Link>
                    ) : (
                      <Link to={`/author/papers/${p.id}`} style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}>View →</Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
