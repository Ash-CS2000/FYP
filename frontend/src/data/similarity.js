// src/data/similarity.js
//
// Presentation-only helpers for similarity scores: banding thresholds, colors,
// labels, and date formatting. No data lives here — real check results come from
// api/similarity.js (getPlagiarismStatus / pollPlagiarismStatus), which returns
// whatever noplag's report shape actually is. See that file for the real contract.
//
// NOTE ON WORDING: the engine matches verbatim reuse. A high number means "a
// human should look at this", not "this is plagiarism". Quoted material, standard
// methods boilerplate and reference lists all score. Never label a score as a
// finding of misconduct anywhere in the UI.

export const DEFAULT_THRESHOLDS = { review: 15, high: 25 };

export const BAND_LABELS = {
  clear:  'Clear',
  review: 'Review',
  high:   'Flagged',
};

// Same idiom as RECOMMENDATION_TONE in data/reviews.js — reuses existing vars, so
// nothing here needs a styles.css change.
export const SIMILARITY_TONE = {
  clear:  { bg: 'var(--teal-50)',  fg: 'var(--teal-800)' },
  review: { bg: 'var(--amber-50)', fg: 'var(--amber-800)' },
  high:   { bg: 'var(--red-50)',   fg: 'var(--red-800)' },
};

export const BAND_HINTS = {
  clear:  'Within the normal range for citations and standard phrasing.',
  review: 'Worth a look before assigning reviewers — often quotes or boilerplate.',
  high:   'Substantial overlap. Read the matched passages before making a decision.',
};

/**
 * Which band a percentage falls into.
 * @param {number} pct
 * @param {object} [thresholds] { review, high }
 */
export function bandFor(pct, thresholds = DEFAULT_THRESHOLDS) {
  const value = Number(pct);
  if (!Number.isFinite(value)) return null;
  if (value >= thresholds.high) return 'high';
  if (value >= thresholds.review) return 'review';
  return 'clear';
}

/** Human date for a report timestamp. Matches the format used elsewhere. */
export function formatCheckedAt(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export const SOURCE_TYPE_LABELS = {
  submission: 'PaperBridge submission',
  journal:    'Published literature',
  web:        'Web source',
  thesis:     'Thesis / dissertation',
};