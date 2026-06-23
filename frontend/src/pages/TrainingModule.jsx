import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { TRAINING_UNITS, PASS_MARK } from '../data/trainingContent.js';
import {
  getProgress,
  markLessonRead,
  recordQuizScore,
  submitExercise,
  isUnitComplete,
  isUnitUnlocked,
  allUnitsComplete,
  countCompletedUnits,
  overallPercent,
  publicationState,
  devReset,
  devCompleteAllUnits,
  devPassAssessment,
  devSubmitPaper,
} from '../data/trainingProgress.js';

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function TrainingModule() {
  const [progress, setProgress] = useState(getProgress);
  const [selectedUnitId, setSelectedUnitId] = useState(TRAINING_UNITS[0].id);
  const [selectedLessonId, setSelectedLessonId] = useState(TRAINING_UNITS[0].lessons[0].id);
  // which module item is open in the content panel: 'lesson' | 'quiz' | 'assignment'
  const [activeView, setActiveView] = useState('lesson');

  // quiz state (per view)
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);

  // exercise state
  const [exerciseDraft, setExerciseDraft] = useState('');
  const [showSample, setShowSample] = useState(false);

  // dev / showcase panel
  const [showDev, setShowDev] = useState(false);

  // collapsible units rail
  const [railOpen, setRailOpen] = useState(true);

  const selectedUnit = TRAINING_UNITS.find((u) => u.id === selectedUnitId);
  const unitProgress = progress.units[selectedUnit.id];
  const unlocked = isUnitUnlocked(selectedUnit, progress);
  const selectedLesson =
    selectedUnit.lessons.find((l) => l.id === selectedLessonId) || selectedUnit.lessons[0];

  const overall = useMemo(
    () => ({
      percent: overallPercent(progress),
      completedUnits: countCompletedUnits(progress),
      allDone: allUnitsComplete(progress),
    }),
    [progress],
  );

  const lessonsReadCount = unitProgress.lessonsRead.filter((id) =>
    selectedUnit.lessons.some((l) => l.id === id),
  ).length;

  const selectedLessonIndex = selectedUnit.lessons.findIndex((l) => l.id === selectedLesson.id);
  const nextLesson = selectedUnit.lessons[selectedLessonIndex + 1];
  const lessonRead = unitProgress.lessonsRead.includes(selectedLesson.id);
  // Quiz + assignment unlock only after every lesson in the unit has been read.
  const allLessonsRead = lessonsReadCount === selectedUnit.lessons.length;

  function selectUnit(unit) {
    if (!isUnitUnlocked(unit, progress)) return;
    setSelectedUnitId(unit.id);
    setSelectedLessonId(unit.lessons[0].id);
    setActiveView('lesson');
    setAnswers({});
    setQuizResult(null);
    setExerciseDraft(progress.units[unit.id].exerciseText || '');
    setShowSample(false);
  }

  function handleMarkRead() {
    setProgress(markLessonRead(selectedUnit.id, selectedLesson.id));
  }

  function handleNextLesson() {
    // mark the current lesson read as the student moves on
    const updated = markLessonRead(selectedUnit.id, selectedLesson.id);
    setProgress(updated);
    if (nextLesson) setSelectedLessonId(nextLesson.id);
  }

  function selectAnswer(questionId, optionIndex) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  function handleSubmitQuiz() {
    const total = selectedUnit.quiz.length;
    let correct = 0;
    for (const q of selectedUnit.quiz) {
      if (answers[q.id] === q.correctIndex) correct += 1;
    }
    const score = Math.round((correct / total) * 100);
    setQuizResult({ correct, total, score });
    setProgress(recordQuizScore(selectedUnit.id, score));
  }

  function handleSubmitExercise() {
    setProgress(submitExercise(selectedUnit.id, exerciseDraft));
    setShowSample(true);
  }

  // Apply a dev/showcase action, then re-sync the local view state.
  function applyDev(fn) {
    const updated = fn();
    setProgress(updated);
    setSelectedUnitId(TRAINING_UNITS[0].id);
    setSelectedLessonId(TRAINING_UNITS[0].lessons[0].id);
    setActiveView('lesson');
    setAnswers({});
    setQuizResult(null);
    setExerciseDraft('');
    setShowSample(false);
  }

  const allQuizAnswered = selectedUnit.quiz.every((q) => answers[q.id] !== undefined);
  const exerciseWordCount = countWords(exerciseDraft);
  const exerciseLongEnough = exerciseWordCount >= selectedUnit.exercise.minWords;
  const unitDone = isUnitComplete(selectedUnit, progress);

  return (
    <AppShell role="student" searchPlaceholder="Search lessons, units, quiz topics...">
      <div className="lms-toolbar fade-up">
        <div className="lms-toolbar-id">
          <span className="lms-toolbar-eyebrow">Student Training</span>
          <span className="lms-toolbar-title">Research Publishing Programme</span>
        </div>
        <div className="lms-toolbar-progress">
          <div className="lms-toolbar-progress-head">
            <span className="lms-toolbar-pct">{overall.percent}% complete</span>
            <span className="lms-toolbar-sub">{overall.completedUnits} of {TRAINING_UNITS.length} modules</span>
          </div>
          <div className="lms-toolbar-track"><span style={{ width: `${overall.percent}%` }} /></div>
        </div>
        <div className="lms-toolbar-action">
          {progress.certificate ? (
            <Link to="/student/certificate" className="btn btn-primary btn-sm">View Certificate →</Link>
          ) : progress.assessment.passed ? (
            <Link to="/student/submit" className="btn btn-primary btn-sm">Submit Your Paper →</Link>
          ) : overall.allDone ? (
            <Link to="/student/assessment" className="btn btn-primary btn-sm">Take Final Assessment →</Link>
          ) : (
            <span className="lms-toolbar-hint">
              {TRAINING_UNITS.length - overall.completedUnits} module{TRAINING_UNITS.length - overall.completedUnits === 1 ? '' : 's'} to the assessment
            </span>
          )}
        </div>
      </div>

      <div className={`training-layout ${railOpen ? '' : 'rail-collapsed'}`}>
        {railOpen && (
        <aside className="training-path fade-up delay-2">
          <div className="training-path-header">
            <div className="label">Units</div>
            <div className="row" style={{ gap: 8 }}>
              <div className="training-path-count">{TRAINING_UNITS.length}</div>
              <button
                type="button"
                className="rail-toggle"
                onClick={() => setRailOpen(false)}
                title="Hide units"
                aria-label="Hide units"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            </div>
          </div>

          <div className="unit-path">
            {TRAINING_UNITS.map((unit) => {
              const done = isUnitComplete(unit, progress);
              const open = isUnitUnlocked(unit, progress);
              const isActive = unit.id === selectedUnit.id;

              const up = progress.units[unit.id];
              const readCount = unit.lessons.filter((l) => up.lessonsRead.includes(l.id)).length;
              const totalSteps = unit.lessons.length + 2; // lessons + quiz + exercise
              const doneSteps = readCount + (up.quizPassed ? 1 : 0) + (up.exerciseSubmitted ? 1 : 0);
              const pct = Math.round((doneSteps / totalSteps) * 100);
              const status = done
                ? 'Completed'
                : !open
                  ? 'Locked'
                  : doneSteps > 0
                    ? 'In progress'
                    : 'Not started';
              const statusCls = done ? 'is-done' : !open ? 'is-locked' : doneSteps > 0 ? 'is-active' : '';

              return (
                <button
                  className={`unit-step ${isActive ? 'active' : ''} ${done ? 'done' : ''} ${open ? '' : 'locked'}`}
                  key={unit.id}
                  type="button"
                  onClick={() => selectUnit(unit)}
                  disabled={!open}
                  style={{ '--accent': unit.accent }}
                >
                  <div className="unit-step-rail">
                    <span className="unit-step-dot">
                      {done ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="13" height="13"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : open ? (
                        String(unit.order).padStart(2, '0')
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      )}
                    </span>
                  </div>
                  <div className="unit-step-body">
                    <div className="unit-step-head">
                      <span className="unit-step-track">{unit.track}</span>
                      <span className={`unit-step-status ${statusCls}`}>{status}</span>
                    </div>
                    <div className="unit-step-title">{unit.title}</div>
                    <div className="unit-step-meta">
                      {readCount}/{unit.lessons.length} lessons · {pct}%
                    </div>
                    <div className="unit-step-bar">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
        )}

        {!railOpen && (
          <aside className="training-rail-mini fade-up">
            <button
              type="button"
              className="rail-mini-expand"
              onClick={() => setRailOpen(true)}
              title="Show units"
              aria-label="Show units"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <div className="rail-mini-label">Units</div>
            <div className="rail-mini-dots">
              {TRAINING_UNITS.map((unit) => {
                const done = isUnitComplete(unit, progress);
                const open = isUnitUnlocked(unit, progress);
                const isActive = unit.id === selectedUnit.id;
                return (
                  <button
                    key={unit.id}
                    type="button"
                    className={`rail-mini-dot ${isActive ? 'active' : ''} ${done ? 'done' : ''} ${open ? '' : 'locked'}`}
                    style={{ '--accent': unit.accent }}
                    onClick={() => open && selectUnit(unit)}
                    disabled={!open}
                    title={`Unit ${unit.order} — ${unit.title}`}
                  >
                    {done ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : open ? (
                      unit.order
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        <section className="training-workspace fade-up delay-3">
          {!unlocked ? (
            <div className="unit-locked-panel">
              <div className="unit-locked-icon">🔒</div>
              <h2>This unit is locked</h2>
              <p>Finish the previous unit — read all lessons, pass the quiz, and submit the writing exercise — to unlock this one.</p>
            </div>
          ) : (
            <>
              {/* Module header */}
              <header className="lms-header" style={{ '--accent': selectedUnit.accent }}>
                <div className="lms-header-top">
                  <span className="lms-crumb">Module {selectedUnit.order} of {TRAINING_UNITS.length} · {selectedUnit.track}</span>
                  {unitDone && <span className="lms-chip is-done">Completed</span>}
                </div>
                <h2 className="lms-header-title">{selectedUnit.title}</h2>
                <p className="lms-header-sub">{selectedUnit.summary}</p>
              </header>

              {/* Requirements */}
              {unitDone ? (
                <div className="lms-banner is-done">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width="18" height="18"><polyline points="20 6 9 17 4 12" /></svg>
                  <span>Module complete — well done. {selectedUnit.order < TRAINING_UNITS.length ? 'The next module is now unlocked.' : 'You can now take the final assessment.'}</span>
                </div>
              ) : (
                <div className="lms-reqs">
                  <div className="lms-reqs-title">Requirements to complete this module</div>
                  <ul>
                    <li className={lessonsReadCount === selectedUnit.lessons.length ? 'done' : ''}>
                      Read all {selectedUnit.lessons.length} lessons ({lessonsReadCount}/{selectedUnit.lessons.length})
                    </li>
                    <li className={unitProgress.quizPassed ? 'done' : ''}>
                      Score at least {PASS_MARK}% on the quiz
                    </li>
                    <li className={unitProgress.exerciseSubmitted ? 'done' : ''}>
                      Submit the writing assignment
                    </li>
                  </ul>
                </div>
              )}

              {/* MODULE — single item list: lessons, then quiz + assignment */}
              <section className="lms-module">
                <div className="lms-module-bar">
                  <span className="lms-module-name">Module content</span>
                  <span className="lms-module-count">
                    {lessonsReadCount + (unitProgress.quizPassed ? 1 : 0) + (unitProgress.exerciseSubmitted ? 1 : 0)} / {selectedUnit.lessons.length + 2} complete
                  </span>
                </div>
                <div className="lms-items">
                  {selectedUnit.lessons.map((lesson) => {
                    const read = unitProgress.lessonsRead.includes(lesson.id);
                    const active = activeView === 'lesson' && lesson.id === selectedLesson.id;
                    return (
                      <button
                        type="button"
                        className={`lms-item ${active ? 'active' : ''}`}
                        key={lesson.id}
                        onClick={() => { setSelectedLessonId(lesson.id); setActiveView('lesson'); }}
                      >
                        <span className="lms-item-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h6" /></svg>
                        </span>
                        <span className="lms-item-text">
                          <span className="lms-item-title">{lesson.title}</span>
                          <span className="lms-item-meta">Page · {lesson.duration}</span>
                        </span>
                        <span className={`lms-item-check ${read ? 'done' : ''}`}>
                          {read && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg>}
                        </span>
                      </button>
                    );
                  })}

                  <div className="lms-items-divider">
                    Assessment
                    {!allLessonsRead && <span className="lms-items-divider-note">Unlocks when all lessons are read</span>}
                  </div>

                  {/* Quiz item */}
                  <button
                    type="button"
                    className={`lms-item ${activeView === 'quiz' ? 'active' : ''} ${allLessonsRead ? '' : 'locked'}`}
                    onClick={() => allLessonsRead && setActiveView('quiz')}
                    disabled={!allLessonsRead}
                  >
                    <span className="lms-item-icon">
                      {allLessonsRead ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="15" height="15"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      )}
                    </span>
                    <span className="lms-item-text">
                      <span className="lms-item-title">Unit Quiz</span>
                      <span className="lms-item-meta">
                        {allLessonsRead
                          ? `Quiz · ${selectedUnit.quiz.length} questions${unitProgress.quizScore !== null ? ` · best ${unitProgress.quizScore}%` : ''}`
                          : 'Locked · read all lessons first'}
                      </span>
                    </span>
                    <span className={`lms-item-check ${unitProgress.quizPassed ? 'done' : ''}`}>
                      {unitProgress.quizPassed && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg>}
                    </span>
                  </button>

                  {/* Assignment item */}
                  <button
                    type="button"
                    className={`lms-item ${activeView === 'assignment' ? 'active' : ''} ${allLessonsRead ? '' : 'locked'}`}
                    onClick={() => allLessonsRead && setActiveView('assignment')}
                    disabled={!allLessonsRead}
                  >
                    <span className="lms-item-icon">
                      {allLessonsRead ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="16" height="16"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="15" height="15"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      )}
                    </span>
                    <span className="lms-item-text">
                      <span className="lms-item-title">Writing Assignment</span>
                      <span className="lms-item-meta">
                        {allLessonsRead ? 'Assignment · short written answer' : 'Locked · read all lessons first'}
                      </span>
                    </span>
                    <span className={`lms-item-check ${unitProgress.exerciseSubmitted ? 'done' : ''}`}>
                      {unitProgress.exerciseSubmitted && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" width="12" height="12"><polyline points="20 6 9 17 4 12" /></svg>}
                    </span>
                  </button>
                </div>
              </section>

              {/* CONTENT PANEL — the open module item */}
              {activeView === 'lesson' && (
                <article className="lms-page">
                  <div className="lms-page-head">
                    <div>
                      <span className="lms-kicker">Page · {selectedLessonIndex + 1} of {selectedUnit.lessons.length}</span>
                      <h3>{selectedLesson.title}</h3>
                    </div>
                    <span className="lms-pill">{selectedLesson.duration}</span>
                  </div>
                  <div className="lms-prose">
                    {selectedLesson.content.split('\n\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>

                  {selectedLesson.keyPoints && selectedLesson.keyPoints.length > 0 && (
                    <div className="lms-block">
                      <div className="lms-block-label">Key points</div>
                      <ul className="lms-keypoints">
                        {selectedLesson.keyPoints.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedLesson.example && (
                    <div className="lms-example">
                      <div className="lms-block-label">Worked example</div>
                      <p>{selectedLesson.example}</p>
                    </div>
                  )}

                  {selectedLesson.mistakes && selectedLesson.mistakes.length > 0 && (
                    <div className="lms-block">
                      <div className="lms-block-label">Common mistakes</div>
                      <ul className="lms-mistakes">
                        {selectedLesson.mistakes.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="lms-callout">
                    <span className="lms-callout-label">Key takeaway</span>
                    <p>{selectedLesson.takeaway}</p>
                  </div>
                  <div className="lms-page-actions">
                    <button className="btn btn-success" type="button" onClick={handleMarkRead} disabled={lessonRead}>
                      {lessonRead ? 'Marked as done ✓' : 'Mark as done'}
                    </button>
                    {nextLesson ? (
                      <button className="btn btn-ghost" type="button" onClick={handleNextLesson}>
                        Next page →
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => setActiveView('quiz')}
                        disabled={!allLessonsRead}
                        title={allLessonsRead ? '' : 'Mark all lessons as done first'}
                      >
                        Continue to Quiz →
                      </button>
                    )}
                  </div>
                </article>
              )}

              {activeView === 'quiz' && (
                <article className="lms-page">
                  <div className="lms-page-head">
                    <div>
                      <span className="lms-kicker">Quiz</span>
                      <h3>Unit Quiz — check your understanding</h3>
                    </div>
                    {unitProgress.quizScore !== null ? (
                      <span className={`lms-pill ${unitProgress.quizPassed ? 'is-pass' : 'is-fail'}`}>Best {unitProgress.quizScore}%</span>
                    ) : (
                      <span className="lms-pill">{selectedUnit.quiz.length} questions</span>
                    )}
                  </div>

                  <p className="lms-quiz-hint">You need {PASS_MARK}% or higher to pass this quiz. You can retake it as many times as you like.</p>

                  {selectedUnit.quiz.map((q, qIndex) => {
                    const chosen = answers[q.id];
                    const graded = quizResult !== null;
                    return (
                      <div className="quiz-block" key={q.id}>
                        <div className="quiz-question">{qIndex + 1}. {q.question}</div>
                        <div className="quiz-options">
                          {q.options.map((option, index) => {
                            let cls = 'quiz-option';
                            if (chosen === index) cls += ' selected';
                            if (graded && index === q.correctIndex) cls += ' correct';
                            if (graded && chosen === index && index !== q.correctIndex) cls += ' wrong';
                            return (
                              <button
                                type="button"
                                className={cls}
                                key={option}
                                onClick={() => !graded && selectAnswer(q.id, index)}
                              >
                                <span>{String.fromCharCode(65 + index)}</span>
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {quizResult ? (
                    <div className={`quiz-result ${quizResult.score >= PASS_MARK ? 'pass' : 'fail'}`}>
                      <strong>
                        You scored {quizResult.score}% ({quizResult.correct}/{quizResult.total}).
                      </strong>{' '}
                      {quizResult.score >= PASS_MARK
                        ? 'You passed this quiz.'
                        : `You need ${PASS_MARK}% to pass. Review the lessons and try again.`}
                      <div style={{ marginTop: 10 }} className="row">
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() => { setQuizResult(null); setAnswers({}); }}
                        >
                          Retake Quiz
                        </button>
                        {quizResult.score >= PASS_MARK && !unitProgress.exerciseSubmitted && (
                          <button className="btn btn-primary btn-sm" type="button" onClick={() => setActiveView('assignment')}>
                            Continue to Assignment →
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      type="button"
                      onClick={handleSubmitQuiz}
                      disabled={!allQuizAnswered}
                    >
                      Submit Quiz ({Object.keys(answers).length}/{selectedUnit.quiz.length} answered)
                    </button>
                  )}
                </article>
              )}

              {activeView === 'assignment' && (
                <article className="lms-page">
                  <div className="lms-page-head">
                    <div>
                      <span className="lms-kicker">Assignment</span>
                      <h3>Writing Exercise — practise what you learned</h3>
                    </div>
                    {unitProgress.exerciseSubmitted && <span className="lms-pill is-pass">Submitted</span>}
                  </div>

                  <div className="lms-callout subtle">
                    <span className="lms-callout-label">Instructions</span>
                    <p>{selectedUnit.exercise.prompt}</p>
                  </div>

                  <textarea
                    className="field-textarea"
                    rows="7"
                    placeholder="Write your answer here..."
                    value={exerciseDraft}
                    onChange={(e) => setExerciseDraft(e.target.value)}
                  />
                  <div className="lms-assignment-foot">
                    <span className={exerciseLongEnough ? 'words ok' : 'words'}>
                      {exerciseWordCount} words (minimum {selectedUnit.exercise.minWords})
                    </span>
                    <div className="row">
                      {(unitProgress.exerciseSubmitted || showSample) && (
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowSample((s) => !s)}>
                          {showSample ? 'Hide sample answer' : 'Show sample answer'}
                        </button>
                      )}
                      <button
                        className="btn btn-success btn-sm"
                        type="button"
                        onClick={handleSubmitExercise}
                        disabled={!exerciseLongEnough}
                      >
                        {unitProgress.exerciseSubmitted ? 'Resubmit' : 'Submit Assignment'}
                      </button>
                    </div>
                  </div>

                  {showSample && (
                    <div className="exercise-sample">
                      <div className="feedback-label">Sample answer (for comparison)</div>
                      <p>{selectedUnit.exercise.sample}</p>
                    </div>
                  )}
                </article>
              )}
            </>
          )}
        </section>
      </div>

      {/* Developer / showcase tools — discreet strip at the very bottom. */}
      <div className="lms-devbar">
        <div className="lms-devbar-head">
          <span>🛠 Showcase / developer tools — for presenting only</span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowDev((s) => !s)}>
            {showDev ? 'Hide' : 'Show'}
          </button>
        </div>
        {showDev && (() => {
          const pub = publicationState(progress);
          const stateLabel = progress.certificate
            ? 'Certified ✓'
            : pub.status === 'pending'
              ? 'Awaiting paper submission'
              : progress.assessment.passed
                ? 'Assessment passed'
                : `${overall.completedUnits}/${TRAINING_UNITS.length} units complete`;
          return (
            <div className="lms-devbar-body">
              <div className="unit-todo-banner" style={{ marginBottom: 14 }}>
                <strong>Current state: {stateLabel}</strong>
                <span className="todo">Assessment: {progress.assessment.passed ? 'passed' : 'not passed'}</span>
                <span className="todo">Publication: {pub.status}</span>
                <span className="todo">Certificate: {progress.certificate ? progress.certificate.id : 'none'}</span>
              </div>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => applyDev(() => devCompleteAllUnits())}>
                  Complete all units
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => applyDev(() => devPassAssessment())}>
                  Pass assessment
                </button>
                <button className="btn btn-success btn-sm" type="button" onClick={() => applyDev(() => devSubmitPaper('JSRMS Student'))}>
                  Submit paper → issue certificate
                </button>
                <button className="btn btn-danger btn-sm" type="button" onClick={() => applyDev(() => devReset())}>
                  Reset all progress
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </AppShell>
  );
}
