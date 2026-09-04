import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import TagPicker from '../components/TagPicker.jsx';
import { onboardEditor, listEditorInvites, cancelEditorInvite, listUsers } from '../api/admin.js';
import { SPECIALTY_TAG_LABELS } from '../data/specialtyTags.js';

const EMPTY_FORM = { userId: null, name: '', email: '', institution: '', specialtyTags: [], orcidId: '' };

export default function AdminInvites() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [invites, setInvites] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  function refreshInvites() {
    listEditorInvites()
      .then(rows => { if (Array.isArray(rows)) setInvites(rows); })
      .catch(() => { /* backend unavailable */ });
  }

  useEffect(() => {
    refreshInvites();
    listUsers()
      .then(rows => { if (Array.isArray(rows)) setUsers(rows); })
      .catch(() => { /* backend unavailable */ })
      .finally(() => setUsersLoading(false));
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || form.userId) return [];
    return users
      .filter(u => !(u.roles || []).includes('editor'))
      .filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, users, form.userId]);

  function pickUser(u) {
    setForm({
      userId: u.id,
      name: u.name || '',
      email: u.email || '',
      institution: u.institution && u.institution !== '—' ? u.institution : '',
      specialtyTags: u.specialty_tags || [],
      orcidId: u.orcid_id || '',
    });
    setQuery(u.name || u.email);
  }

  function clearPickedUser() {
    setForm(EMPTY_FORM);
    setQuery('');
  }

  async function submit(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) return setError('Please enter the invitee’s full name.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Please enter a valid email address.');
    setError('');
    setNotice('');
    setSending(true);
    try {
      const res = await onboardEditor({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        institution: form.institution.trim(),
        specialty_tags: form.specialtyTags,
        orcid_id: form.orcidId.trim(),
      });
      if (res?.status === 'invited') {
        setNotice(`Invitation sent to ${form.email}. The link expires in 72 hours.`);
        refreshInvites();
      } else if (res?.status === 'role_added') {
        setNotice(`${form.email} already had an account — the editor role was added and they were emailed.`);
      } else if (res?.status === 'already_editor') {
        setNotice(`${form.email} already holds the editor role.`);
      } else {
        setNotice(`Editor onboarding submitted for ${form.email}.`);
      }
      clearPickedUser();
    } catch (err) {
      setError(err?.message || 'Could not onboard the editor. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleCancelInvite(inviteId) {
    setCancelling(inviteId);
    try {
      await cancelEditorInvite(inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
      setNotice('Invite cancelled.');
    } catch (err) {
      setNotice(err?.message || 'Could not cancel the invite.');
    } finally {
      setCancelling(null);
    }
  }

  return (
    <AppShell role="admin" searchPlaceholder="Search users...">
      <style>{`
        .inv-lookup { position:relative; }
        .inv-lookup-menu { position:absolute; left:0; right:0; top:calc(100% + 4px); z-index:30; background:var(--white); border:1px solid var(--ink-200); border-radius:var(--r-md); box-shadow:var(--shadow-lg,0 10px 30px rgba(0,0,0,0.12)); max-height:220px; overflow-y:auto; }
        .inv-lookup-item { display:block; width:100%; text-align:left; padding:9px 14px; font-size:13px; border-bottom:1px solid var(--ink-100); }
        .inv-lookup-item:last-child { border-bottom:none; }
        .inv-lookup-item:hover { background:var(--ink-50,#f7f7f8); }
        .inv-lookup-item .name { font-weight:600; color:var(--navy-900); }
        .inv-lookup-item .email { color:var(--ink-600); margin-left:6px; }
        .inv-picked { display:flex; align-items:center; gap:8px; padding:9px 14px; border:1.5px solid var(--navy-900); border-radius:var(--r-md); background:var(--ink-50,#f7f7f8); font-size:13px; }
        .inv-picked button { margin-left:auto; }
        .inv-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .inv-audit-row { display:flex; gap:10px; align-items:baseline; padding:9px 0; border-bottom:1px solid var(--ink-100); font-size:13px; flex-wrap:wrap; }
        .inv-audit-row:last-child { border-bottom:none; }
        .inv-audit-time { margin-left:auto; font-size:11.5px; color:var(--ink-600); white-space:nowrap; }
        .inv-tag-local { font-size:10px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; padding:1px 6px; border-radius:99px; background:var(--ink-100); color:var(--ink-700); }
        .inv-chip { font-size:11px; font-weight:500; padding:2px 8px; border-radius:99px; background:#eef2ff; color:#3730a3; }
        @media(max-width:720px){ .inv-form-grid{ grid-template-columns:1fr; } }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">User Management</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Invite an <em className="serif-italic">Editor</em>.</h1>
          <p className="page-subtitle">Look up an existing user or invite someone new, and fill in their editorial profile.</p>
        </div>
      </div>

      {notice && (
        <div className="card fade-up delay-1" style={{ borderLeft: '3px solid var(--teal-600)', padding: '12px 18px', fontSize: 13.5, color: 'var(--navy-900)' }}>
          {notice}
        </div>
      )}

      <div className="card fade-up delay-1">
        <div className="card-header"><div className="card-title">Editor invitation</div></div>
        <form onSubmit={submit} style={{ padding: '4px 20px 20px' }}>
          <div className="field inv-lookup">
            <label className="field-label">Find an existing user</label>
            {form.userId ? (
              <div className="inv-picked">
                <span style={{ fontWeight: 600 }}>{form.name}</span>
                <span className="muted">{form.email}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearPickedUser}>Change</button>
              </div>
            ) : (
              <>
                <input
                  className="field-input"
                  type="text"
                  placeholder="Search by name or email…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                {matches.length > 0 && (
                  <div className="inv-lookup-menu">
                    {matches.map(u => (
                      <button key={u.id} type="button" className="inv-lookup-item" onClick={() => pickUser(u)}>
                        <span className="name">{u.name}</span>
                        <span className="email">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="field-hint">
              {usersLoading && !form.userId
                ? 'Loading user directory…'
                : 'Pick an existing author or reviewer to promote them and pre-fill their profile, or leave this blank and enter a brand-new invitee below.'}
            </div>
          </div>

          <div className="inv-form-grid">
            <div className="field">
              <label className="field-label">Full name</label>
              <input
                className="field-input"
                type="text"
                value={form.name}
                disabled={!!form.userId}
                placeholder="Nur Aisyah"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="field-label">Email address</label>
              <input
                className="field-input"
                type="email"
                value={form.email}
                disabled={!!form.userId}
                placeholder="name@university.edu.my"
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="field-label">Institution</label>
              <input
                className="field-input"
                type="text"
                value={form.institution}
                placeholder="Universiti Teknologi Malaysia"
                onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="field-label">ORCID iD <span className="muted">(optional)</span></label>
              <input
                className="field-input"
                type="text"
                value={form.orcidId}
                placeholder="0000-0000-0000-0000"
                onChange={e => setForm(f => ({ ...f, orcidId: e.target.value }))}
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: 4 }}>
            <label className="field-label">Areas of expertise</label>
            <TagPicker value={form.specialtyTags} onChange={tags => setForm(f => ({ ...f, specialtyTags: tags }))} />
          </div>

          {error && <div className="field-hint" style={{ color: 'var(--red-700)' }}>{error}</div>}

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
              {sending ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>

      <div className="card fade-up delay-2">
        <div className="card-header">
          <div className="card-title">
            Pending editor invites
            {invites.length > 0 && (
              <span style={{ marginLeft: 8, background: 'var(--amber-500)', color: 'var(--navy-950)', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>{invites.length}</span>
            )}
          </div>
        </div>
        <div style={{ padding: '4px 20px 18px' }}>
          {invites.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, padding: '10px 0' }}>No pending invites.</p>
          ) : invites.map(inv => (
            <div key={inv.id} className="inv-audit-row">
              {inv.name && <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{inv.name}</span>}
              <span className="muted">{inv.email}</span>
              {inv.institution && <span className="muted">{inv.institution}</span>}
              {(inv.specialty_tags || []).slice(0, 3).map(slug => (
                <span key={slug} className="inv-chip">{SPECIALTY_TAG_LABELS[slug] || slug}</span>
              ))}
              {inv.expired && <span className="inv-tag-local" style={{ color: 'var(--red-700)' }}>expired</span>}
              <span className="inv-audit-time">
                {inv.expired ? 'Link expired' : `Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--red-700)', borderColor: 'var(--red-200)' }}
                disabled={cancelling === inv.id}
                onClick={() => handleCancelInvite(inv.id)}
              >
                {cancelling === inv.id ? '…' : 'Cancel'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
