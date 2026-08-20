// src/auth/TrainingGate.jsx
// Training gate for the author workspace. Use as a pathless layout route
// nested inside the author's ProtectedRoute:
//   <Route element={<TrainingGate />}> ...submission routes... </Route>
// An author who has not passed the final assessment cannot reach submission;
// they are sent back to the training module.

import { Navigate, Outlet } from 'react-router-dom';
import { isTrained } from '../data/trainingProgress.js';

export default function TrainingGate() {
  if (!isTrained()) {
    return <Navigate to="/author/training" replace />;
  }

  return <Outlet />;
}
