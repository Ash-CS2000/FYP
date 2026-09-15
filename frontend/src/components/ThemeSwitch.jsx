// src/components/ThemeSwitch.jsx
// Light / Dark, in the sidebar footer next to the other personal controls. The
// collapsed sidebar has no room for both buttons, so it shows one icon that
// flips between them instead.

import { useState } from 'react';
import { useTheme } from '../theme/ThemeContext.jsx';

const ICONS = {
  light: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
};

const OPTIONS = [
  { value: 'light', label: 'Light', title: 'Light mode' },
  { value: 'dark', label: 'Dark', title: 'Dark mode' },
];

export default function ThemeSwitch() {
  const { choice, setTheme } = useTheme();
  const [failed, setFailed] = useState(false);

  function pick(value) {
    if (value === choice) return;
    setFailed(false);
    setTheme(value).catch(() => setFailed(true));
  }

  const index = OPTIONS.findIndex(o => o.value === choice);
  const next = OPTIONS[(index + 1) % OPTIONS.length];
  const current = OPTIONS[index] || OPTIONS[0];

  return (
    <div className="sidebar-theme">
      <div className="sidebar-role-label" id="sidebar-theme-label">Theme</div>
      <div className="sidebar-role-toggle sidebar-theme-full" role="radiogroup" aria-labelledby="sidebar-theme-label">
        {OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={choice === o.value}
            title={o.title}
            className={`sidebar-role-toggle-btn sidebar-theme-btn ${choice === o.value ? 'active' : ''}`}
            onClick={() => pick(o.value)}
          >
            {ICONS[o.value]}
            {o.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="sidebar-theme-compact"
        title={`${current.title} — click for ${next.label.toLowerCase()}`}
        aria-label={`Theme: ${current.label}. Switch to ${next.label}.`}
        onClick={() => pick(next.value)}
      >
        {ICONS[current.value]}
      </button>
      {failed && <div className="sidebar-theme-error" role="alert">Couldn't save. Try again.</div>}
    </div>
  );
}

/**
 * One round button for the public pages' top bar: shows a moon in light mode
 * and a sun in dark mode, and switches to the other.
 */
export function ThemeIconButton() {
  const { choice, setTheme } = useTheme();
  const next = choice === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="theme-icon-btn"
      title={next === 'dark' ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label={next === 'dark' ? 'Switch to dark mode' : 'Switch to light mode'}
      // Signed-out visitors have no account to save to; a failed save for a
      // signed-in one just leaves the theme as it was.
      onClick={() => setTheme(next).catch(() => {})}
    >
      {ICONS[next]}
    </button>
  );
}
