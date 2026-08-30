// src/data/editorial.js
//
// The editorial decision layer: what an editor does to a manuscript, and what
// the author is allowed to see of it afterwards. Decision records themselves
// are real now — see api/editorial.js's getDecision/postDecision. This file is
// the presentation layer that sits on top (labels, tones, letter drafting),
// plus a couple of *other* features (screening actions, issue scheduling) that
// still have no backend endpoint and fall back to localStorage below.
//
// ── Decision record (server-side shape, see api/editorial.js) ────────────────
//   manuscript_id  number
//   type           'desk_reject' | 'reject' | 'major' | 'minor' | 'accept'
//   letter         string   sent to the author verbatim — this IS the decision
//                           letter, not a summary of one
//   decided_at     ISO 8601
//   decided_by     string   editor display name, shown to the author
//
//   GET  /api/manuscripts/:id/decision/  → Decision | 404
//   POST /api/manuscripts/:id/decision/  → Decision   (editor only)
//
// ── Who may write ────────────────────────────────────────────────────────────
// Only an editor. Admins read this layer and never write it: the platform owner
// deliberately does not do editorial judgement work. Every screen below takes a
// `role` prop and renders actions only for 'editor' — but that is presentation,
// not enforcement. The server must reject a decision POST from any other role.
//
// ── What the author sees ─────────────────────────────────────────────────────
// The decision letter, and the reviews only once a decision releases them.
// `toAuthorReview()` is the filter: comments to author only. Scores, the
// reviewer's own recommendation and confidential_to_editor never cross that line
// — a reviewer recommending 'accept' against an editor's 'reject' is exactly the
// contradiction the confidential channel exists to keep private. As with
// confidential_to_editor in data/reviews.js, the backend must strip these fields
// server-side; filtering here is defence in depth, not the control.

const SCREENING_KEY = 'paperbridge-screening-actions';

// `preReviewOnly` types are available before reviewers are involved and vanish
// once a review exists — desk rejection is by definition a decision taken
// without sending the paper out.
export const DECISION_TYPES = [
  {
    id: 'desk_reject',
    label: 'Desk Reject',
    blurb: 'Reject without peer review — out of scope, or too weak to justify reviewer time.',
    preReviewOnly: true,
    final: true,
  },
  {
    id: 'accept',
    label: 'Accept',
    blurb: 'Publish as submitted. No further revisions required.',
    final: true,
  },
  {
    id: 'minor',
    label: 'Minor Revision',
    blurb: 'Author addresses small points. No second review round.',
    final: false,
  },
  {
    id: 'major',
    label: 'Major Revision',
    blurb: 'Substantive changes required, then a second review round.',
    final: false,
  },
  {
    id: 'reject',
    label: 'Reject',
    blurb: 'Reviewed and not suitable for publication in this journal.',
    final: true,
  },
];

export const DECISION_LABELS = Object.fromEntries(
  DECISION_TYPES.map(d => [d.id, d.label]),
);

export const DECISION_TONE = {
  accept:      { bg: 'var(--green-50)', fg: 'var(--green-800)' },
  minor:       { bg: 'var(--teal-50)',  fg: 'var(--teal-800)' },
  major:       { bg: 'var(--amber-50)', fg: 'var(--amber-800)' },
  reject:      { bg: 'var(--red-50)',   fg: 'var(--red-800)' },
  desk_reject: { bg: 'var(--red-50)',   fg: 'var(--red-800)' },
};

// Offered as checkboxes on the desk-reject panel and folded into the letter, so
// the author gets a reason rather than a bare refusal.
export const DESK_REJECT_REASONS = [
  'Outside the scope of this journal',
  'Does not meet the minimum methodological standard',
  'Incomplete submission — required sections or data are missing',
  'Substantial overlap with previously published work',
  'Formatting and language fall below the level we can send to review',
];

export function decisionTypeFor(id) {
  return DECISION_TYPES.find(d => d.id === id) || null;
}

// A final decision closes the manuscript: no further editorial action, and the
// author can no longer withdraw it (Phase 3 reads this).
export function isFinal(type) {
  return Boolean(decisionTypeFor(type)?.final);
}

// Which decisions the editor may take right now. Desk rejection disappears the
// moment a reviewer has been involved — offering it then would misrepresent what
// actually happened to the manuscript.
export function availableDecisions({ hasReviews }) {
  return DECISION_TYPES.filter(d => !d.preReviewOnly || !hasReviews);
}

// ── The author-facing filter ─────────────────────────────────────────────────
// Returns ONLY the fields an author may read. Written as an allow-list rather
// than a delete-list on purpose: a new confidential field added to the review
// record must not silently become author-visible.
export function toAuthorReview(review) {
  return {
    id: review.id,
    label: review.reviewer_label,
    summary: review.summary,
    strengths: review.strengths,
    weaknesses: review.weaknesses,
  };
}

// ── Letter drafting ──────────────────────────────────────────────────────────
// A starting point the editor edits, never an auto-send. The reviewer comments
// are pasted in already filtered to the author-visible fields, so an editor
// cannot leak the confidential channel by accepting the default text.

const OPENINGS = {
  accept:      'I am pleased to tell you that your manuscript has been accepted for publication.',
  minor:       'Your manuscript has been reviewed and we would like to accept it subject to minor revisions.',
  major:       'Your manuscript has been reviewed. We are interested in it, but it requires major revisions before we can consider it further.',
  reject:      'Your manuscript has been reviewed and I am sorry to say we are unable to accept it for publication.',
  desk_reject: 'Thank you for submitting your manuscript. I have read it myself and have decided not to send it out for peer review.',
};

