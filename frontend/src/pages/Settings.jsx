import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import EditableCard, { ReadRow, InstantToggle } from '../components/EditableCard.jsx';
import { useCurrentUser } from '../auth/CurrentUserContext.jsx';
import { patchScreeningSettings } from '../api/similarity.js';
import { useScreeningSettings, publishScreeningSettings } from '../hooks/useScreeningSettings.js';
import { deleteAccount, clearSession } from '../api/auth';
import { updatePreferences, changePassword, DEFAULT_PREFERENCES } from '../api/account';

// ── General ──────────────────────────────────────────────────────────────────

const LANGUAGES = [
  ['en', 'English'],
  ['ms', 'Bahasa Malaysia'],
  ['zh', '中文 (简体)'],
];
const TIMEZONES = [
  ['Asia/Kuala_Lumpur', '(GMT+8) Kuala Lumpur'],
  ['Asia/Singapore', '(GMT+8) Singapore'],
  ['Asia/Tokyo', '(GMT+9) Tokyo'],
  ['Europe/London', '(GMT+0) London'],
];
const DATE_FORMATS = [
  ['dmy', 'DD MMM YYYY (12 Jan 2026)'],
  ['mdy', 'MMM DD, YYYY (Jan 12, 2026)'],
  ['iso', 'YYYY-MM-DD (2026-01-12)'],
];
const THEMES = [
  ['light', 'Light'],
  ['system', 'Match system'],
];

const labelOf = (pairs, id) => pairs.find(([v]) => v === id)?.[1] || id;

