import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe } from '../api/account';
import { getStoredUser } from '../utils/user.js';
import { getAccessToken } from '../api/auth';

// One place that owns "who is signed in".
//
// Before this existed, every consumer called getStoredUser() independently —
// the sidebar, the public nav, the profile page. Each got its own snapshot of
// localStorage taken at render, so changing your nickname or photo left the
// sidebar showing the old one until a full page reload. Routing them all
// through one piece of state is what makes a save visible everywhere at once.
//
// localStorage stays the source of truth across reloads (LoginPage, RegisterPage,
// OrcidCallback and EditorInvite all write it), so this reads it on mount and
// writes back on every change rather than replacing it.
const CurrentUserContext = createContext(null);

export function CurrentUserProvider({ children }) {
  // Seeded synchronously so there is no signed-out flash on first paint: the
  // stored user is already correct, it may just be slightly stale.
  const [user, setUser] = useState(getStoredUser);

  const persist = useCallback((next) => {
    setUser(next);
    try {
      if (next) localStorage.setItem('user', JSON.stringify(next));
      else localStorage.removeItem('user');
    } catch {
      /* storage unavailable — the value still applies for this session */
    }
    return next;
  }, []);

  // Revalidate against the server once on mount. The stored copy can be days
  // old — roles granted, a reviewer application approved, a photo added from
  // another device.
  useEffect(() => {
    if (!getAccessToken()) return;
    let cancelled = false;
    getMe()
      .then((fresh) => { if (!cancelled) persist(fresh); })
      // Offline, or the token expired and authFetch is already redirecting to
      // /login. Either way the stored copy stands; this is a refresh, not a gate.
      .catch(() => {});
    return () => { cancelled = true; };
  }, [persist]);

  const value = useMemo(() => ({
    user,

    /** Replace the current user — pass a server response straight in. */
    setUser: persist,

    /** Merge fields into the current user (e.g. after a partial save). */
    patchUser: (fields) => persist({ ...(user || {}), ...fields }),

    /** Re-read from the server. Returns the fresh user. */
    refresh: () => getMe().then(persist),
  }), [user, persist]);

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

/**
 * The signed-in user and the ways to change it.
 *
 *   const { user, patchUser, refresh } = useCurrentUser();
 *
 * Falls back to reading localStorage directly when used outside the provider,
 * so a component rendered off the main tree still shows the right person rather
 * than crashing.
 */
export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (ctx) return ctx;
  const stored = getStoredUser();
  return { user: stored, setUser: () => {}, patchUser: () => {}, refresh: () => Promise.resolve(stored) };
}
