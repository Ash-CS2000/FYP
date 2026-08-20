// src/auth/ReviewerActiveGate.jsx
// Approval gate for the reviewer workspace. Use as a pathless layout route
// nested inside the reviewer's ProtectedRoute:
//   <Route element={<ReviewerActiveGate />}> ...reviewer routes... </Route>
// A reviewer whose application an admin has not yet approved is held on the
// pending screen.

import { Navigate, Outlet } from 'react-router-dom';
import { getStoredUser, isReviewerActive } from './roles';

export default function ReviewerActiveGate() {
  if (!isReviewerActive(getStoredUser())) {
    return <Navigate to="/reviewer/pending" replace />;
  }

  return <Outlet />;
}
