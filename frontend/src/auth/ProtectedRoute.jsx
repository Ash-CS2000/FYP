// src/auth/ProtectedRoute.jsx
// Route guard. Use as a pathless layout route wrapping a role's routes:
//   <Route element={<ProtectedRoute allow={['author']} />}> ...children... </Route>
// Omit `allow` to require only that the user is authenticated (any role).

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getRoles, landingRoute } from './roles';
import { useCurrentUser } from './CurrentUserContext.jsx';

export default function ProtectedRoute({ allow }) {
  const location = useLocation();
  // Read from the context, not getStoredUser(), so the check re-runs when the
  // user is revalidated. CurrentUserProvider calls getMe() on mount; a stale
  // localStorage copy can list a role the account no longer has, which would
  // otherwise let someone linger on a workspace they've lost access to until a
  // full reload.
  const { user } = useCurrentUser();

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
