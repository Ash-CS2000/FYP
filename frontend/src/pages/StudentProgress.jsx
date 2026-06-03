import AppShell from '../components/AppShell.jsx';

const MODULE_PROGRESS = [
  { title: 'Citation Basics', track: 'Citation', progress: 67, score: 'Not attempted' },
  { title: 'Avoiding Plagiarism', track: 'Citation', progress: 0, score: 'Not attempted' },
  { title: 'Research Paper Structure', track: 'Publishing', progress: 0, score: 'Not attempted' },
  { title: 'Abstracts and Keywords', track: 'Research Literacy', progress: 0, score: 'Not attempted' },
  { title: 'Read Like a Reviewer', track: 'Reviewing', progress: 0, score: 'Not attempted' },
  { title: 'Publishing Your First Paper', track: 'Publishing', progress: 0, score: 'Not attempted' },
];

export default function StudentProgress() {
  return (
    <AppShell role="user" searchPlaceholder="Search progress, modules, quiz scores...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Training Progress</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Your learning progress.</h1>
          <p className="page-subtitle">Track completed lessons, module progress, and quiz readiness.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat fade-up delay-1" style={{ '--accent': 'var(--navy-700)' }}>
          <div className="stat-label">Lessons Completed</div>
          <div className="stat-value">2</div>
          <div className="stat-trend">Out of 17 lessons</div>
        </div>
        <div className="stat fade-up delay-2" style={{ '--accent': 'var(--amber-700)' }}>
          <div className="stat-label">Active Module</div>
          <div className="stat-value" style={{ fontSize: 30 }}>Citation</div>
          <div className="stat-trend">Continue Citation Basics</div>
        </div>
        <div className="stat fade-up delay-3" style={{ '--accent': 'var(--teal-700)' }}>
          <div className="stat-label">Quiz Average</div>
          <div className="stat-value">--</div>
          <div className="stat-trend">Complete a quiz to unlock scores</div>
        </div>
      </div>

      <div className="card fade-up delay-2">
        <div className="card-header">
          <div>
            <div className="card-title">Module Progress</div>
            <div className="card-meta">Frontend mock data matching user training progress.</div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Module</th><th>Track</th><th>Progress</th><th>Quiz Score</th></tr>
          </thead>
          <tbody>
            {MODULE_PROGRESS.map((module) => (
              <tr key={module.title}>
                <td>
                  <div className="table-title">{module.title}</div>
                </td>
                <td><span className="muted">{module.track}</span></td>
                <td>
                  <div className="row" style={{ minWidth: 180 }}>
                    <div className="progress" style={{ flex: 1, '--accent': module.progress > 0 ? 'var(--navy-700)' : 'var(--ink-300)' }}>
                      <div className="progress-fill" style={{ width: `${module.progress}%` }}></div>
                    </div>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-600)', width: 36 }}>{module.progress}%</span>
                  </div>
                </td>
                <td><span className="muted">{module.score}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
