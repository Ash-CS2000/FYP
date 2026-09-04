import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// A settings card that opens read-only and has to be put into edit mode
// deliberately.
//
// The pattern matters for an account section: a page full of live inputs makes
// it impossible to tell what is already saved from what you have merely typed,
// and it invites accidental edits on fields — institution, availability — that
// other people's decisions depend on. Read-only by default, one card in edit
// mode at a time, an explicit Save, and a Cancel that actually restores.
//
// Toggles are deliberately NOT built on this: a switch that needs a separate
// Save button reads as broken. Those save on change — see InstantToggle below.

function isEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => isEqual(a[k], b[k]));
  }
  return false;
}

/**
 * @param title     card heading
 * @param meta      one-line description under the heading
 * @param values    the saved values, an object
 * @param onSave    (draft) => Promise. Rejecting keeps edit mode open and shows the error.
 * @param children  ({ draft, set, editing }) => nodes
 * @param disabled  render without an Edit button (e.g. a role that may not change this)
 */
export default function EditableCard({
  title, meta, values, onSave, children, disabled = false, footerNote, className = '',
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(values);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef(null);

  // While not editing, follow the saved values — they can change underneath us
  // (another card's save returns a whole fresh user). While editing, never:
  // that would overwrite what the person is typing.
  useEffect(() => {
    if (!editing) setDraft(values);
  }, [values, editing]);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const dirty = useMemo(() => !isEqual(draft, values), [draft, values]);

  // Losing typed changes to a stray reload is the one failure this pattern
  // exists to prevent, so warn on the way out.
  useEffect(() => {
    if (!editing || !dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editing, dirty]);

  const set = useCallback((patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError('');
    setFieldErrors({});
  }, []);

  function startEdit() {
    setDraft(values);
    setError('');
    setFieldErrors({});
    setSaved(false);
    setEditing(true);
  }

  function cancel() {
    setDraft(values);      // discard — this is the whole point of Cancel
    setError('');
    setFieldErrors({});
    setEditing(false);
  }

  async function save() {
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      await onSave(draft);
      setEditing(false);
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      // Stay in edit mode: the typed values are still on screen and still the
      // only copy. Dropping back to view mode here would silently discard them.
      setError(err?.message || 'Could not save your changes. Please try again.');
      setFieldErrors(err?.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card ec${className ? ` ${className}` : ''}`}>
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {meta && <div className="card-meta">{meta}</div>}
        </div>
        <div className="ec-head-actions">
          {saved && !editing && <span className="pill pill-approved">Saved</span>}
          {!editing && !disabled && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={startEdit}>
              Edit
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {children({ draft, set, editing, fieldErrors })}

      {editing && (
        <div className="ec-footer">
          {footerNote && <span className="ec-footer-note">{footerNote}</span>}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={save}
            // Nothing changed means nothing to save — an enabled button there
            // just invites a pointless round trip.
            disabled={busy || !dirty}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={cancel} disabled={busy}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A read-only row, for view mode and for fields that are never editable.
 *
 * `locked` marks a field that is deliberately not yours to change — the name of
 * record, your email — as opposed to one that simply is not in edit mode yet.
 */
export function ReadRow({ label, value, hint, locked = false }) {
  const empty = value === undefined || value === null || value === '';
  return (
    <div className="ec-row">
      <div className="ec-row-label">
        {label}
        {locked && (
          <svg className="ec-lock" viewBox="0 0 24 24" width="12" height="12"
               fill="none" stroke="currentColor" strokeWidth="2" aria-label="Not editable">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        )}
      </div>
      <div className={`ec-row-value${empty ? ' ec-row-empty' : ''}`}>
        {empty ? 'Not set' : value}
      </div>
      {hint && <div className="field-hint ec-row-hint">{hint}</div>}
    </div>
  );
}

/**
 * A switch that saves the moment it is flipped.
 *
 * Deliberately outside EditableCard. A toggle communicates that it takes effect
 * immediately; pairing one with a Save button makes people wonder whether the
 * flip counted. The trade-off is that a failure has to be reported after the
 * fact, so this reverts the visual state and says so.
 */
export function InstantToggle({ label, desc, checked, onChange, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function flip(next) {
    setBusy(true);
    setError('');
    try {
      await onChange(next);
      setSaved(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err?.message || 'Could not save that. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="toggle-row">
      <div className="toggle-row-text">
        <div className="toggle-row-label">{label}</div>
        {desc && <div className="toggle-row-desc">{desc}</div>}
        {error && <div className="toggle-row-error">{error}</div>}
      </div>
      {saved && <span className="pill pill-approved">Saved</span>}
      <label className="switch">
        <input
          type="checkbox"
          checked={Boolean(checked)}
          disabled={disabled || busy}
          onChange={(e) => flip(e.target.checked)}
        />
        <span className="switch-track"><span className="switch-thumb" /></span>
      </label>
    </div>
  );
}
