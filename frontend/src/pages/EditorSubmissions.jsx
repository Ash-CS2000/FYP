import AppShell from '../components/AppShell.jsx';

const SUBMISSIONS = [
  { id: 'MS-2026-014', title: 'Deep Learning Methods in Medical Imaging', author: 'Ahmad Razif', cat: 'Computer Science', status: 'review', label: 'In Review' },
  { id: 'MS-2026-008', title: 'A Survey of Quantum Computing Applications', author: 'Wong Mei Ling', cat: 'Physics', status: 'pending', label: 'Pending Decision' },
  { id: 'MS-2026-011', title: 'Climate Change Impact on Agricultural Yield', author: 'Tan Boon Hock', cat: 'Environmental', status: 'pending', label: 'Pending Decision' },
  { id: 'MS-2026-019', title: 'Renewable Energy Grid Optimization', author: 'Siti Khadijah', cat: 'Engineering', status: 'review', label: 'In Review' },
  { id: 'MS-2026-021', title: 'Supply Chain Blockchain Use Cases in ASEAN', author: 'Roslan Tahir', cat: 'Business', status: 'review', label: 'In Review' },
  { id: 'MS-2025-208', title: 'A Survey of Natural Language Processing in 2025', author: 'Ahmad Razif', cat: 'Linguistics', status: 'approved', label: 'Approved' },
  { id: 'MS-2025-187', title: 'A Framework for IoT Security in Smart Cities', author: 'Ahmad Razif', cat: 'Engineering', status: 'revision', label: 'Revision' },
  { id: 'MS-2025-142', title: 'Blockchain Applications in Finance', author: 'Ahmad Razif', cat: 'Finance', status: 'approved', label: 'Approved' },
];

export default function EditorSubmissions({ role = 'editor' }) {
  const isAdmin = role === 'admin';

  return (
    <AppShell role={role} searchPlaceholder="Search submissions...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">{isAdmin ? 'Administration' : 'Editorial'}</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>All <em className="serif-italic">Submissions</em>.</h1>
          <p className="page-subtitle">{isAdmin ? 'Monitor every submission without switching into the editor workspace.' : 'Every paper currently in the system, across all stages.'}</p>
        </div>
      </div>

      <div className="card fade-up delay-1">
        <div className="card-header">
          <div><div className="card-title">{SUBMISSIONS.length} submissions</div></div>
          <div className="row">
            <button className="filter-chip active">All</button>
            <button className="filter-chip">In Review</button>
            <button className="filter-chip">Pending</button>
            <button className="filter-chip">Revision</button>
            <button className="filter-chip">Approved</button>
          </div>
        </div>

        <table className="data-table">
          <thead><tr><th>Paper</th><th>Author</th><th>Category</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {SUBMISSIONS.map(s => (
              <tr key={s.id}>
                <td><div className="table-title">{s.title}</div><div className="table-meta">{s.id}</div></td>
                <td><span className="muted">{s.author}</span></td>
                <td><span className="muted">{s.cat}</span></td>
                <td><span className={`pill pill-${s.status}`}>{s.label}</span></td>
                <td><a href="#" style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}>View →</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
