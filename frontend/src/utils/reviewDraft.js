// src/utils/reviewDraft.js
//
// An unsubmitted review, kept in this browser so a reviewer who navigates away
// (or loses the tab) gets their text back. Keyed by user AND assignment so two
// people sharing a browser never see each other's drafts. Local only — the
// server knows nothing about a review until it is submitted.
//
// Storage can be unavailable (private mode, blocked site data); every access is
// guarded and a failure simply means no draft.

const draftKey = (userId, assignmentId) => `paperbridge-review-draft:${userId}:${assignmentId}`;

export function loadDraft(userId, assignmentId) {
  try {
    const raw = window.localStorage.getItem(draftKey(userId, assignmentId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(userId, assignmentId, draft) {
  try {
    const saved = { ...draft, saved_at: new Date().toISOString() };
    window.localStorage.setItem(draftKey(userId, assignmentId), JSON.stringify(saved));
    return saved.saved_at;
  } catch {
    return null;
  }
}

export function clearDraft(userId, assignmentId) {
  try {
    window.localStorage.removeItem(draftKey(userId, assignmentId));
  } catch {
    /* nothing to clear */
  }
}
