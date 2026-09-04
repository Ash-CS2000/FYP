// src/data/reviews.js
//
// Presentation-only helpers for reviews: labels, tones, and the rating
// criteria/composite-score formula. Real data comes from api/reviews.js
// (getReviews/submitReview) and getAuthorReviews in api/editorial.js — see
// those files for the actual Review record shape and endpoint contracts.

export const RECOMMENDATION_LABELS = {
  accept: 'Accept',
  minor:  'Minor Revision',
  major:  'Major Revision',
  reject: 'Reject',
};

export const RECOMMENDATION_TONE = {
  accept: { bg: 'var(--teal-50)',   fg: 'var(--teal-800)' },
  minor:  { bg: 'var(--green-50)',  fg: 'var(--green-800)' },
  major:  { bg: 'var(--amber-50)',  fg: 'var(--amber-800)' },
  reject: { bg: 'var(--red-50)',    fg: 'var(--red-800)' },
};

export const RATING_CRITERIA = [
  { key: 'originality', label: 'Originality & significance', hint: 'Does the paper present novel ideas or significant contributions?' },
  { key: 'technical',   label: 'Technical quality',          hint: 'Are the methods sound and the analysis rigorous?' },
  { key: 'clarity',     label: 'Clarity & presentation',     hint: 'Is the paper well-written and well-organized?' },
  { key: 'relevance',   label: 'Relevance to journal scope', hint: '' },
];

export function compositeScore(ratings) {
  const keys = RATING_CRITERIA.map(c => c.key);
  const total = keys.reduce((sum, k) => sum + (Number(ratings?.[k]) || 0), 0);
  return (total / keys.length).toFixed(1);
}