function PreferencesCard({ prefs, save }) {
  const values = {
    language: prefs.language,
    timezone: prefs.timezone,
    date_format: prefs.date_format,
    theme: prefs.theme,
  };

  return (
    <EditableCard
      title="Preferences"
      meta="Language, timezone and display options. These follow your account, not this browser."
      values={values}
      onSave={save}
    >
      {({ draft, set, editing }) => (editing ? (
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="st-lang">Language</label>
            <select id="st-lang" className="field-select" value={draft.language}
                    onChange={e => set({ language: e.target.value })}>
              {LANGUAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="st-tz">Timezone</label>
            <select id="st-tz" className="field-select" value={draft.timezone}
                    onChange={e => set({ timezone: e.target.value })}>
              {TIMEZONES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div className="field-hint">Deadlines and timestamps are shown in this zone.</div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="st-df">Date format</label>
            <select id="st-df" className="field-select" value={draft.date_format}
                    onChange={e => set({ date_format: e.target.value })}>
              {DATE_FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="st-theme">Theme</label>
            <select id="st-theme" className="field-select" value={draft.theme}
                    onChange={e => set({ theme: e.target.value })}>
              {THEMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <>
          <ReadRow label="Language" value={labelOf(LANGUAGES, values.language)} />
          <ReadRow label="Timezone" value={labelOf(TIMEZONES, values.timezone)} />
          <ReadRow label="Date format" value={labelOf(DATE_FORMATS, values.date_format)} />
          <ReadRow label="Theme" value={labelOf(THEMES, values.theme)} />
        </>
      ))}
    </EditableCard>
  );
}

// ── Notifications ────────────────────────────────────────────────────────────

const NOTIFICATION_ROWS = [
  ['notify_email_digest', 'Email digest', 'A daily summary delivered to your inbox.'],
  ['notify_in_app', 'In-app notifications', 'Real-time alerts in the PaperBridge notification bell.'],
  ['notify_weekly_summary', 'Weekly summary', 'A roll-up of all activity every Monday morning.'],
  ['notify_reviewer_reminders', 'Reviewer reminders', 'Gentle nudges as deadlines approach.'],
];

function NotificationsCard({ prefs, save }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Notifications</div>
          <div className="card-meta">
            Choose how you want to be alerted. Changes save as you make them.
          </div>
        </div>
      </div>
      {NOTIFICATION_ROWS.map(([key, label, desc]) => (
        <InstantToggle
          key={key}
          label={label}
          desc={desc}
          checked={prefs[key]}
          onChange={next => save({ [key]: next })}
        />
      ))}
    </div>
  );
}

// ── Privacy ──────────────────────────────────────────────────────────────────

const VISIBILITY = [
  ['public', 'Public — anyone can see my profile'],
  ['community', 'Community — only PaperBridge users'],
  ['private', 'Private — only editors and admins'],
];

function PrivacyCard({ prefs, save }) {
  const values = {
    privacy_visibility: prefs.privacy_visibility,
    privacy_signed_reviews: prefs.privacy_signed_reviews,
  };

  return (
    <EditableCard
      title="Privacy"
      meta="Control what others can see."
      values={values}
      onSave={save}
    >
      {({ draft, set, editing }) => (editing ? (
        <>
          <div className="field">
            <label className="field-label" htmlFor="st-vis">Profile visibility</label>
            <select id="st-vis" className="field-select" value={draft.privacy_visibility}
                    onChange={e => set({ privacy_visibility: e.target.value })}>
              {VISIBILITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="st-signed">Review signing</label>
            <select id="st-signed" className="field-select" value={draft.privacy_signed_reviews ? 'signed' : 'anon'}
                    onChange={e => set({ privacy_signed_reviews: e.target.value === 'signed' })}>
              <option value="anon">Keep my reviews anonymous (recommended)</option>
              <option value="signed">Sign my reviews with my name</option>
            </select>
            <div className="field-hint">
              PaperBridge uses double-blind review by default. Authors will not see your
              name regardless of this setting.
            </div>
          </div>
        </>
      ) : (
        <>
          <ReadRow label="Profile visibility" value={labelOf(VISIBILITY, values.privacy_visibility)} />
          <ReadRow
            label="Review signing"
            value={values.privacy_signed_reviews ? 'Signed with my name' : 'Anonymous'}
          />
        </>
      ))}
    </EditableCard>
  );
}

// ── Security ─────────────────────────────────────────────────────────────────

// The password rules, shown before you submit rather than discovered by failing.
//
// The similarity rule is the one worth stating out loud: it is invisible until it
// fires, and Django reports it against whichever attribute matched — your email,
// first name or last name — so a user who has never seen these rules just sees an
// unexplained rejection. These checks mirror the server's; the server remains the
// one that decides.
const PW_MIN = 8;

function similarTo(password, user) {
  const pw = (password || '').toLowerCase();
  if (pw.length < 4) return false;
  const parts = [
    user?.first_name, user?.last_name,
    // The local part is what people actually reuse, so check it as well as the
    // whole address.
    (user?.email || '').split('@')[0], user?.email,
  ];
  return parts.some((raw) => {
    const v = (raw || '').toLowerCase().trim();
    if (v.length < 4) return false;
    return pw.includes(v) || v.includes(pw);
  });
}

function PasswordRules({ value, user }) {
  const v = value || '';
  const rules = [
    [v.length >= PW_MIN, `At least ${PW_MIN} characters`],
    [!/^\d+$/.test(v), 'Not all numbers'],
    [!similarTo(v, user), 'Not similar to your name or email'],
  ];
  // Nothing typed yet: state the rules plainly, without marking them failed.
  const untouched = v.length === 0;

  return (
    <ul className="pw-rules">
      {rules.map(([met, label]) => (
        <li key={label} className={untouched ? '' : met ? 'met' : 'unmet'}>
          <span className="pw-rule-mark" aria-hidden="true">{untouched ? '•' : met ? '✓' : '○'}</span>
          {label}
        </li>
      ))}
      <li className={untouched ? '' : 'met'}>
        <span className="pw-rule-mark" aria-hidden="true">{untouched ? '•' : '✓'}</span>
        Not a commonly used password <span className="muted">(checked when you save)</span>
      </li>
    </ul>
  );
}

function ChangePasswordCard({ user }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [done, setDone] = useState(false);

  const reset = () => {
    setCurrent(''); setNext(''); setConfirm('');
    setError(''); setFieldErrors({});
  };

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = current && next.length >= 8 && next === confirm && !busy;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      // Returns a fresh token pair and stores it — the old refresh token is
      // revoked server-side, so without this the session would die at the next
      // silent refresh.
      await changePassword(current, next);
      reset();
      setOpen(false);
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Could not change your password. Please try again.');
      setFieldErrors(err?.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Password</div>
          <div className="card-meta">Keep your account safe.</div>
        </div>
        {!open && (
          <button type="button" className="btn btn-ghost btn-sm"
                  onClick={() => { setDone(false); setOpen(true); }}>
            Change password
          </button>
        )}
      </div>

      {done && !open && (
        <div className="alert alert-success">
          Your password has been changed. You are still signed in on this device;
          other devices will need the new password.
        </div>
      )}

      {!open ? (
        <ReadRow label="Password" value="••••••••••" hint="Last changed is not recorded." />
      ) : (
        <form onSubmit={submit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label className="field-label" htmlFor="st-cur">Current password</label>
            <input id="st-cur" className="field-input" type="password" autoComplete="current-password"
                   value={current} onChange={e => setCurrent(e.target.value)} />
            {fieldErrors.current_password && (
              <div className="field-hint" style={{ color: 'var(--red-700)' }}>{fieldErrors.current_password}</div>
            )}
          </div>

          <div className="field-grid">
            <div className="field">
              <label className="field-label" htmlFor="st-new">New password</label>
              <input id="st-new" className="field-input" type="password" autoComplete="new-password"
                     value={next} onChange={e => setNext(e.target.value)} />
              <PasswordRules value={next} user={user} />
              {fieldErrors.new_password && (
                <div className="field-hint" style={{ color: 'var(--red-700)' }}>{fieldErrors.new_password}</div>
              )}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="st-confirm">Confirm new password</label>
              <input id="st-confirm" className="field-input" type="password" autoComplete="new-password"
                     value={confirm} onChange={e => setConfirm(e.target.value)} />
              {mismatch && (
                <div className="field-hint" style={{ color: 'var(--red-700)' }}>
                  These two do not match.
                </div>
              )}
            </div>
          </div>

          <div className="ec-footer">
            <button type="submit" className="btn btn-primary btn-sm" disabled={!canSubmit}>
              {busy ? 'Changing…' : 'Change password'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
                    onClick={() => { reset(); setOpen(false); }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Self-service account deletion. Soft delete on the server — the account is
// deactivated (no login) but its record stays. See DELETE /api/users/me/.
function DangerZoneCard() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    setBusy(true);
    setError('');
    try {
      await deleteAccount();
      clearSession();
      window.location.href = '/login';
    } catch (err) {
      setError(err?.message || 'Could not delete your account. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ borderColor: '#f0c9c9' }}>
      <div className="card-header">
        <div>
          <div className="card-title" style={{ color: 'var(--red-700)' }}>Delete account</div>
          <div className="card-meta">
            Removes your access to PaperBridge. Your submitted work stays on the record.
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!confirming ? (
        <button className="btn btn-ghost btn-sm"
                style={{ color: 'var(--red-700)', borderColor: '#f0c9c9' }}
                onClick={() => setConfirming(true)}>
          Delete my account
        </button>
      ) : (
        <div>
          <p style={{ fontSize: 13.5, color: 'var(--navy-900)', marginBottom: 10 }}>
            This deactivates your account — you will be signed out and can no longer log in.
            An administrator can restore it later. Continue?
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={remove}>
              {busy ? 'Deleting…' : 'Yes, delete my account'}
            </button>
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Platform (admin) ─────────────────────────────────────────────────────────

// Screening thresholds are platform policy, so only an admin sets them — see the
// role model: editors act on the bands, admins define them. Every other screen
// re-bands its existing reports from these numbers; changing one never re-runs a
// check.
// Numbers are saved with an explicit button, not on every keystroke: each save
// is a policy change written to the audit log, and typing "40" must not record
// a change to 4 on the way.
const NUMERIC_SCREENING_FIELDS = ['review_threshold', 'high_threshold', 'min_words'];

function ScreeningSettingsCard() {
  const { settings, status } = useScreeningSettings();
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const values = { ...settings, ...draft };
  const changed = Object.keys(draft).filter(k => Number(draft[k]) !== Number(settings[k]));
  const invalid = Number(values.review_threshold) >= Number(values.high_threshold);
  const outOfRange =
    [values.review_threshold, values.high_threshold].some(v => v === '' || v < 0 || v > 100)
    || values.min_words === '' || values.min_words < 0 || values.min_words > 200;
  const locked = status !== 'ready';

  const edit = (patch) => {
    setDraft(prev => ({ ...prev, ...patch }));
    setSaveError('');
    setSaved(false);
  };

  async function saveNumbers() {
    setSaving(true);
    setSaveError('');
    try {
      const patch = Object.fromEntries(changed.map(k => [k, Number(draft[k])]));
      publishScreeningSettings(await patchScreeningSettings(patch));
      setDraft({});
      setSaved(true);
    } catch (err) {
      setSaveError(err?.message || 'Could not save the thresholds. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Thrown errors surface inside InstantToggle, next to the switch that failed.
  async function saveToggle(key, next) {
    publishScreeningSettings(await patchScreeningSettings({ [key]: next }));
  }

  const lastChanged = settings.updated_at
    ? `Last changed by ${settings.updated_by_name || 'an administrator'} on ${new Date(settings.updated_at).toLocaleString()}.`
    : 'Using the platform defaults — never changed.';

  const toggles = [
    ['exclude_quotes', 'Exclude quotations', 'Text inside quotation marks is not counted towards the score.'],
    ['exclude_bibliography', 'Exclude bibliography', 'Reference lists overlap heavily by nature and would inflate every score.'],
    ['auto_flag', 'Auto-flag above the high threshold', 'Flagged manuscripts appear in the editor’s screening queue automatically.'],
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Similarity screening</div>
          <div className="card-meta">
            Thresholds and exclusions applied to every submission, for every editor.{' '}
            {status === 'loading' && 'Loading the current policy…'}
            {status === 'error' && 'Could not load the current policy, so changes are disabled.'}
            {status === 'ready' && lastChanged}
          </div>
        </div>
      </div>

      <div className="field-grid">
        <div className="field">
          <label className="field-label">Review threshold (%)</label>
          <input className="field-input" type="number" min="0" max="100" disabled={locked}
                 value={values.review_threshold}
                 onChange={(e) => edit({ review_threshold: e.target.value === '' ? '' : Number(e.target.value) })} />
          <div className="field-hint">At or above this, the score is shown in amber for the editor’s attention.</div>
        </div>
        <div className="field">
          <label className="field-label">Flag threshold (%)</label>
          <input className="field-input" type="number" min="0" max="100" disabled={locked}
                 value={values.high_threshold}
                 onChange={(e) => edit({ high_threshold: e.target.value === '' ? '' : Number(e.target.value) })} />
          <div className="field-hint">At or above this, the manuscript is flagged for screening before review.</div>
        </div>
      </div>

      {invalid && (
        <div className="field-hint" style={{ color: 'var(--red-800)' }}>
          The review threshold must be lower than the flag threshold.
        </div>
      )}

      <div className="field">
        <label className="field-label">Ignore matches shorter than</label>
        <input className="field-input" type="number" min="0" max="200" style={{ maxWidth: 140 }} disabled={locked}
               value={values.min_words}
               onChange={(e) => edit({ min_words: e.target.value === '' ? '' : Number(e.target.value) })} />
        <div className="field-hint">Words. Short common phrases match everywhere and are rarely meaningful.</div>
      </div>

      {outOfRange && (
        <div className="field-hint" style={{ color: 'var(--red-800)' }}>
          Thresholds must be between 0 and 100, and the minimum match length between 0 and 200.
        </div>
      )}

      <div className="row" style={{ gap: 10, alignItems: 'center', marginBottom: 18 }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={locked || saving || changed.length === 0 || invalid || outOfRange}
          onClick={saveNumbers}
        >
          {saving ? 'Saving…' : 'Save thresholds'}
        </button>
        {changed.length > 0 && !saving && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDraft({}); setSaveError(''); }}>
            Discard
          </button>
        )}
        {saved && <span style={{ fontSize: 12.5, color: 'var(--teal-700)' }}>Saved — every editor now sees the new bands.</span>}
        {saveError && <span style={{ fontSize: 12.5, color: 'var(--red-800)' }}>{saveError}</span>}
      </div>

      {toggles.map(([key, label, desc]) => (
        <InstantToggle
          key={key}
          label={label}
          desc={desc}
          checked={settings[key]}
          disabled={locked}
          onChange={(nextValue) => saveToggle(key, nextValue)}
        />
      ))}

      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.55 }}>
        The engine matches verbatim and near-verbatim reuse. Paraphrased and translated text is not
        detected, so a low score is not evidence of originality and a high score is not a finding of
        misconduct — both are prompts for an editor to read the matched passages.
      </div>
    </div>
  );
}

// Journal categories drive the submission wizard's category picker, the reviewer
// pool's expertise matching, and the editor's filters. Because they are
// referenced by existing manuscripts, renaming a category must rename it
// everywhere rather than orphan the papers filed under it, and removing one that
// is in use has to be refused rather than silently detaching them.
//
//   GET   /api/settings/categories/            → Category[]
//   POST  /api/settings/categories/            { name, subcategories }
//   PATCH /api/settings/categories/:id/        { name, subcategories }
//   DELETE /api/settings/categories/:id/       409 if any manuscript uses it
const CATEGORIES_KEY = 'paperbridge-journal-categories';

const DEFAULT_CATEGORIES = [
  { id: 'cs',   name: 'Computer Science', subcategories: ['AI & ML', 'Systems', 'Security', 'HCI'] },
  { id: 'eng',  name: 'Engineering',      subcategories: ['Civil', 'Electrical', 'Mechanical'] },
  { id: 'med',  name: 'Medicine',         subcategories: ['Clinical', 'Public Health'] },
  { id: 'bus',  name: 'Business',         subcategories: ['Finance', 'Operations', 'Strategy'] },
  { id: 'soc',  name: 'Social Sciences',  subcategories: ['Education', 'Linguistics', 'Psychology'] },
  { id: 'env',  name: 'Environmental',    subcategories: ['Climate', 'Sustainability'] },
];

function loadCategories() {
  try {
    const raw = window.localStorage.getItem(CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function persistCategories(next) {
  try {
    window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the in-memory value still applies this session */
  }
  return next;
}

function CategoriesCard() {
  const [categories, setCategories] = useState(loadCategories);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [draftSubs, setDraftSubs] = useState('');

  const commit = (next) => { setCategories(next); persistCategories(next); };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
    commit([...categories, { id: `c-${Date.now()}`, name, subcategories: [] }]);
    setNewName('');
  };

  const startEdit = (cat) => {
    setEditing(cat.id);
    setDraftSubs(cat.subcategories.join(', '));
  };

  const saveSubs = (cat) => {
    const subs = draftSubs.split(',').map(s => s.trim()).filter(Boolean);
    commit(categories.map(c => (c.id === cat.id ? { ...c, subcategories: subs } : c)));
    setEditing(null);
  };

  const remove = (cat) => commit(categories.filter(c => c.id !== cat.id));

  return (
    <div className="card">
      <style>{`
        .cat-row { padding: 13px 0; border-bottom: 1px solid var(--ink-100); }
        .cat-row:last-of-type { border-bottom: none; }
        .cat-head { display: flex; align-items: center; gap: 12px; }
        .cat-name { font-weight: 600; font-size: 14px; color: var(--navy-900); }
        .cat-subs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
        .cat-sub { background: var(--ink-100); color: var(--ink-700); font-size: 11.5px; padding: 3px 9px; border-radius: var(--r-pill); }
        .cat-actions { margin-left: auto; display: flex; gap: 12px; }
        .cat-link { background: none; border: none; padding: 0; cursor: pointer; font-weight: 600; font-size: 12.5px; color: var(--navy-700); }
        .cat-link.danger { color: var(--red-700); }
      `}</style>

      <div className="card-header">
        <div>
          <div className="card-title">Journal categories</div>
          <div className="card-meta">
            Used by the submission wizard, reviewer matching and the editor&apos;s filters.
            Renaming one renames it on every manuscript already filed under it.
          </div>
        </div>
      </div>

      {categories.map(cat => (
        <div className="cat-row" key={cat.id}>
          <div className="cat-head">
            <span className="cat-name">{cat.name}</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {cat.subcategories.length} subcategor{cat.subcategories.length === 1 ? 'y' : 'ies'}
            </span>
            <span className="cat-actions">
              <button className="cat-link" onClick={() => (editing === cat.id ? saveSubs(cat) : startEdit(cat))}>
                {editing === cat.id ? 'Save' : 'Edit'}
              </button>
              <button className="cat-link danger" onClick={() => remove(cat)}>Remove</button>
            </span>
          </div>

          {editing === cat.id ? (
            <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
              <input className="field-input" value={draftSubs}
                     onChange={e => setDraftSubs(e.target.value)}
                     placeholder="Comma-separated subcategories" />
            </div>
          ) : cat.subcategories.length > 0 && (
            <div className="cat-subs">
              {cat.subcategories.map(s => <span className="cat-sub" key={s}>{s}</span>)}
            </div>
          )}
        </div>
      ))}

      <div className="row" style={{ marginTop: 16, gap: 10 }}>
        <input className="field-input" style={{ maxWidth: 280 }} value={newName}
               onChange={e => setNewName(e.target.value)}
               onKeyDown={e => { if (e.key === 'Enter') add(); }}
               placeholder="New category name" />
        <button className="btn btn-ghost btn-sm" onClick={add} disabled={!newName.trim()}>
          Add category
        </button>
      </div>

      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.55 }}>
        Removing a category that manuscripts are filed under must be refused by the
        server, not silently detach them.
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'general',       label: 'General' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy',       label: 'Privacy' },
  { id: 'security',      label: 'Security' },
  { id: 'platform',      label: 'Platform', adminOnly: true },
];

export default function Settings({ role = 'author' }) {
  const { user, setUser } = useCurrentUser();
  const [params, setParams] = useSearchParams();

  const isAdmin = (user?.roles || [role]).includes('admin');
  const sections = SECTIONS.filter(s => !s.adminOnly || isAdmin);

  // The section lives in the URL so it can be linked to and so Back moves
  // between sections rather than leaving the page.
  const requested = params.get('section');
  const active = sections.some(s => s.id === requested) ? requested : sections[0].id;

  const prefs = { ...DEFAULT_PREFERENCES, ...(user?.preferences || {}) };

  // Every preference card saves the same way: send only what changed, let the
  // server merge it into the stored blob, and put the returned user back into
  // context so the rest of the app sees it immediately.
  const savePrefs = async (patch) => setUser(await updatePreferences(patch));

  return (
    <AppShell role={role} searchPlaceholder="Search settings...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Account</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            <em className="serif-italic">Settings</em>.
          </h1>
          {/* No page-level Save: each card saves its own section, so a single
              global button could only ever be ambiguous about what it saved. */}
          <p className="page-subtitle">Manage how PaperBridge works for you.</p>
        </div>
      </div>

      <div className="tabs settings-tabs fade-up">
        {sections.map(s => (
          <button
            key={s.id}
            type="button"
            className={`tab${active === s.id ? ' active' : ''}`}
            aria-current={active === s.id ? 'page' : undefined}
            onClick={() => setParams({ section: s.id })}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="gap-grid fade-up delay-1">
        {active === 'general' && <PreferencesCard prefs={prefs} save={savePrefs} />}

        {active === 'notifications' && <NotificationsCard prefs={prefs} save={savePrefs} />}

        {active === 'privacy' && <PrivacyCard prefs={prefs} save={savePrefs} />}

        {active === 'security' && (
          <>
            <ChangePasswordCard user={user} />
            <DangerZoneCard />
          </>
        )}

        {active === 'platform' && isAdmin && (
          <>
            <ScreeningSettingsCard />
            <CategoriesCard />
          </>
        )}
      </div>
    </AppShell>
  );
}