const CLOSINGS = {
  accept:      'Congratulations, and thank you for choosing this journal.\n\nWith best wishes,',
  minor:       'Please submit your revision along with a point-by-point response to each comment.\n\nWith best wishes,',
  major:       'If you choose to revise, please include a point-by-point response. A revision is an invitation to resubmit, not a guarantee of acceptance.\n\nWith best wishes,',
  reject:      'I hope the reviewer comments are useful in developing the work further, and I am sorry not to have better news.\n\nWith best wishes,',
  desk_reject: 'This is not a judgement on the quality of the work, and I hope you find a more suitable venue for it.\n\nWith best wishes,',
};

export function letterTemplate({
  manuscript,
  type,
  reviews = [],
  reasons = [],
  editorName = 'The Editorial Office',
}) {
  const lines = [];
  lines.push('Dear Author,');
  lines.push('');
  lines.push(`Re: ${manuscript?.title || 'your manuscript'} (${manuscript?.id || ''})`);
  lines.push('');
  lines.push(OPENINGS[type] || '');

  if (type === 'desk_reject' && reasons.length) {
    lines.push('');
    lines.push('My reasons are:');
    reasons.forEach(r => lines.push(`  — ${r}`));
  }

  const submitted = reviews.filter(r => r.status === 'submitted');
  if (type !== 'desk_reject' && submitted.length) {
    lines.push('');
    lines.push(`The comments from ${submitted.length} reviewer${submitted.length > 1 ? 's' : ''} follow.`);
    submitted.forEach((r, i) => {
      const a = toAuthorReview(r);
      lines.push('');
      lines.push(`—— Reviewer ${i + 1} ——`);
      if (a.summary)    lines.push(`Summary: ${a.summary}`);
      if (a.strengths)  lines.push(`Strengths:\n${a.strengths}`);
      if (a.weaknesses) lines.push(`Weaknesses and suggestions:\n${a.weaknesses}`);
    });
  }

  lines.push('');
  lines.push(CLOSINGS[type] || '');
  lines.push(editorName);
  return lines.join('\n');
}

// ── Screening actions ────────────────────────────────────────────────────────
// What an editor does with a flagged similarity report. Distinct from a decision:
// 'allow' clears the flag and lets the manuscript continue into review, 'return'
// sends it back to the author to fix the overlap without rejecting it outright.
//
//   POST /api/manuscripts/:id/screening/  { action, note }   (editor only)

export const SCREENING_ACTIONS = [
  {
    id: 'allow',
    label: 'Allow through',
    blurb: 'The matches are quotations, boilerplate or the author’s own prior work. Continue to review.',
  },
  {
    id: 'return',
    label: 'Return to author',
    blurb: 'The overlap needs fixing before this can go to reviewers. Not a rejection.',
  },
];

// ── Local store ──────────────────────────────────────────────────────────────
// Same fallback pattern as loadLocalSettings in data/similarity.js. Once the
// endpoints exist the server is the source of truth and this is offline only.

function loadMap(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMap(key, map) {
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* storage unavailable — the in-memory value still applies this session */
  }
  return map;
}

export function loadScreeningActions() {
  return loadMap(SCREENING_KEY);
}

export function screeningActionFor(manuscriptId) {
  return loadScreeningActions()[manuscriptId] || null;
}

export function saveScreeningAction(action) {
  const map = loadMap(SCREENING_KEY);
  map[action.manuscript_id] = action;
  saveMap(SCREENING_KEY, map);
  return action;
}

// ── Volume and issue ─────────────────────────────────────────────────────────
// Where an accepted manuscript actually gets published. Only reachable once a
// decision of 'accept' exists — scheduling a paper that has not been accepted is
// how a journal announces something it then has to retract.
//
//   GET  /api/issues/                        → Issue[]
//   POST /api/manuscripts/:id/issue/  { issue_id }   (editor only)
//   409  the manuscript has no 'accept' decision
//   409  the issue is already published and closed to additions

const ISSUE_KEY = 'paperbridge-issue-assignments';

export const ISSUES = [
  { id: 'V12-I1', volume: 12, issue: 1, label: 'Vol 12, Issue 1', publish_on: '2026-03-31', status: 'published', capacity: 10, filled: 10 },
  { id: 'V12-I2', volume: 12, issue: 2, label: 'Vol 12, Issue 2', publish_on: '2026-06-30', status: 'published', capacity: 10, filled: 9 },
  { id: 'V12-I3', volume: 12, issue: 3, label: 'Vol 12, Issue 3', publish_on: '2026-09-30', status: 'open',      capacity: 10, filled: 6 },
  { id: 'V12-I4', volume: 12, issue: 4, label: 'Vol 12, Issue 4', publish_on: '2026-12-31', status: 'open',      capacity: 10, filled: 2 },
  { id: 'V13-I1', volume: 13, issue: 1, label: 'Vol 13, Issue 1', publish_on: '2027-03-31', status: 'planned',   capacity: 10, filled: 0 },
];

// A published issue is closed: its contents are the historical record, and
// adding to it after the fact would change what readers already cited.
export function openIssues() {
  return ISSUES.filter(i => i.status !== 'published');
}

export function loadIssueAssignments() {
  return loadMap(ISSUE_KEY);
}

export function issueFor(manuscriptId) {
  const id = loadIssueAssignments()[manuscriptId];
  return id ? ISSUES.find(i => i.id === id) || null : null;
}

export function saveIssueAssignment(manuscriptId, issueId) {
  const map = loadMap(ISSUE_KEY);
  map[manuscriptId] = issueId;
  saveMap(ISSUE_KEY, map);
  return issueId;
}

export function formatDecidedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
