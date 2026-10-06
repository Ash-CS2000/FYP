// src/data/invitations.js
//
// The reviewer assignment lifecycle: invite → accept or decline → review → done.
// Mock data plus the shape the backend is expected to serve, with a localStorage
// fallback, same pattern as data/similarity.js and data/editorial.js.
//
// ── Why this is separate from data/reviews.js ────────────────────────────────
// data/reviews.js is the EDITOR's projection: every reviewer on a manuscript,
// labelled 'Reviewer 1', 'Reviewer 2', with their scores and confidential notes.
// This file is the REVIEWER's projection: the manuscripts *I* was invited to, by
// name, with my own deadline and my own decline reason.
//
// They are two views of the same underlying assignment, and they must never be
// merged. The editor's view names every reviewer on a paper; the reviewer's view
// must reveal nothing about who else is on it. One shared list is one filtering
// mistake away from breaking that — see the same reasoning in api/editorial.js
// for why the author's reviews are a separate endpoint.
//
// ── Assignment record (reviewer-facing) ──────────────────────────────────────
//   id              string
//   manuscript_id   string
//   title           string   the reviewer DOES see the title — they need it to
//                            judge whether they are competent and conflicted
//   category        string
//   abstract        string   enough to decide on, without the full manuscript
//   invited_at      ISO 8601
//   respond_by      ISO 8601  deadline to accept or decline
//   due_at          ISO 8601 | null  review deadline, set once accepted
//   status          'invited' | 'accepted' | 'declined' | 'submitted'
//   decline_reason  string | null
//   decline_note    string
//   coi_declared    boolean  a conflict declared at accept time; the editor sees
//                            it and may reassign
//   extension       { requested_days, reason, status } | null
//
// NOTE: no author name anywhere in this record. Double-blind starts at the
// invitation, not at the review form — the backend must not serialise author
// identity into any reviewer-facing response.

const RESPONSES_KEY = 'paperbridge-reviewer-responses';
const ASSIGNMENTS_KEY = 'paperbridge-editor-assignments';

// Offered as a required choice when declining. Free text alone produces "busy"
// and nothing an editor can act on; a reason code lets the editor decide whether
// to re-invite this person later or route around them.
export const DECLINE_REASONS = [
  { id: 'conflict',     label: 'Conflict of interest',   blurb: 'I know the authors, or I have a competing interest in the outcome.' },
  { id: 'expertise',    label: 'Outside my expertise',   blurb: 'I cannot assess this competently.' },
  { id: 'unavailable',  label: 'No capacity right now',  blurb: 'I could review this, but not by the deadline.' },
  { id: 'other',        label: 'Another reason',         blurb: '' },
];

export const ASSIGNMENT_STATUS_LABELS = {
  invited:   'Awaiting your response',
  accepted:  'Accepted — review due',
  declined:  'Declined',
  submitted: 'Review submitted',
};

export const ASSIGNMENT_TONE = {
  invited:   { bg: 'var(--amber-50)', fg: 'var(--amber-800)' },
  accepted:  { bg: 'var(--navy-100)', fg: 'var(--navy-800)' },
  declined:  { bg: 'var(--ink-100)',  fg: 'var(--ink-700)' },
  submitted: { bg: 'var(--green-50)', fg: 'var(--green-800)' },
};

// ── Mock assignments for the logged-in reviewer ──────────────────────────────
// Manuscript ids match MANUSCRIPTS in data/reviews.js so a reviewer's assignment
// and the editor's view of the same paper stay in step.

export const ASSIGNMENTS = [
  {
    id: 'AS-1',
    manuscript_id: 'MS-2026-014',
    title: 'Deep Learning Methods in Medical Imaging',
    category: 'Computer Science · AI & ML',
    abstract:
      'A comparative study of three convolutional architectures across three public medical imaging benchmarks, with an emphasis on reproducibility and honest reporting of negative results.',
    invited_at: '2026-04-20T08:00:00Z',
    respond_by: '2026-04-27T23:59:00Z',
    due_at: '2026-05-10T23:59:00Z',
    status: 'accepted',
    decline_reason: null,
    decline_note: '',
    coi_declared: false,
    extension: null,
  },
  {
    id: 'AS-2',
    manuscript_id: 'MS-2026-019',
    title: 'Renewable Energy Grid Optimization',
    category: 'Engineering',
    abstract:
      'Proposes a mixed-integer formulation for scheduling distributed renewable generation, evaluated against three years of grid data from a regional operator.',
    invited_at: '2026-05-02T09:30:00Z',
    respond_by: '2026-05-09T23:59:00Z',
    due_at: null,
    status: 'invited',
    decline_reason: null,
    decline_note: '',
    coi_declared: false,
    extension: null,
  },
  {
    id: 'AS-3',
    manuscript_id: 'MS-2026-021',
    title: 'Supply Chain Blockchain Use Cases in ASEAN',
    category: 'Business',
    abstract:
      'A survey of eleven blockchain pilots across ASEAN supply chains, with a framework for classifying which succeeded and why.',
    invited_at: '2026-04-14T11:00:00Z',
    respond_by: '2026-04-21T23:59:00Z',
    due_at: '2026-05-08T23:59:00Z',
    status: 'accepted',
    decline_reason: null,
    decline_note: '',
    coi_declared: false,
    extension: null,
  },
  {
    id: 'AS-4',
    manuscript_id: 'MS-2025-208',
    title: 'A Survey of Natural Language Processing in 2025',
    category: 'Linguistics',
    abstract:
      'A year-in-review survey of NLP, organised by task family rather than by architecture.',
    invited_at: '2025-11-20T10:00:00Z',
    respond_by: '2025-11-27T23:59:00Z',
    due_at: '2025-12-12T23:59:00Z',
    status: 'submitted',
    decline_reason: null,
    decline_note: '',
    coi_declared: false,
    extension: null,
  },
];

