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
} from '../data/trainingProgress.js';

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function TrainingModule() {
  const [progress, setProgress] = useState(getProgress);
  const [selectedUnitId, setSelectedUnitId] = useState(TRAINING_UNITS[0].id);
  const [selectedLessonId, setSelectedLessonId] = useState(TRAINING_UNITS[0].lessons[0].id);

  // quiz state (per view)
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);

  // exercise state
  const [exerciseDraft, setExerciseDraft] = useState('');
  const [showSample, setShowSample] = useState(false);

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
  const unitPercent = Math.round((lessonsReadCount / selectedUnit.lessons.length) * 100);

  const selectedLessonIndex = selectedUnit.lessons.findIndex((l) => l.id === selectedLesson.id);
  const nextLesson = selectedUnit.lessons[selectedLessonIndex + 1];
  const lessonRead = unitProgress.lessonsRead.includes(selectedLesson.id);

  function selectUnit(unit) {
    if (!isUnitUnlocked(unit, progress)) return;
    setSelectedUnitId(unit.id);
    setSelectedLessonId(unit.lessons[0].id);
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

  const allQuizAnswered = selectedUnit.quiz.every((q) => answers[q.id] !== undefined);
  const exerciseWordCount = countWords(exerciseDraft);
  const exerciseLongEnough = exerciseWordCount >= selectedUnit.exercise.minWords;
  const unitDone = isUnitComplete(selectedUnit, progress);

  return (
    <AppShell role="user" searchPlaceholder="Search lessons, units, quiz topics...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Student Training</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            Qualify to <em className="serif-italic">publish</em> your research.
          </h1>
          <p className="page-subtitle">
            Complete all four units, then pass the final assessment to earn your certificate.
          </p>
        </div>
        {overall.allDone ? (
          <Link to="/user/assessment" className="btn btn-primary">Go to Final Assessment →</Link>
        ) : (
          <span className="pill pill-review">Final assessment locks until all units are done</span>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat fade-up delay-1" style={{ '--accent': 'var(--navy-700)' }}>
          <div className="stat-label">Overall Progress</div>
          <div className="stat-value">{overall.percent}%</div>
          <div className="stat-trend">{overall.completedUnits} of {TRAINING_UNITS.length} units complete</div>
        </div>
        <div className="stat fade-up delay-2" style={{ '--accent': 'var(--teal-700)' }}>
          <div className="stat-label">Current Unit</div>
          <div className="stat-value" style={{ fontSize: 28 }}>{selectedUnit.track}</div>
          <div className="stat-trend">Unit {selectedUnit.order} of {TRAINING_UNITS.length}</div>
        </div>
        <div className="stat fade-up delay-3" style={{ '--accent': overall.allDone ? 'var(--teal-700)' : 'var(--amber-700)' }}>
          <div className="stat-label">Certificate Status</div>
          <div className="stat-value" style={{ fontSize: 28 }}>
            {progress.certificate ? 'Earned' : overall.allDone ? 'Ready' : 'Locked'}
          </div>
          <div className="stat-trend">
            {progress.certificate ? 'View it on your profile' : 'Finish training to unlock'}
          </div>
        </div>
      </div>

      <div className="training-layout">
        <aside className="training-path fade-up delay-2">
          <div className="training-path-header">
            <div className="label">Units</div>
            <div className="training-path-count">{TRAINING_UNITS.length}</div>
          </div>

          <div className="training-module-list">
            {TRAINING_UNITS.map((unit) => {
              const done = isUnitComplete(unit, progress);
              const open = isUnitUnlocked(unit, progress);
              const isActive = unit.id === selectedUnit.id;

              return (
                <button
                  className={`training-module-card ${isActive ? 'active' : ''} ${open ? '' : 'locked'}`}
                  key={unit.id}
                  type="button"
                  onClick={() => selectUnit(unit)}
                  disabled={!open}
                >
                  <div className="training-module-index" style={{ '--accent': unit.accent }}>
                    {done ? '✓' : open ? String(unit.order).padStart(2, '0') : '🔒'}
                  </div>
                  <div className="training-module-summary">
                    <div className="training-module-title">{unit.title}</div>
                    <div className="training-module-meta">
                      {unit.track} · {unit.lessons.length} lessons
                    </div>
                    <div className="unit-checklist">
                      <span className={done || unitChecklistLessons(unit, progress) ? 'tick on' : 'tick'}>Lessons</span>
                      <span className={progress.units[unit.id].quizPassed ? 'tick on' : 'tick'}>Quiz</span>
                      <span className={progress.units[unit.id].exerciseSubmitted ? 'tick on' : 'tick'}>Writing</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="training-workspace fade-up delay-3">
          {!unlocked ? (
            <div className="unit-locked-panel">
              <div className="unit-locked-icon">🔒</div>
              <h2>This unit is locked</h2>
              <p>Finish the previous unit — read all lessons, pass the quiz, and submit the writing exercise — to unlock this one.</p>
            </div>
          ) : (
            <>
              <div className="training-workspace-header">
                <div>
                  <span className="eyebrow">Unit {selectedUnit.order} · {selectedUnit.track}</span>
                  <h2>{selectedUnit.title}</h2>
                  <p>{selectedUnit.summary}</p>
                </div>
                <div className="training-progress-ring" style={{ '--accent': selectedUnit.accent }}>
                  <strong>{unitPercent}%</strong>
                  <span>lessons</span>
                </div>
              </div>

              {unitDone ? (
                <div className="unit-complete-banner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width="18" height="18"><polyline points="20 6 9 17 4 12" /></svg>
                  Unit complete — well done. {selectedUnit.order < TRAINING_UNITS.length ? 'The next unit is now unlocked.' : 'You can now take the final assessment.'}
                </div>
              ) : (
                <div className="unit-todo-banner">
                  <strong>To finish this unit:</strong>
                  <span className={lessonsReadCount === selectedUnit.lessons.length ? 'todo done' : 'todo'}>
                    Read all {selectedUnit.lessons.length} lessons ({lessonsReadCount}/{selectedUnit.lessons.length})
                  </span>
                  <span className={unitProgress.quizPassed ? 'todo done' : 'todo'}>
                    Pass the quiz ({PASS_MARK}%+)
                  </span>
                  <span className={unitProgress.exerciseSubmitted ? 'todo done' : 'todo'}>
                    Submit the writing exercise
                  </span>
                </div>
              )}

              {/* Lessons */}
              <div className="training-lesson-grid">
                <div className="training-lessons">
                  {selectedUnit.lessons.map((lesson) => {
                    const read = unitProgress.lessonsRead.includes(lesson.id);
                    const active = lesson.id === selectedLesson.id;
                    return (
                      <button
                        type="button"
                        className={`training-lesson-item ${active ? 'active' : ''}`}
                        key={lesson.id}
                        onClick={() => setSelectedLessonId(lesson.id)}
                      >
                        <span className={read ? 'lesson-check done' : 'lesson-check'}>{read ? '✓' : ''}</span>
                        <span>
                          <strong>{lesson.title}</strong>
                          <small>{lesson.duration}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <article className="training-lesson-panel">
                  <div className="training-lesson-heading">
                    <div>
                      <span className="label">Lesson</span>
                      <h3>{selectedLesson.title}</h3>
                    </div>
                    <span className="pill pill-pending">{selectedLesson.duration}</span>
                  </div>
                  <p>{selectedLesson.content}</p>

                  <div className="training-example">
                    <div className="feedback-label">Key takeaway</div>
                    <div className="feedback-text">{selectedLesson.takeaway}</div>
                  </div>

                  <div className="training-lesson-actions">
                    <button className="btn btn-success" type="button" onClick={handleMarkRead} disabled={lessonRead}>
                      {lessonRead ? 'Lesson Read ✓' : 'Mark Lesson as Read'}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={handleNextLesson} disabled={!nextLesson}>
                      Next Lesson →
                    </button>
                  </div>
                </article>
              </div>

              {/* Quiz */}
              <div className="training-quiz">
                <div className="training-quiz-header">
                  <div>
                    <span className="label">Unit Quiz · {selectedUnit.quiz.length} questions</span>
                    <h3>Check your understanding</h3>
                  </div>
                  {unitProgress.quizScore !== null && (
                    <span className={unitProgress.quizPassed ? 'pill pill-approved' : 'pill pill-rejected'}>
                      Best score {unitProgress.quizScore}%
                    </span>
                  )}
                </div>

                <p className="quiz-hint">You need {PASS_MARK}% or higher to pass this quiz. You can retake it.</p>

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
                    <div style={{ marginTop: 10 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => { setQuizResult(null); setAnswers({}); }}
                      >
                        Retake Quiz
                      </button>
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
              </div>

              {/* Writing exercise */}
              <div className="writing-exercise">
                <div className="training-quiz-header">
                  <div>
                    <span className="label">Writing Exercise</span>
                    <h3>Practise what you learned</h3>
                  </div>
                  {unitProgress.exerciseSubmitted && <span className="pill pill-approved">Submitted ✓</span>}
                </div>

                <div className="exercise-prompt">{selectedUnit.exercise.prompt}</div>

                <textarea
                  className="field-textarea"
                  rows="7"
                  placeholder="Write your answer here..."
                  value={exerciseDraft}
                  onChange={(e) => setExerciseDraft(e.target.value)}
                />
                <div className="exercise-meta">
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
                      {unitProgress.exerciseSubmitted ? 'Update Answer' : 'Submit Exercise'}
                    </button>
                  </div>
                </div>

                {showSample && (
                  <div className="exercise-sample">
                    <div className="feedback-label">Sample answer (for comparison)</div>
                    <p>{selectedUnit.exercise.sample}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

// small helper to show the lessons tick on the unit card
function unitChecklistLessons(unit, progress) {
  const p = progress.units[unit.id];
  if (!p) return false;
  return unit.lessons.every((l) => p.lessonsRead.includes(l.id));
}
