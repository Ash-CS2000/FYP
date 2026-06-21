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
  publicationState,
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
  const pub = publicationState(progress);
  const awaitingPublication = progress.assessment.passed && !progress.certificate;

  return (
    <AppShell role="user" searchPlaceholder="Search progress, units, quiz scores...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Training Progress</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Your learning <em className="serif-italic">progress</em>.</h1>
          <p className="page-subtitle">Track your units, quiz scores, writing exercises, and certificate status.</p>
        </div>
        {allDone && !progress.assessment.passed && (
          <Link to="/student/assessment" className="btn btn-primary">Take Final Assessment →</Link>
        )}
        {awaitingPublication && (
          <Link to="/student/submit" className="btn btn-primary">Submit Your Paper →</Link>
        )}
        {progress.certificate && (
          <Link to="/student/certificate" className="btn btn-primary">View Certificate →</Link>
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
        <div className="stat fade-up delay-3" style={{ '--accent': progress.certificate ? 'var(--teal-700)' : awaitingPublication ? 'var(--amber-700)' : 'var(--ink-300)' }}>
          <div className="stat-label">Certificate</div>
          <div className="stat-value" style={{ fontSize: 26 }}>
            {progress.certificate ? 'Earned' : awaitingPublication ? 'Submit paper' : 'Pending'}
          </div>
          <div className="stat-trend">
            {progress.certificate
              ? progress.certificate.id
              : awaitingPublication
                ? 'Submit 1 paper to unlock'
                : 'Pass the assessment to earn'}
          </div>
        </div>
      </div>

      {awaitingPublication && (
        <div className="card fade-up delay-2" style={{ borderColor: 'var(--amber-700)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Final step — submit your research paper</div>
              <div className="card-meta">You passed the assessment. Submit one research paper through JSRMS to receive your certificate.</div>
            </div>
            <span className="pill pill-pending">Not submitted</span>
          </div>
          <div className="row" style={{ gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div className="label">Certificate</div>
              <div style={{ fontWeight: 600 }}>Issued as soon as you submit</div>
            </div>
            <div>
              <div className="label">Recommended by</div>
              <div style={{ fontWeight: 600 }}>
                {pub.deadline
                  ? `${new Date(pub.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · no hard deadline`
                  : '—'}
              </div>
            </div>
          </div>
          <Link to="/student/submit" className="btn btn-primary btn-sm">Submit Your Paper →</Link>
        </div>
      )}

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