// ── The reviewer pool the editor picks from ─────────────────────────────────
//
// Real now — GET /api/manuscripts/:id/reviewer-candidates/ (editor only), see
// listCandidates() in api/invitations.js and backend/apps/reviews/matching.py.
// `match_score` is produced server-side and the frontend deliberately treats it
// as an opaque 0–100 number it only sorts and displays — ranking reviewers by
// fit is a modelling problem, not an endpoint, and however it ends up working,
// no screen here needs to change. `match_reasons` is what the UI actually
// shows, because a bare 87% is not something an editor can sanity-check; a
// reason they can read is.
//
// Candidates must be filterable by the editor without the backend having already
// excluded conflicts silently — `conflict` is surfaced, not hidden, so the editor
// sees that a strong match was ruled out and why.

export const AVAILABILITY_LABELS = {
  available:   'Available',
  busy:        'Heavy load',
  unavailable: 'Unavailable',
};

export const AVAILABILITY_TONE = {
  available:   { bg: 'var(--green-50)', fg: 'var(--green-800)' },
  busy:        { bg: 'var(--amber-50)', fg: 'var(--amber-800)' },
  unavailable: { bg: 'var(--ink-100)',  fg: 'var(--ink-700)' },
};

// ── Local store ──────────────────────────────────────────────────────────────

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

// The reviewer's own responses, layered over the mock assignments above.
export function loadResponses() {
  return loadMap(RESPONSES_KEY);
}

export function myAssignments() {
  const responses = loadResponses();
  return ASSIGNMENTS.map(a => ({ ...a, ...(responses[a.id] || {}) }));
}

export function assignmentFor(assignmentId) {
  return myAssignments().find(a => a.id === assignmentId) || null;
}

// The assignment for a manuscript, which is what gates the review form: a
// reviewer may only open a manuscript they were invited to AND accepted.
export function assignmentForManuscript(manuscriptId) {
  return myAssignments().find(a => a.manuscript_id === manuscriptId) || null;
}

export function saveResponse(assignmentId, patch) {
  const map = loadMap(RESPONSES_KEY);
  map[assignmentId] = { ...(map[assignmentId] || {}), ...patch };
  saveMap(RESPONSES_KEY, map);
  return map[assignmentId];
}

// Offline write-only fallback for the editor's invite action (ReviewerPanel.jsx)
// — who was invited, per manuscript, when the real POST failed. Read back
// only as a last resort by whoever calls it; the normal path is the real
// GET /api/manuscripts/:id/assignments/ (api/invitations.js's
// listManuscriptAssignments), which is what actually powers the panel now.
export function saveAssignments(manuscriptId, rows) {
  const map = loadMap(ASSIGNMENTS_KEY);
  map[manuscriptId] = rows;
  saveMap(ASSIGNMENTS_KEY, map);
  return rows;
}

// ── Deadline helpers ────────────────────────────────────────────────────────
// Overdue is a fact about a date, so it is computed, never stored. A stored
// 'overdue' flag is wrong the moment nobody refreshes it.

export function daysUntil(iso) {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  // Whole calendar days in local time. Dividing a raw millisecond difference
  // and rounding towards zero counted "overdue" one day short.
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOfDay(then) - startOfDay(new Date())) / 86400000);
}

export function deadlineState(iso) {
  const days = daysUntil(iso);
  if (days === null) return { tone: 'none', label: '—', days: null };
  if (days < 0)  return { tone: 'overdue', label: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`, days };
  if (days === 0) return { tone: 'due',     label: 'Due today', days };
  if (days <= 3) return { tone: 'due',     label: `Due in ${days} day${days === 1 ? '' : 's'}`, days };
  return { tone: 'ok', label: `Due in ${days} days`, days };
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
