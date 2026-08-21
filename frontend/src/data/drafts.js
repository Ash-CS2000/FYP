// src/data/drafts.js
//
// Saved-but-not-submitted work: manuscript drafts from the submission wizard and
// response drafts from the revision screen. Same localStorage-fallback pattern as
// data/similarity.js and data/editorial.js.
//
// ── What a draft deliberately does NOT contain ───────────────────────────────
// The uploaded file. A File object cannot be serialised, and stashing the bytes
// in localStorage would blow the quota on the first real manuscript. A resumed
// draft therefore restores every field and asks for the file again — which is
// honest, because the file was never saved. The banner on resume says so rather
// than letting the author discover it at step 4.
//
// Once POST /api/submissions/drafts/ exists the file belongs in it as a real
// upload and this limitation goes away; see api/submissions.js.
//
// ── Draft record ─────────────────────────────────────────────────────────────
//   id           string   'DRAFT-<timestamp>' locally; server id once persisted
//   kind         'submission' | 'revision'
//   title        string   for the drafts list; may be empty early on
//   step         number   the wizard step the author was on
//   updated_at   ISO 8601
//   payload      object   every serialisable field of the form
//   file_name    string   remembered only to tell the author what to re-attach

const DRAFTS_KEY = 'paperbridge-drafts';
const WITHDRAWALS_KEY = 'paperbridge-withdrawals';

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
    /* storage full or unavailable — the session keeps working, nothing persists */
  }
  return map;
}

export function loadDrafts() {
  return Object.values(loadMap(DRAFTS_KEY)).sort(
    (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
  );
}

export function draftFor(id) {
  return loadMap(DRAFTS_KEY)[id] || null;
}

// One draft per kind+id. Passing an existing id updates in place rather than
// piling up a new draft every time the author hits save.
export function saveDraft({ id, kind = 'submission', title = '', step = 1, payload = {}, file_name = '' }) {
  const map = loadMap(DRAFTS_KEY);
  const draftId = id || `DRAFT-${Date.now()}`;
  map[draftId] = {
    id: draftId,
    kind,
    title: title.trim(),
    step,
    payload,
    file_name,
    updated_at: new Date().toISOString(),
  };
  saveMap(DRAFTS_KEY, map);
  return map[draftId];
}

export function deleteDraft(id) {
  const map = loadMap(DRAFTS_KEY);
  delete map[id];
  saveMap(DRAFTS_KEY, map);
}

export function formatSavedAt(iso) {
  if (!iso) return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Withdrawal ───────────────────────────────────────────────────────────────
// An author may withdraw a submission until a final decision exists. After that
// there is nothing to withdraw from — the paper is accepted or rejected, and the
// record of that stands. isFinal() in data/editorial.js is the check; this file
// only stores the outcome.

export const WITHDRAW_REASONS = [
  'Submitting to a different journal',
  'The work needs substantially more development',
  'A co-author has asked to withdraw it',
  'An error was found in the data or analysis',
  'Another reason',
];

export function loadWithdrawals() {
  return loadMap(WITHDRAWALS_KEY);
}

export function withdrawalFor(manuscriptId) {
  return loadWithdrawals()[manuscriptId] || null;
}

export function saveWithdrawal(record) {
  const map = loadMap(WITHDRAWALS_KEY);
  map[record.manuscript_id] = record;
  saveMap(WITHDRAWALS_KEY, map);
  return record;
}
