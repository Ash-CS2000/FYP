import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import {
  buildAssessmentPool,
  ASSESSMENT_PASS_MARK,
  ASSESSMENT_QUESTION_COUNT,
  MAX_ASSESSMENT_ATTEMPTS,
  PUBLICATION_WINDOW_DAYS,
} from '../data/trainingContent.js';
import {
  getProgress,
  allUnitsComplete,
  recordAssessment,
  publicationState,
} from '../data/trainingProgress.js';
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

const EXAM_MINUTES = 20;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function FinalAssessment() {
  const [progress, setProgress] = useState(getProgress);
  const unlocked = allUnitsComplete(progress);

  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(EXAM_MINUTES * 60);
  const timerRef = useRef(null);

  const attemptsLeft = MAX_ASSESSMENT_ATTEMPTS - progress.assessment.attempts;

  const answeredCount = Object.keys(answers).length;
  const progressPercent = useMemo(
    () => (questions.length ? Math.round((answeredCount / questions.length) * 100) : 0),
    [answeredCount, questions.length],
  );

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  function startExam() {
    const pool = buildAssessmentPool();
    const count = Math.min(ASSESSMENT_QUESTION_COUNT, pool.length);
    const picked = shuffle(pool).slice(0, count);
    setQuestions(picked);
    setAnswers({});
    setResult(null);
    setSecondsLeft(EXAM_MINUTES * 60);
    setStarted(true);

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          finishExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function selectAnswer(qId, optionIndex) {
    setAnswers((prev) => ({ ...prev, [qId]: optionIndex }));
  }

  function finishExam(auto = false) {
    clearInterval(timerRef.current);
    let correct = 0;
    questions.forEach((q, idx) => {
      const key = `${q.id}-${idx}`;
      if (answers[key] === q.correctIndex) correct += 1;
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= ASSESSMENT_PASS_MARK;

    // Passing records the result and starts the mandatory publication
    // requirement; the certificate is only issued once a paper is published.
    const updated = recordAssessment(score);
    setProgress(updated);
    setResult({ correct, total: questions.length, score, passed, auto });
    setStarted(false);
  }

  // ---- Locked state --------------------------------------------------------
  if (!unlocked) {
    return (
      <AppShell role="user" searchPlaceholder="Search...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Final Assessment</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>
              Certification <em className="serif-italic">exam</em>.
            </h1>
            <p className="page-subtitle">Pass this exam to earn your publishing certificate.</p>
          </div>
        </div>
        <div className="card fade-up delay-1 exam-locked">
          <div className="unit-locked-icon">🔒</div>
          <h2>Complete all four units first</h2>
          <p>
            The final assessment unlocks once you have finished every training unit — all lessons read,
            all quizzes passed, and all writing exercises submitted.
          </p>
          <Link to="/student/training" className="btn btn-primary">Back to Training →</Link>
        </div>
      </AppShell>
    );
  }

  // ---- Result state --------------------------------------------------------
  if (result) {
    return (
      <AppShell role="user" searchPlaceholder="Search...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Final Assessment</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>Your <em className="serif-italic">result</em>.</h1>
            <p className="page-subtitle">{result.auto ? 'Time ran out — your answers were submitted automatically.' : 'Assessment submitted.'}</p>
          </div>
        </div>

        <div className={`card fade-up delay-1 exam-result ${result.passed ? 'pass' : 'fail'}`}>
          <div className="exam-result-score" style={{ '--accent': result.passed ? 'var(--teal-700)' : 'var(--red-700)' }}>
            <strong>{result.score}%</strong>
            <span>{result.correct}/{result.total} correct</span>
          </div>
          <div className="exam-result-body">
            {result.passed ? (
              <>
                <h2>Congratulations — you passed!</h2>
                <p>
                  You scored {result.score}%, above the {ASSESSMENT_PASS_MARK}% pass mark. One final step
                  completes your certification: <strong>submit one research paper through JSRMS</strong>.
                  Your certificate is issued as soon as you submit.
                </p>
                {(() => {
                  const pub = publicationState(progress);
                  return (
                    <div className="unit-todo-banner" style={{ marginTop: 16 }}>
                      <strong>Final step — submit your research paper</strong>
                      <span className="todo">Submit one research paper through JSRMS to earn your certificate</span>
                      {pub.deadline && (
                        <span className="todo">Recommended by {formatDate(pub.deadline)} (~{PUBLICATION_WINDOW_DAYS} days) — no hard deadline</span>
                      )}
                    </div>
                  );
                })()}
                <div className="row" style={{ marginTop: 16 }}>
                  <Link to="/student/submit" className="btn btn-primary">Submit Your Paper →</Link>
                  <Link to="/student/certificate" className="btn btn-ghost">View Certificate Status</Link>
                </div>
              </>
            ) : (
              <>
                <h2>Not quite there yet</h2>
                <p>
                  You scored {result.score}%. You need {ASSESSMENT_PASS_MARK}% to pass.
                  {attemptsLeft > 0
                    ? ` You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`
                    : ' You have used all your attempts — please contact your coordinator.'}
                </p>
                {attemptsLeft > 0 && (
                  <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={startExam}>
                    Try Again →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  // ---- Intro state ---------------------------------------------------------
  if (!started) {
    return (
      <AppShell role="user" searchPlaceholder="Search...">
        <div className="page-header fade-up">
          <div>
            <span className="eyebrow">Final Assessment</span>
            <h1 className="page-title" style={{ marginTop: 8 }}>
              Certification <em className="serif-italic">exam</em>.
            </h1>
            <p className="page-subtitle">One last step before you earn your publishing certificate.</p>
          </div>
        </div>

        <div className="split-grid fade-up delay-1" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Before you begin</div></div>
            <ul className="exam-rules">
              <li><strong>{ASSESSMENT_QUESTION_COUNT} questions</strong> drawn from all four units.</li>
              <li>You need <strong>{ASSESSMENT_PASS_MARK}%</strong> or higher to pass.</li>
              <li>You have <strong>{EXAM_MINUTES} minutes</strong> — a timer will show on screen.</li>
              <li>If time runs out, your answers are submitted automatically.</li>
              <li>You have <strong>{attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'}</strong> remaining.</li>
            </ul>
            {attemptsLeft > 0 ? (
              <button className="btn btn-primary" onClick={startExam}>Start Assessment →</button>
            ) : (
              <p className="exam-no-attempts">You have used all {MAX_ASSESSMENT_ATTEMPTS} attempts. Please contact your training coordinator.</p>
            )}
          </div>

          <div className="gap-grid">
            <div className="stat" style={{ '--accent': 'var(--teal-700)' }}>
              <div className="stat-label">Best Score</div>
              <div className="stat-value">{progress.assessment.bestScore === null ? '--' : `${progress.assessment.bestScore}%`}</div>
              <div className="stat-trend">{progress.assessment.attempts} attempt{progress.assessment.attempts === 1 ? '' : 's'} used</div>
            </div>
            <div className="stat" style={{ '--accent': progress.certificate ? 'var(--teal-700)' : 'var(--amber-700)' }}>
              <div className="stat-label">Certificate</div>
              <div className="stat-value" style={{ fontSize: 26 }}>{progress.certificate ? 'Earned' : 'Pending'}</div>
              <div className="stat-trend">{progress.certificate ? progress.certificate.id : 'Pass to unlock'}</div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // ---- Active exam state ---------------------------------------------------
  return (
    <AppShell role="user" searchPlaceholder="Search...">
      <div className="exam-bar fade-up">
        <div>
          <span className="eyebrow">Final Assessment in progress</span>
          <div className="exam-progress-text">{answeredCount} of {questions.length} answered</div>
        </div>
        <div className={`exam-timer ${secondsLeft < 120 ? 'low' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          {formatTime(secondsLeft)}
        </div>
      </div>

      <div className="progress" style={{ '--accent': 'var(--navy-700)', marginBottom: 22 }}>
        <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="card fade-up delay-1">
        {questions.map((q, idx) => {
          const key = `${q.id}-${idx}`;
          const chosen = answers[key];
          return (
            <div className="quiz-block" key={key}>
              <div className="quiz-question">{idx + 1}. {q.question}</div>
              <div className="quiz-options">
                {q.options.map((option, index) => (
                  <button
                    type="button"
                    className={`quiz-option ${chosen === index ? 'selected' : ''}`}
                    key={option}
                    onClick={() => selectAnswer(key, index)}
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <div className="exam-submit-row">
          <span className="muted">{answeredCount}/{questions.length} answered</span>
          <button className="btn btn-primary" onClick={() => finishExam(false)}>
            Submit Assessment →
          </button>
        </div>
      </div>
    </AppShell>
  );
}
