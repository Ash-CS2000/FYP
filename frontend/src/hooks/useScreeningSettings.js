// src/hooks/useScreeningSettings.js
//
// The platform's screening policy, read from the server so every screen bands a
// similarity score the same way. A module-level copy means a page mounting after
// the first fetch shows the real values immediately instead of flashing the
// defaults, and a save on the Settings page reaches every mounted consumer.

import { useEffect, useState } from 'react';
import { getScreeningSettings } from '../api/similarity.js';
import { DEFAULT_SCREENING_SETTINGS } from '../data/screeningSettings.js';

let cached = null;
let inflight = null;
const listeners = new Set();

function publish(next) {
  cached = { ...DEFAULT_SCREENING_SETTINGS, ...next };
  listeners.forEach(fn => fn(cached));
  return cached;
}

function refresh() {
  if (!inflight) {
    inflight = getScreeningSettings()
      .then(publish)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Push a saved server response to every consumer. */
export function publishScreeningSettings(next) {
  return publish(next);
}

/**
 * @returns {{ settings: object, status: 'loading' | 'ready' | 'error' }}
 *   `settings` holds the defaults until the server answers, so callers can always
 *   band a score; `status` says whether those values are confirmed.
 */
export function useScreeningSettings() {
  const [settings, setSettings] = useState(() => cached || DEFAULT_SCREENING_SETTINGS);
  const [status, setStatus] = useState(cached ? 'ready' : 'loading');

  useEffect(() => {
    let active = true;
    const onChange = (next) => { if (active) { setSettings(next); setStatus('ready'); } };
    listeners.add(onChange);
    // Re-read on every mount: another admin may have changed the policy since.
    refresh().catch(() => { if (active && !cached) setStatus('error'); });
    return () => { active = false; listeners.delete(onChange); };
  }, []);

  return { settings, status };
}
