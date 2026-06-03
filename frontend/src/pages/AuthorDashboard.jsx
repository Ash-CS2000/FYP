import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';

export default function AuthorDashboard() {
  const newSubmission = (
    <Link to="/author/submit" className="btn btn-primary btn-sm">+ New Submission</Link>
  );

  return (
    <AppShell role="author" searchPlaceholder="Search papers, reviewers, categories..." topbarActions={newSubmission}>
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Author Workspace</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Welcome back, <em className="serif-italic">Ahmad</em>.</h1>
          <p className="page-subtitle">Sunday, 3 May 2026 · You have 1 paper awaiting reviewer feedback.</p>
        </div>
      </div>

      <div className="stat-grid">
        {[
          { label: 'Total Submitted', value: 4, accent: 'var(--navy-700)', trend: <><span className="up">↑ 1</span> in the last 30 days</> },
          { label: 'Under Review', value: 1, accent: 'var(--amber-700)', trend: '2 of 3 reviewers responded' },
          { label: 'Published', value: 2, accent: 'var(--teal-700)', trend: <>Latest: <span style={{ color: 'var(--navy-900)', fontWeight: 600 }}>NLP Survey 2025</span></> },
          { label: 'Revision Required', value: 1, accent: 'var(--purple-700)', trend: <Link to="/author/revision" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Resubmit now →</Link> },
        ].map((s, i) => (
          <div className={`stat fade-up delay-${i + 1}`} key={s.label} style={{ '--accent': s.accent }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-trend">{s.trend}</div>
          </div>
        ))}
      </div>

      <div className="split-grid">
        <div className="card fade-up delay-3">
          <div className="card-header">
            <div>
              <div className="card-title">My Submissions</div>
              <div className="card-meta">Track every paper you've sent to PaperBridge.</div>
            </div>
            <div className="row">
              <button className="filter-chip active">All <span style={{ opacity: .6 }}>4</span></button>
              <button className="filter-chip">Active <span style={{ opacity: .6 }}>2</span></button>
              <button className="filter-chip">Published <span style={{ opacity: .6 }}>2</span></button>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr><th>Paper</th><th>Category</th><th>Submitted</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="table-title">Deep Learning Methods in Medical Imaging</div>
                  <div className="table-meta">3 reviewers · MS-2026-014</div>
                </td>
                <td><span className="muted">Computer Science</span></td>
                <td><span className="muted">12 Jan 2026</span></td>
                <td><span className="pill pill-review">In Review</span></td>
                <td><Link to="/author/papers" style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}>View →</Link></td>
              </tr>
              <tr>
                <td>
                  <div className="table-title">A Survey of Natural Language Processing in 2025</div>
                  <div className="table-meta">3 reviewers · MS-2025-208</div>
                </td>
                <td><span className="muted">Linguistics</span></td>
                <td><span className="muted">04 Nov 2025</span></td>
                <td><span className="pill pill-approved">Approved</span></td>
                <td><Link to="/author/papers" style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}>View →</Link></td>
              </tr>
              <tr>
                <td>
                  <div className="table-title">A Framework for IoT Security in Smart Cities</div>
                  <div className="table-meta">3 reviewers · MS-2025-187</div>
                </td>
                <td><span className="muted">Engineering</span></td>
                <td><span className="muted">22 Oct 2025</span></td>
                <td><span className="pill pill-revision">Revision Needed</span></td>
                <td><Link to="/author/revision" style={{ color: 'var(--amber-700)', fontWeight: 600, fontSize: 13 }}>Resubmit →</Link></td>
              </tr>
              <tr>
                <td>
                  <div className="table-title">Blockchain Applications in Finance</div>
                  <div className="table-meta">3 reviewers · MS-2025-142</div>
                </td>
                <td><span className="muted">Finance</span></td>
                <td><span className="muted">18 Aug 2025</span></td>
                <td><span className="pill pill-approved">Approved</span></td>
                <td><Link to="/author/papers" style={{ color: 'var(--navy-700)', fontWeight: 600, fontSize: 13 }}>View →</Link></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="gap-grid">
          <div className="card fade-up delay-4">
            <div className="card-header"><div className="card-title">Recent Activity</div></div>
            {[
              { color: '', text: <><strong>Dr. Lim Wei Ping</strong> was assigned to review your paper "Deep Learning Methods in Medical Imaging".</>, time: '2 hours ago' },
              { color: 'amber', text: <>Revision requested for <strong>"IoT Security Framework"</strong>. Please address reviewer comments.</>, time: 'Yesterday at 4:32 PM' },
              { color: 'teal', text: <><strong>"NLP Survey 2025"</strong> was approved for publication by all three reviewers.</>, time: '3 days ago' },
              { color: 'purple', text: 'New paper draft saved automatically.', time: '5 days ago' },
            ].map((a, i) => (
              <div className="activity-item" key={i}>
                <div className={`activity-dot ${a.color}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <div className="activity-text">{a.text}</div>
                  <div className="activity-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card fade-up delay-5">
            <div className="card-header"><div className="card-title">Submission Health</div></div>
            {[
              { label: 'Acceptance rate', value: '75%', width: 75, color: 'var(--teal-500)', valColor: 'var(--teal-700)' },
              { label: 'Avg. review time', value: '12 days', width: 60, color: 'var(--navy-700)', valColor: 'var(--navy-900)' },
              { label: 'First-round acceptance', value: '50%', width: 50, color: 'var(--amber-500)', valColor: 'var(--amber-700)' },
            ].map((m) => (
              <div key={m.label} style={{ marginBottom: 18 }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-700)', fontWeight: 500 }}>{m.label}</span>
                  <span className="spacer"></span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: m.valColor }}>{m.value}</span>
                </div>
                <div className="progress" style={{ '--accent': m.color }}>
                  <div className="progress-fill" style={{ width: `${m.width}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
