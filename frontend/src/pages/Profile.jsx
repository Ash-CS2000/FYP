import { useRef, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import Avatar from '../components/Avatar.jsx';
import TagPicker from '../components/TagPicker.jsx';
import EditableCard, { ReadRow } from '../components/EditableCard.jsx';
import { useCurrentUser } from '../auth/CurrentUserContext.jsx';
import { ROLE_LABELS } from '../auth/roles';
import {
  updateMe, uploadAvatar, removeAvatar,
  AVATAR_MAX_BYTES, AVATAR_TYPES, DEFAULT_PREFERENCES,
} from '../api/account';
import { API_URL } from '../config';
import { authFetch } from '../api/auth';

// ── Photo ────────────────────────────────────────────────────────────────────

function IdentityCard({ user, setUser }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pick(e) {
    const file = e.target.files?.[0];
    // Let the same file be chosen again after a failure — without this, picking
    // the identical file twice fires no change event.
    e.target.value = '';
    if (!file) return;

    // Checked here as well as on the server so an obviously wrong file is
    // refused instantly instead of after a slow upload.
    if (!AVATAR_TYPES.includes(file.type)) {
      setError('Use a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError('That image is larger than 2 MB. Please choose a smaller one.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      setUser(await uploadAvatar(file));
    } catch (err) {
      setError(err?.message || 'Could not upload that image. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError('');
    try {
      setUser(await removeAvatar());
    } catch (err) {
      setError(err?.message || 'Could not remove your photo. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const roles = user?.roles?.length ? user.roles : [];

  return (
    <div className="card pf-identity">
      <Avatar user={user} size="xl" tone="amber" />

      <div className="pf-name">{user?.display_name || user?.name || user?.email}</div>
      {/* The name of record, shown alongside a nickname so the two are never
          confused for each other. */}
      {user?.display_name && user?.name && user.display_name !== user.name && (
        <div className="pf-sub">{user.name}</div>
      )}
      <div className="pf-sub">{user?.institution || '—'}</div>

      {roles.length > 0 && (
        <div className="pf-roles">
          {roles.map(r => (
            <span key={r} className="pill pill-pending">{ROLE_LABELS[r] || r}</span>
          ))}
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}

      <div className="pf-photo-actions">
        <input
          ref={fileRef}
          type="file"
          accept={AVATAR_TYPES.join(',')}
          onChange={pick}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? 'Working…' : user?.avatar_key ? 'Change photo' : 'Upload photo'}
        </button>
        {user?.avatar_key && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={clear}>
            Remove
          </button>
        )}
      </div>
      <div className="field-hint" style={{ marginTop: 8 }}>
        JPEG, PNG or WebP, up to 2 MB.
      </div>
    </div>
  );
}

// ── Personal information ─────────────────────────────────────────────────────

function PersonalInfoCard({ user, setUser }) {
  const values = {
    display_name: user?.display_name || '',
    institution: user?.institution || '',
    bio: user?.bio || '',
    research_areas: user?.research_areas || '',
    website: user?.website || '',
  };

  const save = async (draft) => setUser(await updateMe(draft));

  return (
    <EditableCard
      title="Personal information"
      meta="How you appear across PaperBridge."
      values={values}
      onSave={save}
    >
      {({ draft, set, editing, fieldErrors }) => (
        <>
          {/* The name of record. It is printed on submissions, decision letters
              and certificates, so it is not self-editable — changing it here
              would silently rewrite what is already on the published record.
              The server enforces this too; the lock is not the control. */}
          <div className="field">
            <label className="field-label">Full name</label>
            <div className="field-locked">
              <span>{user?.name || '—'}</span>
              <svg className="ec-lock" viewBox="0 0 24 24" width="13" height="13"
                   fill="none" stroke="currentColor" strokeWidth="2" aria-label="Not editable">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div className="field-hint">
              Your name of record on submissions and certificates. Contact an editor to correct it.
            </div>
          </div>

          <div className="field">
            <label className="field-label">Email</label>
            <div className="field-locked">
              <span>{user?.email || '—'}</span>
              <svg className="ec-lock" viewBox="0 0 24 24" width="13" height="13"
                   fill="none" stroke="currentColor" strokeWidth="2" aria-label="Not editable">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div className="field-hint">
              Your sign-in address and where notifications are sent. Contact an editor to change it.
            </div>
          </div>

          {editing ? (
            <>
              <div className="field-grid">
                <div className="field">
                  <label className="field-label" htmlFor="pf-nickname">Nickname</label>
                  <input
                    id="pf-nickname"
                    className="field-input"
                    maxLength={50}
                    value={draft.display_name}
                    onChange={e => set({ display_name: e.target.value })}
                    placeholder={user?.name || 'What should we call you?'}
                  />
                  <div className="field-hint">
                    Shown in the sidebar and greetings instead of your full name. Leave blank to use your full name.
                  </div>
                  {fieldErrors.display_name && (
                    <div className="field-hint" style={{ color: 'var(--red-700)' }}>{fieldErrors.display_name}</div>
                  )}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="pf-institution">Institution</label>
                  <input
                    id="pf-institution"
                    className="field-input"
                    value={draft.institution}
                    onChange={e => set({ institution: e.target.value })}
                    placeholder="e.g. Universiti Teknologi Malaysia"
                  />
                  {fieldErrors.institution && (
                    <div className="field-hint" style={{ color: 'var(--red-700)' }}>{fieldErrors.institution}</div>
                  )}
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="pf-bio">Bio</label>
                <textarea
                  id="pf-bio"
                  className="field-textarea"
                  rows="4"
                  value={draft.bio}
                  onChange={e => set({ bio: e.target.value })}
                  placeholder="Tell us about your research background and interests."
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="pf-research">Research interests</label>
                <input
                  id="pf-research"
                  className="field-input"
                  value={draft.research_areas}
                  onChange={e => set({ research_areas: e.target.value })}
                  placeholder="e.g. deep learning, medical imaging, computer vision"
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label" htmlFor="pf-website">Website</label>
                <input
                  id="pf-website"
                  className="field-input"
                  type="url"
                  value={draft.website}
                  onChange={e => set({ website: e.target.value })}
                  placeholder="https://"
                />
                {fieldErrors.website && (
                  <div className="field-hint" style={{ color: 'var(--red-700)' }}>{fieldErrors.website}</div>
                )}
              </div>
            </>
          ) : (
            <>
              <ReadRow label="Nickname" value={values.display_name} />
              <ReadRow label="Institution" value={values.institution} />
              <ReadRow label="Bio" value={values.bio} />
              <ReadRow label="Research interests" value={values.research_areas} />
              <ReadRow label="Website" value={values.website} />
            </>
          )}
        </>
      )}
    </EditableCard>
  );
}

// ── Reviewing ────────────────────────────────────────────────────────────────

// A reviewer's availability is theirs to set, and the editor's assignment panel
// reads it — an "unavailable" reviewer cannot be selected there at all, and a
// "heavy load" one is shown with a warning. That makes this the single most
// effective thing a reviewer can do to stop being invited at a bad time.
//
// These four live inside UserProfile.preferences rather than getting columns of
// their own: they are read and written together, never queried across users, and
// the assignment panel that consumes them has not been built yet.
const AVAILABILITY_OPTIONS = [
  { id: 'available',   label: 'Available',   blurb: 'Send me invitations as they come up.' },
  { id: 'busy',        label: 'Heavy load',  blurb: 'Invite me only if the fit is strong.' },
  { id: 'unavailable', label: 'Unavailable', blurb: 'Do not invite me at all for now.' },
];

function ReviewerProfileCard({ user, setUser }) {
  const prefs = { ...DEFAULT_PREFERENCES, ...(user?.preferences || {}) };
  const values = {
    availability: prefs.availability,
    unavailable_until: prefs.unavailable_until || '',
    max_concurrent: prefs.max_concurrent ?? 3,
    credentials: prefs.credentials || '',
    // A real column (users/0007_userprofile_specialty_tags), unlike the four
    // above — so it is split back out of the preferences blob on save.
    specialty_tags: user?.specialty_tags || [],
  };

  const save = async ({ specialty_tags, ...draft }) => setUser(await updateMe({
    specialty_tags,
    preferences: { ...draft, max_concurrent: Number(draft.max_concurrent) || 0 },
  }));

  const labelFor = id => AVAILABILITY_OPTIONS.find(o => o.id === id)?.label || id;

  return (
    <EditableCard
      title="Reviewing"
      meta="Editors see this when they pick reviewers. Keeping it current is what stops invitations arriving at the wrong time."
      values={values}
      onSave={save}
    >
      {({ draft, set, editing }) => (editing ? (
        <>
          <div className="field">
            <label className="field-label">Availability</label>
            <div style={{ display: 'grid', gap: 9, marginTop: 6 }}>
              {AVAILABILITY_OPTIONS.map(o => (
                <button
                  key={o.id}
                  type="button"
                  className={`pf-option ${draft.availability === o.id ? 'selected' : ''}`}
                  aria-pressed={draft.availability === o.id}
                  onClick={() => set({ availability: o.id })}
                >
                  <span className="pf-option-title">{o.label}</span>
                  <span className="pf-option-desc">{o.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          {draft.availability !== 'available' && (
            <div className="field">
              <label className="field-label" htmlFor="pf-until">
                Until <span className="muted">(optional)</span>
              </label>
              <input
                id="pf-until"
                className="field-input"
                type="date"
                style={{ maxWidth: 200 }}
                value={draft.unavailable_until}
                onChange={e => set({ unavailable_until: e.target.value })}
              />
              <div className="field-hint">
                Leave blank to stay this way indefinitely. With a date set, you go back to
                available on your own rather than having to remember.
              </div>
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="pf-max">Most reviews at once</label>
            <input
              id="pf-max"
              className="field-input"
              type="number"
              min="0"
              max="10"
              style={{ maxWidth: 120 }}
              value={draft.max_concurrent}
              onChange={e => set({ max_concurrent: e.target.value })}
            />
            <div className="field-hint">
              An editor sees your current load against this. It is a signal, not a hard cap.
            </div>
          </div>

          <div className="field">
            <label className="field-label">Specialty tags</label>
            <TagPicker
              value={draft.specialty_tags}
              onChange={(tags) => set({ specialty_tags: tags })}
              collapsible
            />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="pf-credentials">Credentials</label>
            <textarea
              id="pf-credentials"
              className="field-textarea"
              rows="4"
              value={draft.credentials}
              onChange={e => set({ credentials: e.target.value })}
              placeholder="Degrees, position, editorial board memberships, ORCID — whatever supports your expertise claims."
            />
            <div className="field-hint">
              Shown to admins when they verify reviewer applications. Not shown to authors.
            </div>
          </div>
        </>
      ) : (
        <>
          <ReadRow
            label="Availability"
            value={labelFor(values.availability)}
            hint={values.availability !== 'available' && values.unavailable_until
              ? `Until ${values.unavailable_until}`
              : undefined}
          />
          <ReadRow label="Most reviews at once" value={String(values.max_concurrent)} />
          <ReadRow label="Specialty tags" value={(values.specialty_tags || []).join(', ')} />
          <ReadRow label="Credentials" value={values.credentials} />
        </>
      ))}
    </EditableCard>
  );
}

// ── Reviewer application ─────────────────────────────────────────────────────

function BecomeReviewerCard({ user, setUser }) {
  const [expertise, setExpertise] = useState(user?.expertise_areas || '');
  const [applyTags, setApplyTags] = useState(user?.specialty_tags || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const status = user?.reviewer_status || '';

  async function apply(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/users/apply-reviewer/`, {
        method: 'POST',
        body: JSON.stringify({ expertise_areas: expertise, specialty_tags: applyTags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Failed to submit application.');
      setUser(data);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // An active reviewer already has the Reviewing card above; repeating the
  // status here is what made the old page show the same banner twice.
  if (status === 'active') return null;

  return (
    <div className="card fade-up delay-2">
      <div className="card-header">
        <div className="card-title">Become a reviewer</div>
      </div>

      {submitted && (
        <div className="alert alert-success">
          Application submitted — an admin will review it shortly.
        </div>
      )}

      {!submitted && status === 'pending' && (
        <div className="alert alert-warning">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          Your reviewer application is under review by an admin.
        </div>
      )}

      {!submitted && status === 'rejected' && (
        <div className="alert alert-error">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Your previous reviewer application was not approved. You may reapply below.
        </div>
      )}

      {!submitted && status !== 'pending' && (
        <form onSubmit={apply} style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13.5, color: 'var(--ink-600)', marginBottom: 14, lineHeight: 1.6 }}>
            As an author on PaperBridge, you can also contribute as a peer reviewer. Your
            application will be reviewed by an admin before the reviewer role is activated.
          </p>
          <div className="field">
            <label className="field-label" htmlFor="pf-expertise">Expertise areas</label>
            <input
              id="pf-expertise"
              className="field-input"
              type="text"
              placeholder="e.g. Machine Learning, Biomedical Engineering"
              value={expertise}
              onChange={e => setExpertise(e.target.value)}
            />
            <div className="field-hint">Free text, for an admin reading your application.</div>
          </div>
          <div className="field">
            <label className="field-label">Specialty tags</label>
            <TagPicker value={applyTags} onChange={setApplyTags} collapsible />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? 'Submitting…' : 'Apply as reviewer →'}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Profile({ role = 'author' }) {
  const { user, setUser } = useCurrentUser();

  const roles = user?.roles?.length ? user.roles : [role];
  const isAuthor = roles.includes('author');
  const isActiveReviewer = roles.includes('reviewer') && user?.reviewer_status === 'active';

  return (
    <AppShell role={role} searchPlaceholder="Search...">
      <style>{`
        .pf-option { text-align: left; border: 1.5px solid var(--ink-200); border-radius: var(--r-md); padding: 11px 14px; background: var(--white); cursor: pointer; transition: all var(--t-fast); display: block; width: 100%; }
        .pf-option:hover { border-color: var(--navy-700); }
        .pf-option.selected { border-color: var(--navy-900); background: var(--navy-100); }
        .pf-option-title { display: block; font-weight: 600; font-size: 13.5px; color: var(--navy-900); }
        .pf-option-desc { display: block; font-size: 12.5px; color: var(--ink-600); margin-top: 2px; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Account</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Your <em className="serif-italic">profile</em>.</h1>
          {/* No page-level Save button: each card owns its own edit state and
              saves to its own endpoint, so one global Save could only ever be
              ambiguous about what it was saving. */}
          <p className="page-subtitle">Update how you appear across PaperBridge.</p>
        </div>
      </div>

      <div className="split-grid fade-up delay-1" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <IdentityCard user={user} setUser={setUser} />
        <PersonalInfoCard user={user} setUser={setUser} />
      </div>

      {isActiveReviewer && (
        <div className="gap-grid fade-up delay-2" style={{ marginTop: 24 }}>
          <ReviewerProfileCard user={user} setUser={setUser} />
        </div>
      )}

      {isAuthor && (
        <div className="gap-grid" style={{ marginTop: 24 }}>
          <BecomeReviewerCard user={user} setUser={setUser} />
        </div>
      )}
    </AppShell>
  );
}
