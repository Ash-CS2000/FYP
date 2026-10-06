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

// Editorial outcomes a reviewer can see once a manuscript is decided. Shares
// the recommendation vocabulary, plus desk reject (decided without review).
export const DECISION_LABELS = { ...RECOMMENDATION_LABELS, desk_reject: 'Desk Reject' };
export const DECISION_TONE = { ...RECOMMENDATION_TONE, desk_reject: RECOMMENDATION_TONE.reject };

// `rubric` anchors scores 1, 3 and 5 so two reviewers mean the same thing by a
// "3". 2 and 4 sit between their neighbours. Shown in ReviewerGuidelines and as
// tooltips on the review form's score buttons.
export const RATING_CRITERIA = [
  {
    key: 'originality', label: 'Originality & significance',
    hint: 'Does the paper present novel ideas or significant contributions?',
    rubric: {
      1: 'Repeats known work; no clear contribution.',
      3: 'A modest, incremental advance on existing work.',
      5: 'A substantial new idea or result the field will build on.',
    },
  },
  {
    key: 'technical', label: 'Technical quality',
    hint: 'Are the methods sound and the analysis rigorous?',
    rubric: {
      1: 'Methods unsound or results unsupported by the evidence.',
      3: 'Sound overall, with gaps the authors need to address.',
      5: 'Rigorous; the conclusions follow from the evidence.',
    },
  },
  {
    key: 'clarity', label: 'Clarity & presentation',
    hint: 'Is the paper well-written and well-organized?',
    rubric: {
      1: 'Hard to follow; key details missing or unclear.',
      3: 'Readable, but structure or explanations need work.',
      5: 'Clear, well organised, and easy to reproduce.',
    },
  },
  {
    key: 'relevance', label: 'Relevance to journal scope',
    hint: '',
    rubric: {
      1: 'Outside the journal\'s scope.',
      3: 'Related to the scope, but of limited interest to its readers.',
      5: 'Squarely within scope and of wide interest to readers.',
    },
  },
];

/** The rubric line for a score: its own anchor, or the two it sits between. */
export function rubricFor(criterion, score) {
  const r = criterion.rubric || {};
  if (r[score]) return r[score];
  return score === 2 ? `Between: ${r[1]} / ${r[3]}` : `Between: ${r[3]} / ${r[5]}`;
}

export function compositeScore(ratings) {
  const keys = RATING_CRITERIA.map(c => c.key);
  const total = keys.reduce((sum, k) => sum + (Number(ratings?.[k]) || 0), 0);
  return (total / keys.length).toFixed(1);
}
