// src/utils/time.js — human-readable times for activity lists.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** "just now" · "12 min ago" · "3 h ago" · "yesterday" · "4 days ago" · "12 Sep" */
export function timeAgo(iso, now = new Date()) {
  const then = new Date(iso);
  const diff = now - then;
  if (Number.isNaN(diff)) return '—';
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  const days = Math.round((startOfDay(now) - startOfDay(then)) / DAY);
  if (days === 0) return `${Math.floor(diff / HOUR)} h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Exact local date and time, for a tooltip or a secondary line. */
export function fullDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** The heading an item falls under in a list grouped by recency. */
export function recencyGroup(iso, now = new Date()) {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'Earlier this week';
  return 'Older';
}
