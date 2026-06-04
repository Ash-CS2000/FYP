// Training progress store (frontend prototype, persisted in localStorage).
// Mirrors the pattern used in demoAccounts.js.

import {
  TRAINING_UNITS,
  PASS_MARK,
  ASSESSMENT_PASS_MARK,
} from './trainingContent.js';

const STORAGE_KEY = 'paperbridge-training-progress';

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
  if (scorePercent >= ASSESSMENT_PASS_MARK) a.passed = true;
  saveProgress(progress);
  return progress;
}

export function issueCertificate(name) {
  const progress = getProgress();
  if (!progress.assessment.passed) return progress;
  if (!progress.certificate) {
    progress.certificate = {
      id: generateCertificateId(),
      name: name || 'JSRMS Student',
      issuedAt: new Date().toISOString(),
    };
    saveProgress(progress);
  }
  return progress;
}

export function isCertified() {
  return !!getProgress().certificate;
}

function generateCertificateId() {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `JSRMS-${year}-${rand}`;
}
