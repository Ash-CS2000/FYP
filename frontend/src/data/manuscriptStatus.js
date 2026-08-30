// src/data/manuscriptStatus.js
//
// Single source of truth for Django's Manuscript.Status choices
// (apps.manuscripts.models.Manuscript.Status). Import this wherever a
// manuscript status is rendered, labeled, or filtered instead of
// re-declaring the vocabulary.

export const MANUSCRIPT_STATUSES = [
  'submitted', 'under_review', 'revisions_requested', 'accepted', 'rejected', 'published',
];

export const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'In Review',
  revisions_requested: 'Revisions Requested',
  accepted: 'Accepted',
  rejected: 'Rejected',
  published: 'Published',
};

export const STATUS_PILL_CLASS = {
  submitted: 'pill-submitted',
  under_review: 'pill-under_review',
  revisions_requested: 'pill-revisions_requested',
  accepted: 'pill-accepted',
  rejected: 'pill-rejected',
  published: 'pill-published',
};

// No further editorial action expected once reached.
export const TERMINAL_STATUSES = ['accepted', 'rejected', 'published'];

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function statusPillClass(status) {
  return STATUS_PILL_CLASS[status] || 'pill-pending';
}
