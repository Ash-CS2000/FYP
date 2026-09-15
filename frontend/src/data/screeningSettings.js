// src/data/screeningSettings.js
//
// Similarity screening policy. The live values come from the server — see
// hooks/useScreeningSettings.js and getScreeningSettings in api/similarity.js.
// These defaults are only what a screen bands with before the server answers,
// and they mirror the model defaults in backend/apps/analysis/models.py.

import { DEFAULT_THRESHOLDS } from './similarity.js';

export const DEFAULT_SCREENING_SETTINGS = {
  review_threshold: DEFAULT_THRESHOLDS.review,
  high_threshold: DEFAULT_THRESHOLDS.high,
  exclude_quotes: true,
  exclude_bibliography: true,
  min_words: 8,
  auto_flag: true,
};

export function thresholdsFrom(settings = DEFAULT_SCREENING_SETTINGS) {
  return {
    review: Number(settings.review_threshold ?? DEFAULT_THRESHOLDS.review),
    high: Number(settings.high_threshold ?? DEFAULT_THRESHOLDS.high),
  };
}
