// src/data/screeningSettings.js
//
// Similarity screening thresholds and exclusion policy. Still local-only —
// the backend for these (PATCH /api/similarity-settings/ or similar) is not
// implemented yet, see getScreeningSettings/patchScreeningSettings stubs in
// api/similarity.js. Screening *actions* themselves (allow/return) are real,
// see api/editorial.js.

import { DEFAULT_THRESHOLDS } from './similarity.js';

const SETTINGS_KEY = 'paperbridge-screening-settings';

export const DEFAULT_SCREENING_SETTINGS = {
  review_threshold: DEFAULT_THRESHOLDS.review,
  high_threshold: DEFAULT_THRESHOLDS.high,
  exclude_quotes: true,
  exclude_bibliography: true,
  min_words: 8,
  auto_flag: true,
};

export function loadLocalSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SCREENING_SETTINGS };
    return { ...DEFAULT_SCREENING_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SCREENING_SETTINGS };
  }
}

export function saveLocalSettings(settings) {
  const merged = { ...DEFAULT_SCREENING_SETTINGS, ...settings };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch {
    /* storage unavailable — the in-memory value still applies for this session */
  }
  return merged;
}

export function thresholdsFrom(settings = DEFAULT_SCREENING_SETTINGS) {
  return {
    review: Number(settings.review_threshold ?? DEFAULT_THRESHOLDS.review),
    high: Number(settings.high_threshold ?? DEFAULT_THRESHOLDS.high),
  };
}
