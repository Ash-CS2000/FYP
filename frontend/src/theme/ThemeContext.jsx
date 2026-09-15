// src/theme/ThemeContext.jsx
//
// Light / dark mode. One place decides which one is showing and puts
// data-theme="dark" on <html>; styles.css does the rest.
//
// The choice ('light' | 'dark') belongs to the account — it is the
// `theme` preference in api/account.js — so it follows you to another device.
// It is also copied into localStorage, because index.html has to paint the right
// colours before React (and the account) has loaded; otherwise every page load
// would flash white first.
//
// Something that must stay light whatever the theme (a certificate, a printed
// page) goes inside an element with class "fixed-palette" — see styles.css.

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useCurrentUser } from '../auth/CurrentUserContext.jsx';
import { updatePreferences } from '../api/account';

export const THEME_STORAGE_KEY = 'paperbridge-theme';
export const THEME_CHOICES = ['light', 'dark'];

// Anything else — including 'system' saved by an older version of Settings —
// counts as light.
const normalise = (value) => (THEME_CHOICES.includes(value) ? value : 'light');

function readStored() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(value) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    /* storage unavailable — the account copy still applies */
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, patchUser, setUser } = useCurrentUser();
  const [stored, setStored] = useState(readStored);

  // Signed in: the account decides. Signed out: whatever this browser last used.
  const choice = normalise(user?.preferences?.theme ?? stored);


  // Keep the browser copy in step with the account, including a change saved
  // from Settings or on another device.
  useEffect(() => {
    if (choice !== stored) {
      writeStored(choice);
      setStored(choice);
    }
  }, [choice, stored]);

  // Before paint, so a change never shows a frame in the wrong colours.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (choice === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
  }, [choice]);

  /**
   * Change the theme. Applies at once, then saves to the account. If the save
   * fails the previous choice comes back and the error is re-thrown.
   */
  const setTheme = useCallback(async (next) => {
    const value = normalise(next);
    const previous = choice;
    writeStored(value);
    setStored(value);
    if (!user) return;

    patchUser({ preferences: { ...(user.preferences || {}), theme: value } });
    try {
      setUser(await updatePreferences({ theme: value }));
    } catch (err) {
      writeStored(previous);
      setStored(previous);
      patchUser({ preferences: { ...(user.preferences || {}), theme: previous } });
      throw err;
    }
  }, [choice, user, patchUser, setUser]);

  const value = useMemo(
    () => ({ choice, setTheme }),
    [choice, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 *   const { choice, setTheme } = useTheme();
 *
 * choice    what is showing: 'light' | 'dark'
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
