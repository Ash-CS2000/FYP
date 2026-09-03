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
import { listAssignments } from '../api/invitations.js';

export default function AssignmentGate() {
  const { id } = useParams();
  const [state, setState] = useState('loading'); // 'loading' | 'blocked' | 'ok'
  const [assignment, setAssignment] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listAssignments()
      .then((rows) => {
        if (cancelled) return;
        const found = rows.find(a => String(a.manuscript_id) === String(id)) || null;
        if (!found || found.status === 'invited' || found.status === 'declined') {
          setState('blocked');
        } else {
          setAssignment(found);
          setState('ok');
        }
      })
      .catch(() => { if (!cancelled) setState('blocked'); });
    return () => { cancelled = true; };
  }, [id]);

  if (state === 'loading') return null;
  if (state === 'blocked') return <Navigate to="/reviewer/assignments" replace />;
  return <Outlet context={assignment} />;
}
