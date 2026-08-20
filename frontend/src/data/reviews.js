// src/data/reviews.js
//
// Mock review data plus the shape the backend is expected to serve. Reviewer
// and editor screens both read this, so the two sides can't drift apart.
//
// ── Review record ────────────────────────────────────────────────────────────
//   id                      string
//   manuscript_id           string
//   reviewer_label          string   'Reviewer 1' — NEVER the real name; the
//                                    editor sees a stable label, the author
//                                    sees nothing (double-blind)
//   status                  'invited' | 'accepted' | 'declined' | 'submitted'
//   submitted_at            ISO 8601 | null
//   ratings                 { originality, technical, clarity, relevance } 1–5
//   recommendation          'accept' | 'minor' | 'major' | 'reject'
//   summary                 string   visible to author
//   strengths               string   visible to author
//   weaknesses              string   visible to author
//   confidential_to_editor  string   EDITOR-ONLY. Must never be serialised into
//                                    any author-facing response. The backend is
//                                    responsible for stripping this field for
//                                    non-editor roles — hiding it in the UI is
//                                    not sufficient.
//
//   GET /api/manuscripts/:id/reviews/   → Review[]  (editor/admin only)
//   POST /api/manuscripts/:id/reviews/  → Review    (assigned reviewer only)

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

export const MANUSCRIPTS = {
  'MS-2026-014': {
    id: 'MS-2026-014',
    title: 'Deep Learning Methods in Medical Imaging',
    category: 'Computer Science · AI & ML',
    submitted: '12 January 2026',
    status: 'review',
  },
};

export const REVIEWS = [
  {
    id: 'RV-1',
    manuscript_id: 'MS-2026-014',
    reviewer_label: 'Reviewer 1',
    status: 'submitted',
    submitted_at: '2026-04-28T09:12:00Z',
    ratings: { originality: 4, technical: 3, clarity: 4, relevance: 5 },
    recommendation: 'minor',
    summary: 'A comparative study of three deep learning architectures across three medical imaging benchmarks.',
    strengths: '- Clear motivation and well-defined research questions\n- Strong experimental design across three benchmark datasets\n- Code and data are publicly available',
    weaknesses: '- The methodology section needs more detail on data preprocessing\n- Statistical significance tests should be reported with effect sizes',
    confidential_to_editor: 'The results are solid, but Figure 3 closely resembles a figure in the authors\u2019 own 2025 workshop paper. Worth a similarity check before acceptance — I do not think it is deliberate, but it should be cited.',
  },
  {
    id: 'RV-2',
    manuscript_id: 'MS-2026-014',
    reviewer_label: 'Reviewer 2',
    status: 'submitted',
    submitted_at: '2026-05-02T14:40:00Z',
    ratings: { originality: 3, technical: 4, clarity: 3, relevance: 4 },
    recommendation: 'major',
    summary: 'The paper benchmarks established architectures; the contribution is primarily empirical rather than methodological.',
    strengths: '- Thorough evaluation protocol\n- Honest reporting of negative results on the third dataset',
    weaknesses: '- Novelty is limited: all three architectures are off-the-shelf\n- No ablation study isolating the preprocessing contribution\n- Related work omits several 2024–2025 papers on the same benchmarks',
    confidential_to_editor: 'I would lean reject, but the empirical work is careful enough that a major revision is fair. I am not available to re-review this one — my semester teaching load starts in June.',
  },
  {
    id: 'RV-3',
    manuscript_id: 'MS-2026-014',
    reviewer_label: 'Reviewer 3',
    status: 'accepted',
    submitted_at: null,
    ratings: null,
    recommendation: null,
    summary: '',
    strengths: '',
    weaknesses: '',
    confidential_to_editor: '',
  },
];

export function reviewsFor(manuscriptId) {
  return REVIEWS.filter(r => r.manuscript_id === manuscriptId);
}
