// Training progress store (frontend prototype, persisted in localStorage).
// Mirrors the pattern used in demoAccounts.js.

import {
  TRAINING_UNITS,
  PASS_MARK,
  ASSESSMENT_PASS_MARK,
  PUBLICATION_WINDOW_DAYS,
} from './trainingContent.js';

const STORAGE_KEY = 'paperbridge-training-progress';
const DAY_MS = 24 * 60 * 60 * 1000;

function emptyPublication() {
  return {
    status: 'none', // none | pending | submitted | published
    startedAt: null,
    deadline: null,
    paperTitle: null,
    submittedAt: null,
    publishedAt: null,
  };
}

function emptyProgress() {
  const units = {};
  for (const unit of TRAINING_UNITS) {
    units[unit.id] = {
      lessonsRead: [],
      quizScore: null,
      quizPassed: false,
      exerciseSubmitted: false,
      exerciseText: '',
    };
  }
  return {
    units,
    assessment: { attempts: 0, bestScore: null, passed: false, lastAttemptAt: null },
    // Mandatory paper publication that gates the certificate.
    publication: emptyPublication(),
    certificate: null, // { id, name, issuedAt }
  };
}

export function getProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    // Merge with empty so newly added units always exist.
    const base = emptyProgress();
    return {
      ...base,
      ...parsed,
      units: { ...base.units, ...(parsed.units || {}) },
      assessment: { ...base.assessment, ...(parsed.assessment || {}) },
      publication: { ...base.publication, ...(parsed.publication || {}) },
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function resetProgress() {
  window.localStorage.removeItem(STORAGE_KEY);
}

// ---- Unit helpers ----------------------------------------------------------

export function isUnitComplete(unit, progress) {
  const p = progress.units[unit.id];
  if (!p) return false;
  const allLessonsRead = unit.lessons.every((l) => p.lessonsRead.includes(l.id));
  return allLessonsRead && p.quizPassed && p.exerciseSubmitted;
}

// A unit is unlocked if it is the first unit, or the previous unit is complete.
export function isUnitUnlocked(unit, progress) {
  if (unit.order === 1) return true;
  const previous = TRAINING_UNITS.find((u) => u.order === unit.order - 1);
  return previous ? isUnitComplete(previous, progress) : true;
}

export function allUnitsComplete(progress) {
  return TRAINING_UNITS.every((unit) => isUnitComplete(unit, progress));
}

export function countCompletedUnits(progress) {
  return TRAINING_UNITS.filter((unit) => isUnitComplete(unit, progress)).length;
}

export function overallPercent(progress) {
  const totalSteps = TRAINING_UNITS.reduce(
    (sum, unit) => sum + unit.lessons.length + 2, // lessons + quiz + exercise
    0,
  );
  let done = 0;
  for (const unit of TRAINING_UNITS) {
    const p = progress.units[unit.id];
    if (!p) continue;
    done += p.lessonsRead.filter((id) => unit.lessons.some((l) => l.id === id)).length;
    if (p.quizPassed) done += 1;
    if (p.exerciseSubmitted) done += 1;
  }
  return Math.round((done / totalSteps) * 100);
}

// ---- Mutations -------------------------------------------------------------

export function markLessonRead(unitId, lessonId) {
  const progress = getProgress();
  const p = progress.units[unitId];
  if (p && !p.lessonsRead.includes(lessonId)) {
    p.lessonsRead = [...p.lessonsRead, lessonId];
    saveProgress(progress);
  }
  return progress;
}

export function recordQuizScore(unitId, scorePercent) {
  const progress = getProgress();
  const p = progress.units[unitId];
  if (p) {
    p.quizScore = scorePercent;
    p.quizPassed = scorePercent >= PASS_MARK;
    saveProgress(progress);
  }
  return progress;
}

export function submitExercise(unitId, text) {
  const progress = getProgress();
  const p = progress.units[unitId];
  if (p) {
    p.exerciseText = text;
    p.exerciseSubmitted = true;
    saveProgress(progress);
  }
  return progress;
}

export function recordAssessment(scorePercent) {
  const progress = getProgress();
  const a = progress.assessment;
  a.attempts += 1;
  a.lastAttemptAt = new Date().toISOString();
  a.bestScore = a.bestScore === null ? scorePercent : Math.max(a.bestScore, scorePercent);
  if (scorePercent >= ASSESSMENT_PASS_MARK) {
    a.passed = true;
    // Passing starts the mandatory publication requirement (once).
    if (progress.publication.status === 'none') {
      const now = new Date();
      progress.publication = {
        ...emptyPublication(),
        status: 'pending',
        startedAt: now.toISOString(),
        deadline: new Date(now.getTime() + PUBLICATION_WINDOW_DAYS * DAY_MS).toISOString(),
      };
    }
  }
  saveProgress(progress);
  return progress;
}

// ---- Mandatory publication -------------------------------------------------

// Computed view of the publication requirement (adds daysLeft / overdue).
export function publicationState(progress) {
  const p = (progress && progress.publication) || emptyPublication();
  const deadline = p.deadline ? new Date(p.deadline).getTime() : null;
  const now = Date.now();
  const daysLeft =
    deadline === null ? null : Math.ceil((deadline - now) / DAY_MS);
  const overdue =
    (p.status === 'pending' || p.status === 'submitted') &&
    deadline !== null &&
    now > deadline;
  return { ...p, daysLeft, overdue };
}

// Student submits their required paper through JSRMS. Submitting is what the
// student controls, so this is what completes certification: the certificate is
// issued on submission (actual publication is tracked separately, no deadline).
export function submitPublication(title, name) {
  const progress = getProgress();
  const p = progress.publication;
  if (p.status === 'pending' || p.status === 'submitted') {
    const now = new Date().toISOString();
    p.paperTitle = title || p.paperTitle || 'Untitled research paper';
    p.submittedAt = now;
    p.status = 'submitted';
    if (progress.assessment.passed && !progress.certificate) {
      progress.certificate = {
        id: generateCertificateId(),
        name: name || 'JSRMS Student',
        issuedAt: now,
      };
    }
    saveProgress(progress);
  }
  return progress;
}

export function isCertified() {
  return !!getProgress().certificate;
}

// ---- Developer / showcase helpers ------------------------------------------
// Used by the in-app "Showcase tools" panel to jump between demo states.

export function devReset() {
  resetProgress();
  return emptyProgress();
}

export function devCompleteAllUnits() {
  const progress = getProgress();
  for (const unit of TRAINING_UNITS) {
    const p = progress.units[unit.id];
    p.lessonsRead = unit.lessons.map((l) => l.id);
    p.quizScore = 100;
    p.quizPassed = true;
    p.exerciseSubmitted = true;
    if (!p.exerciseText) p.exerciseText = '[Auto-filled for showcase]';
  }
  saveProgress(progress);
  return progress;
}

export function devPassAssessment() {
  devCompleteAllUnits();
  return recordAssessment(100); // also starts the publication requirement
}

// Submit the required paper (issues the certificate) — used by the dev panel.
export function devSubmitPaper(name) {
  if (getProgress().publication.status === 'none') devPassAssessment();
  return submitPublication('Showcase Research Paper', name);
}

function generateCertificateId() {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `JSRMS-${year}-${rand}`;
}
