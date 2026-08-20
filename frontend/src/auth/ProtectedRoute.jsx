// src/auth/ProtectedRoute.jsx
// Route guard. Use as a pathless layout route wrapping a role's routes:
//   <Route element={<ProtectedRoute allow={['author']} />}> ...children... </Route>
// Omit `allow` to require only that the user is authenticated (any role).

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getStoredUser, getRoles, landingRoute } from './roles';

export default function ProtectedRoute({ allow }) {
  const location = useLocation();
  const user = getStoredUser();

  // Not signed in → send to login, remember where we were headed.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Signed in but this route isn't for their role(s) → send to their own workspace.
  if (allow && allow.length) {
    const roles = getRoles(user);
    const permitted = roles.some((r) => allow.includes(r));
    if (!permitted) {
      return <Navigate to={landingRoute(user)} replace />;
    }
  }

  return <Outlet />;
}
