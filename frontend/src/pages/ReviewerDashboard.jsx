import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';

export default function ReviewerDashboard() {
  return (
    <AppShell role="reviewer" searchPlaceholder="Search assigned papers...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Reviewer Workspace</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Welcome, <em className="serif-italic">Dr. Lim</em>.</h1>
          <p className="page-subtitle">You have 3 papers awaiting your review. One is approaching its deadline.</p>
        </div>
      </div>

      <div className="stat-grid">
        {[
          { label: 'Pending Reviews', value: 3, accent: 'var(--amber-700)', trend: <>1 due in <span className="down">2 days</span></> },
          { label: 'Completed This Year', value: 12, accent: 'var(--teal-700)', trend: <><span className="up">↑ 4</span> from last year</> },
          { label: 'Overdue', value: 1, accent: 'var(--red-700)', trend: 'Address as soon as possible' },
          { label: 'Reliability Score', value: '98%', accent: 'var(--navy-700)', trend: 'On-time submissions' },
        ].map((s, i) => (
          <div key={s.label} className={`stat fade-up delay-${i + 1}`} style={{ '--accent': s.accent }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-trend">{s.trend}</div>
          </div>
        ))}
      </div>

      <div className="card fade-up delay-3">
        <div className="card-header">
          <div>
            <div className="card-title">Papers Assigned to Me</div>
            <div className="card-meta">Click any paper to read the manuscript and submit your review.</div>
          </div>
          <div className="row">
            <button className="filter-chip active">All <span style={{ opacity: .6 }}>3</span></button>
            <button className="filter-chip">Pending <span style={{ opacity: .6 }}>2</span></button>
            <button className="filter-chip">Overdue <span style={{ opacity: .6 }}>1</span></button>
          </div>
        </div>

        <table className="data-table">
          <thead><tr><th>Paper</th><th>Category</th><th>Author</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr style={{ background: 'linear-gradient(90deg, rgba(252,235,235,0.4), transparent)' }}>
              <td><div className="table-title">Supply Chain Blockchain Use Cases in ASEAN</div><div className="table-meta">MS-2026-021 · Assigned 2 weeks ago</div></td>
              <td><span className="muted">Business</span></td>
              <td><div className="row"><div className="avatar avatar-sm">RT</div><span className="muted" style={{ fontSize: 13 }}>Roslan Tahir</span></div></td>
              <td><span style={{ color: 'var(--red-700)', fontWeight: 600, fontSize: 13 }}>Overdue · 8 May</span></td>
              <td><span className="pill pill-overdue">Overdue</span></td>
              <td><Link to="/reviewer/review" className="btn btn-danger btn-sm">Review Now</Link></td>
            </tr>
            <tr>
              <td><div className="table-title">Deep Learning Methods in Medical Imaging</div><div className="table-meta">MS-2026-014 · Assigned 5 days ago</div></td>
              <td><span className="muted">Computer Science</span></td>
              <td><div className="row"><div className="avatar avatar-sm">AR</div><span className="muted" style={{ fontSize: 13 }}>Ahmad Razif</span></div></td>
              <td><span style={{ color: 'var(--amber-700)', fontWeight: 600, fontSize: 13 }}>10 May 2026</span></td>
              <td><span className="pill pill-pending">In Progress</span></td>
              <td><Link to="/reviewer/review" className="btn btn-primary btn-sm">Continue</Link></td>
            </tr>
            <tr>
              <td><div className="table-title">Renewable Energy Grid Optimization</div><div className="table-meta">MS-2026-019 · Assigned 1 week ago</div></td>
              <td><span className="muted">Engineering</span></td>
              <td><div className="row"><div className="avatar avatar-sm">SK</div><span className="muted" style={{ fontSize: 13 }}>Siti Khadijah</span></div></td>
              <td><span className="muted" style={{ fontSize: 13 }}>15 May 2026</span></td>
              <td><span className="pill pill-pending">Not Started</span></td>
              <td><Link to="/reviewer/review" className="btn btn-ghost btn-sm">Start</Link></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="split-grid fade-up delay-4" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Recent Completed Reviews</div><div className="card-meta">Your recent contributions to the journal.</div></div>
            <Link to="/reviewer/completed" style={{ color: 'var(--navy-700)', fontSize: 13, fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { title: 'A Survey of Natural Language Processing in 2025', sub: 'Reviewed 3 days ago · Recommendation: Accept', status: 'Accepted', cls: 'pill-approved', color: 'var(--green-50)', textColor: 'var(--green-800)' },
              { title: 'Quantum Computing in Cryptography', sub: 'Reviewed 1 week ago · Recommendation: Major Revision', status: 'Revision', cls: 'pill-revision', color: 'var(--purple-50)', textColor: 'var(--purple-800)' },
              { title: 'Microservices Architecture Patterns', sub: 'Reviewed 2 weeks ago · Recommendation: Accept with Minor Revisions', status: 'Accepted', cls: 'pill-approved', color: 'var(--green-50)', textColor: 'var(--green-800)' },
            ].map((r, i) => (
              <div key={i} style={{ padding: 14, border: '1px solid var(--ink-200)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: r.color, color: r.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 14 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{r.sub}</div>
                </div>
                <span className={`pill ${r.cls}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Your Expertise Areas</div></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {['Computer Science', 'Machine Learning', 'Medical Imaging', 'Cryptography', '+ 4 more'].map(t => (
              <span key={t} style={{ padding: '6px 12px', background: 'var(--navy-100)', color: 'var(--navy-800)', borderRadius: 'var(--r-pill)', fontSize: 12.5, fontWeight: 500 }}>{t}</span>
            ))}
          </div>
          <div style={{ paddingTop: 16, borderTop: '1px solid var(--ink-200)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-900)', marginBottom: 12 }}>Reviewer Performance</div>
            {[
              { label: 'On-time submissions', value: '98%', width: 98, color: 'var(--teal-500)', valColor: 'var(--teal-700)' },
              { label: 'Quality rating', value: '4.8 / 5', width: 96, color: 'var(--navy-700)', valColor: 'var(--navy-700)' },
            ].map((m) => (
              <div key={m.label} style={{ marginBottom: 14 }}>
                <div className="row" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-700)' }}>{m.label}</span>
                  <span className="spacer"></span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: m.valColor }}>{m.value}</span>
                </div>
                <div className="progress" style={{ '--accent': m.color }}><div className="progress-fill" style={{ width: `${m.width}%` }}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
