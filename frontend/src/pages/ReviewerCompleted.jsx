import AppShell from '../components/AppShell.jsx';

const COMPLETED = [
  { id: 1, title: 'A Survey of Natural Language Processing in 2025', date: '3 days ago', recommendation: 'Accept', cls: 'pill-approved' },
  { id: 2, title: 'Quantum Computing in Cryptography', date: '1 week ago', recommendation: 'Major Revision', cls: 'pill-revision' },
  { id: 3, title: 'Microservices Architecture Patterns', date: '2 weeks ago', recommendation: 'Accept w/ Minor', cls: 'pill-approved' },
  { id: 4, title: 'Edge Computing Latency Analysis', date: '3 weeks ago', recommendation: 'Reject', cls: 'pill-rejected' },
  { id: 5, title: 'Smart Agriculture IoT Networks', date: '1 month ago', recommendation: 'Accept', cls: 'pill-approved' },
  { id: 6, title: '5G Security Threat Modeling', date: '6 weeks ago', recommendation: 'Minor Revision', cls: 'pill-review' },
];

export default function ReviewerCompleted() {
  return (
    <AppShell role="reviewer" searchPlaceholder="Search completed reviews...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Reviewer Workspace</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Completed <em className="serif-italic">Reviews</em>.</h1>
          <p className="page-subtitle">Your contribution to the journal — {COMPLETED.length} reviews shown.</p>
        </div>
      </div>

      <div className="card fade-up delay-1">
        <table className="data-table">
          <thead><tr><th>Paper</th><th>Submitted</th><th>Recommendation</th><th></th></tr></thead>
          <tbody>
            {COMPLETED.map(r => (
              <tr key={r.id}>
                <td><div className="table-title">{r.title}</div></td>
                <td><span className="muted">{r.date}</span></td>
                <td><span className={`pill ${r.cls}`}>{r.recommendation}</span></td>
                <td><a href="#" style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}>View →</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
