// src/auth/AssignmentGate.jsx
// Per-manuscript gate for the review form. Use as a pathless layout route inside
// the reviewer's routes:
//   <Route element={<AssignmentGate />}>
//     <Route path="/reviewer/review/:id" element={<ReviewForm />} />
//   </Route>
//
// Sits one level below ReviewerActiveGate. That gate asks "is this person a
// reviewer at all?"; this one asks "was this person invited to THIS manuscript,
// and did they accept?" Both have to pass.
//
// Three outcomes, and they are deliberately different:
//   no assignment  → not their manuscript; back to the assignment list
//   invited        → they have not accepted yet; back to the list to decide
//   declined       → they gave it up; access is gone, not merely paused
// (submitted is allowed through — a reviewer who already turned theirs in
// may still want to reference the manuscript, matches the real
// GET /reviewer-view/ endpoint's own access rule)
//
// SECURITY: this is a courtesy, not a control. It stops a reviewer wandering
// into a review form they have no business in; it stops nobody who edits the URL
// with intent, because everything it reads comes from the browser. The server
// must check the assignment on every manuscript, file and review endpoint —
// see the access rule at the top of api/invitations.js.

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { getManuscriptForReview } from '../api/reviews.js';
import { useReviewerAssignments } from '../hooks/useReviewerAssignments.jsx';

// Why the reviewer was sent back — shown as a banner on the assignment list.
const BLOCKED_NOTICE = {
  missing: 'You do not have access to that manuscript.',
  invited: 'Accept the invitation before opening the manuscript.',
  declined: 'You declined this invitation, so the manuscript is no longer available to you.',
};

export default function AssignmentGate() {
  const { id } = useParams();
  const { assignments, loading } = useReviewerAssignments();
  const [manuscript, setManuscript] = useState(null);
  const [loadError, setLoadError] = useState('');

  // Fetched alongside the assignment list rather than after it: the server
  // 403s anyone without an accepted/submitted assignment, so starting early
  // leaks nothing and halves the wait.
  useEffect(() => {
    let cancelled = false;
    setManuscript(null);
    setLoadError('');
    getManuscriptForReview(id)
      .then((m) => { if (!cancelled) setManuscript(m); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load this manuscript.'); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <GateLoading />;

  const assignment = assignments.find(a => String(a.manuscript_id) === String(id)) || null;
  const blocked = !assignment ? 'missing'
    : (assignment.status === 'invited' || assignment.status === 'declined') ? assignment.status
    : null;
  if (blocked) {
    return <Navigate to="/reviewer/assignments" replace state={{ notice: BLOCKED_NOTICE[blocked] }} />;
  }

  return <Outlet context={{ assignment, manuscript, loadError }} />;
}

function GateLoading() {
  return (
    <AppShell role="reviewer" searchPlaceholder="Search your assignments...">
      <div className="card fade-up"><div style={{ padding: 24 }}>Loading…</div></div>
    </AppShell>
  );
}
