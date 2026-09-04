// src/data/topics.js
//
// Shared vocabulary and formatting for the public research library, in the same
// spirit as data/manuscriptStatus.js: three pages render a published paper
// (author Discover, public /search, the landing page) and none of them should
// re-derive these rules independently.
//
// This file replaced data/papers.js, which was a hardcoded array of invented
// topics carrying two fields the data model has never had — a 5-star `rating`
// and an academic `level`. Both were dropped rather than faked differently.

export const AREA_ALL = 'All';

/**
 * Options for a research-area <select>, with the 'All' sentinel first.
 *
 * `categories` comes from listPublishedCategories() — the categories that
 * actually have a published paper behind them, so every option yields at least
 * one result. Falls back to just 'All' when the categories call failed, which
 * is deliberately non-fatal: a filter dropdown is not worth failing a page over.
 */
export function areaOptions(categories) {
  return [AREA_ALL, ...(categories || [])];
}

/** Publication year, or '' when the row somehow has no published_at. */
export function topicYear(topic) {
  if (!topic?.published_at) return '';
  const year = new Date(topic.published_at).getFullYear();
  return Number.isNaN(year) ? '' : String(year);
}

/** Full publication date for the expanded card, or '' when absent. */
export function topicDate(topic) {
  if (!topic?.published_at) return '';
  const date = new Date(topic.published_at);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * The card's footer line: institution · area · year, with any missing segment
 * and its separator dropped rather than rendered as a placeholder.
 */
export function topicMeta(topic) {
  return [topic?.institutions?.[0], topic?.category, topicYear(topic)].filter(Boolean);
}
