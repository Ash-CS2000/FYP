// src/api/matching.js
//
// TF-IDF-backed helpers that live outside the manuscript/reviewer
// lifecycle proper — currently just tag auto-suggest (a TF-IDF text
// classifier, see backend/apps/matching/tagging.py).
//
//   POST /api/matching/suggest-tags/  { text }
//   200  { suggestions: [{ slug, label, similarity }, ...] }
//
// Suggestions only — nothing is applied automatically. Used by UserSubmit.jsx
// (from the abstract) and Profile.jsx's reviewer expertise section (from the
// expertise blurb). See apps/matching/views.py and matching_system.md
// 'Specialty tags'.

import { API_URL } from '../config';
import { authFetch } from './auth';

// The backend only reads the first 5000 characters; sending less keeps the
// request small for long abstracts.
const MAX_TEXT_CHARS = 5000;

export async function suggestTags(text) {
  if (!text || text.trim().length < 20) return [];
  const res = await authFetch(`${API_URL}/api/matching/suggest-tags/`, {
    method: 'POST',
    body: JSON.stringify({ text: text.slice(0, MAX_TEXT_CHARS) }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.suggestions || [];
}
