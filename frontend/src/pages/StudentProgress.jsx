import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { TRAINING_UNITS } from '../data/trainingContent.js';
import {
  getProgress,
  isUnitComplete,
  isUnitUnlocked,
  countCompletedUnits,
  overallPercent,
  allUnitsComplete,
} from '../data/trainingProgress.js';

function unitStatus(unit, progress) {
  if (isUnitComplete(unit, progress)) return { label: 'Complete', cls: 'pill pill-approved' };
  if (isUnitUnlocked(unit, progress)) return { label: 'In progress', cls: 'pill pill-review' };
  return { label: 'Locked', cls: 'pill pill-rejected' };
}

export default function StudentProgress() {
  const progress = getProgress();
  const completed = countCompletedUnits(progress);
  const percent = overallPercent(progress);
  const allDone = allUnitsComplete(progress);

  return (
    <AppShell role="user" searchPlaceholder="Search progress, units, quiz scores...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Training Progress</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Your learning <em className="serif-italic">progress</em>.</h1>
          <p className="page-subtitle">Track your units, quiz scores, writing exercises, and certificate status.</p>
        </div>
        {allDone && !progress.certificate && (
          <Link to="/user/assessment" className="btn btn-primary">Take Final Assessment →</Link>
        )}
        {progress.certificate && (
          <Link to="/user/certificate" className="btn btn-primary">View Certificate →</Link>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat fade-up delay-1" style={{ '--accent': 'var(--navy-700)' }}>
          <div className="stat-label">Overall Progress</div>
          <div className="stat-value">{percent}%</div>
          <div className="stat-trend">{completed} of {TRAINING_UNITS.length} units complete</div>
        </div>
        <div className="stat fade-up delay-2" style={{ '--accent': 'var(--amber-700)' }}>
          <div className="stat-label">Final Assessment</div>
          <div className="stat-value" style={{ fontSize: 26 }}>
            {progress.assessment.passed ? 'Passed' : allDone ? 'Ready' : 'Locked'}
          </div>
          <div className="stat-trend">
            {progress.assessment.bestScore === null ? 'Not attempted yet' : `Best score ${progress.assessment.bestScore}%`}
          </div>
        </div>
        <div className="stat fade-up delay-3" style={{ '--accent': progress.certificate ? 'var(--teal-700)' : 'var(--ink-300)' }}>
          <div className="stat-label">Certificate</div>
          <div className="stat-value" style={{ fontSize: 26 }}>{progress.certificate ? 'Earned' : 'Pending'}</div>
          <div className="stat-trend">{progress.certificate ? progress.certificate.id : 'Pass the assessment to earn'}</div>
        </div>
      </div>

      <div className="card fade-up delay-2">
        <div className="card-header">
          <div>
            <div className="card-title">Unit Progress</div>
            <div className="card-meta">Each unit needs all lessons read, the quiz passed, and the writing exercise submitted.</div>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Unit</th><th>Track</th><th>Lessons</th><th>Quiz</th><th>Writing</th><th>Status</th></tr>
          </thead>
          <tbody>
            {TRAINING_UNITS.map((unit) => {
              const p = progress.units[unit.id];
              const lessonsRead = p.lessonsRead.filter((id) => unit.lessons.some((l) => l.id === id)).length;
              const status = unitStatus(unit, progress);
              return (
                <tr key={unit.id}>
                  <td><div className="table-title">{unit.order}. {unit.title}</div></td>
                  <td><span className="muted">{unit.track}</span></td>
                  <td><span className="muted">{lessonsRead}/{unit.lessons.length}</span></td>
                  <td><span className="muted">{p.quizScore === null ? '--' : `${p.quizScore}%`}</span></td>
                  <td><span className="muted">{p.exerciseSubmitted ? 'Done' : '--'}</span></td>
                  <td><span className={status.cls}>{status.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
