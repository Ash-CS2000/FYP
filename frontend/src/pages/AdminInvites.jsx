// src/pages/AdminInvites.jsx
// Invitations: bring editors and administrators onto the platform. Two tabs —
// the tab lives in the URL (?tab=admins) so it can be linked to.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import TagPicker from '../components/TagPicker.jsx';
import EmailHint, { describeEmail, useEmailStatus } from '../components/invitations/EmailHint.jsx';
import RecentlyAdded from '../components/invitations/RecentlyAdded.jsx';
import AdminInvitesPanel from '../components/invitations/AdminInvitesPanel.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { onboardEditor, listEditorInvites, cancelEditorInvite, listUsers, listAdminInvites } from '../api/admin.js';
import { SPECIALTY_TAG_LABELS } from '../data/specialtyTags.js';
import { fullDateTime, timeUntil } from '../utils/time.js';

const EMPTY_FORM = { userId: null, name: '', email: '', institution: '', specialtyTags: [], orcidId: '' };

const TABS = [
  { id: 'editors', label: 'Editors' },
  { id: 'admins', label: 'Administrators' },
];

export default function AdminInvites() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'editors';
  const [counts, setCounts] = useState({ editors: null, admins: null });

  useEffect(() => {
    listEditorInvites().then(rows => setCounts(c => ({ ...c, editors: rows.filter(r => !r.expired).length }))).catch(() => {});
    listAdminInvites().then(rows => setCounts(c => ({ ...c, admins: rows.filter(r => !r.expired).length }))).catch(() => {});
  }, []);

  return (
    <AppShell role="admin">
      <style>{`
        .inv-tabs { display:flex; gap:4px; border-bottom:1px solid var(--ink-200); margin-bottom:22px; }
        .inv-tab { position:relative; display:inline-flex; align-items:center; gap:8px; padding:11px 16px; font-size:14px;
          font-weight:600; color:var(--ink-600); border-radius:var(--r-md) var(--r-md) 0 0; transition:color var(--t-fast); }
        .inv-tab:hover { color:var(--navy-900); }
        .inv-tab[aria-selected="true"] { color:var(--navy-900); }
        .inv-tab[aria-selected="true"]::after { content:""; position:absolute; left:10px; right:10px; bottom:-1px; height:2px;
          background:var(--amber-500); border-radius:2px; }
        .inv-tab:focus-visible { outline:2px solid var(--navy-500); outline-offset:2px; }
        .inv-tab-count { min-width:20px; height:20px; padding:0 6px; border-radius:99px; background:var(--ink-100); color:var(--ink-700);
          font-size:11px; font-weight:700; display:inline-flex; align-items:center; justify-content:center; }
        .inv-tab[aria-selected="true"] .inv-tab-count { background:var(--navy-900); color:var(--white); }

        .inv-layout { display:grid; grid-template-columns:minmax(0, 1.25fr) minmax(0, 1fr); gap:20px; align-items:start; }
        @media (max-width:1100px) { .inv-layout { grid-template-columns:1fr; } }
        .inv-side { display:flex; flex-direction:column; gap:20px; }
        .inv-card { padding:22px 24px; margin:0; }
        .inv-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:16px; }
        .inv-link { font-size:12.5px; font-weight:600; color:var(--navy-700); white-space:nowrap; }
        .inv-count { margin-left:8px; background:var(--amber-500); color:var(--navy-950); font-family:var(--font-body); font-size:11px;
          font-weight:700; padding:2px 7px; border-radius:99px; vertical-align:3px; }
        .inv-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 16px; }
        .inv-form-grid .field { margin-bottom:4px; }
        @media (max-width:720px) { .inv-form-grid { grid-template-columns:1fr; } }
        .inv-actions { display:flex; justify-content:flex-end; margin-top:18px; }
        .inv-error { margin-top:12px; font-size:13px; color:var(--red-800); background:var(--red-50); border-radius:var(--r-md); padding:9px 12px; }
        .inv-notice { margin-bottom:18px; padding:12px 16px; border-radius:var(--r-md); border:1px solid var(--ink-200);
          border-left:3px solid var(--teal-600); background:var(--white); font-size:13.5px; color:var(--navy-900); }
        .inv-empty { font-size:13px; color:var(--ink-500); padding:6px 0; margin:0; }
        .inv-rows { list-style:none; margin:0 -8px; padding:0; }
        .inv-row { display:flex; align-items:center; gap:12px; padding:10px 8px; border-radius:var(--r-md); }
        .inv-row + .inv-row { border-top:1px solid var(--ink-100); }
        .inv-row-main { flex:1; min-width:0; }
        .inv-row-title { font-size:13.5px; font-weight:600; color:var(--navy-900); line-height:1.4; }
        .inv-row-title .muted { font-weight:400; }
        .inv-row-meta { font-size:12px; color:var(--ink-500); margin-top:2px; }
        .inv-row-time { font-size:12px; color:var(--ink-500); white-space:nowrap; }
        .inv-row-actions { display:flex; gap:6px; }
        .inv-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; background:var(--navy-300); }
        .inv-dot.pending { background:var(--amber-500); }
        .inv-dot.expired { background:var(--red-500); }
        .inv-dot.accept, .inv-dot.grant { background:var(--teal-500); }
        .inv-chip { margin-left:6px; font-size:10.5px; font-weight:600; padding:1px 7px; border-radius:99px; background:#eef2ff; color:#3730a3; vertical-align:1px; }
        .inv-chip.tag { background:var(--ink-100); color:var(--ink-700); }
        .inv-danger { background:var(--red-700); color:var(--white); border:none; }

        .inv-lookup { position:relative; }
        .inv-lookup-menu { position:absolute; left:0; right:0; top:calc(100% + 4px); z-index:30; background:var(--white); border:1px solid var(--ink-200); border-radius:var(--r-md); box-shadow:var(--shadow-lg); max-height:240px; overflow-y:auto; }
        .inv-lookup-item { display:block; width:100%; text-align:left; padding:9px 14px; font-size:13px; border-bottom:1px solid var(--ink-100); }
        .inv-lookup-item:last-child { border-bottom:none; }
        .inv-lookup-item:hover { background:var(--ink-50); }
        .inv-lookup-item .name { font-weight:600; color:var(--navy-900); }
        .inv-lookup-item .email { color:var(--ink-600); margin-left:6px; }
        .inv-picked { display:flex; align-items:center; gap:8px; padding:9px 14px; border:1.5px solid var(--navy-900); border-radius:var(--r-md); background:var(--ink-50); font-size:13px; }
        .inv-picked button { margin-left:auto; }

        .adm-guard { display:flex; gap:14px; padding:16px 18px; margin-bottom:18px; border-radius:var(--r-lg);
          background:linear-gradient(135deg, var(--navy-950), var(--navy-800)); color:var(--white); }
        .adm-guard-icon { width:38px; height:38px; flex-shrink:0; border-radius:10px; background:rgba(239,159,39,0.16); color:var(--amber-500);
          display:flex; align-items:center; justify-content:center; }
        .adm-guard-title { font-size:14px; font-weight:600; }
        .adm-guard-list { list-style:none; margin:8px 0 0; padding:0; display:grid; grid-template-columns:1fr 1fr; gap:6px 20px;
          font-size:12.5px; color:var(--navy-200); line-height:1.5; }
        .adm-guard-list strong { color:var(--white); font-weight:600; }
        @media (max-width:900px) { .adm-guard-list { grid-template-columns:1fr; } }
        .inv-confirm { margin-top:16px; padding:14px; border-radius:var(--r-md); background:var(--ink-50); border:1px solid var(--ink-200); }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">User Management</span>
          <h1 className="page-title" style={{ marginTop: 8 }}><em className="serif-italic">Invitations</em>.</h1>
          <p className="page-subtitle">Bring editors and administrators onto the platform.</p>
        </div>
      </div>

      <div className="inv-tabs fade-up delay-1" role="tablist" aria-label="Invitation type">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className="inv-tab"
            onClick={() => setParams(t.id === 'editors' ? {} : { tab: t.id }, { replace: true })}
          >
            {t.label}
            {counts[t.id] > 0 && <span className="inv-tab-count" aria-label={`${counts[t.id]} pending`}>{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      <div className="fade-up delay-2" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'editors'
          ? <EditorInvitesPanel onCountChange={n => setCounts(c => ({ ...c, editors: n }))} />
          : <AdminInvitesPanel onCountChange={n => setCounts(c => ({ ...c, admins: n }))} />}
      </div>
    </AppShell>
  );
}

function EditorInvitesPanel({ onCountChange }) {
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [invites, setInvites] = useState(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { status, checking } = useEmailStatus(form.userId ? '' : form.email);
  const hint = form.userId ? null : describeEmail(status, 'editor');

  function refreshInvites() {
    listEditorInvites()
      .then(rows => { setInvites(rows); onCountChange?.(rows.filter(r => !r.expired).length); })
      .catch(() => setInvites([]));
  }

  useEffect(() => { refreshInvites(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ask the server for people matching what was typed, instead of downloading the
  // whole directory up front. A few extra rows cover anyone filtered out below.
  useEffect(() => {
    if (!debouncedQuery || form.userId) { setMatches([]); return undefined; }
    let cancelled = false;
    setSearching(true);
    listUsers({ search: debouncedQuery, pageSize: 12 })
      .then(res => {
        if (cancelled) return;
        // Editors already are one; admins cannot be given the role.
        setMatches(res.results
          .filter(u => !(u.roles || []).some(r => r === 'editor' || r === 'admin'))
          .slice(0, 6));
      })
      .catch(() => { if (!cancelled) setMatches([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery, form.userId]);

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
        setNotice(`Invitation sent to ${res.email}. They appear under Pending invites until they create their account.`);
        refreshInvites();
      } else if (res?.status === 'role_added') {
        setNotice(`${res.email} already had an account, so they are an editor now — no invite needed. See Recently added editors.`);
        setRefreshKey(k => k + 1);
      } else if (res?.status === 'already_editor') {
        setNotice(`${res.email} is already an editor.`);
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
      refreshInvites();
      setNotice('Invite cancelled. The link no longer works.');
    } catch (err) {
      setNotice(err?.message || 'Could not cancel the invite.');
    } finally {
      setCancelling(null);
    }
  }

  return (
    <>
      {notice && <div className="inv-notice" role="status">{notice}</div>}

      <div className="inv-layout">
        <form className="card inv-card" onSubmit={submit} noValidate>
          <div className="inv-card-head">
            <div>
              <div className="card-title">Invite an editor</div>
              <div className="card-meta">Existing accounts get editor access straight away; new people get a sign-up link.</div>
            </div>
          </div>

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
              {searching && !form.userId
                ? 'Searching…'
                : 'Pick an existing author or reviewer to prefill their profile, or leave this blank and enter someone new below.'}
            </div>
          </div>

          <div className="inv-form-grid">
            <div className="field">
              <label className="field-label">Full name</label>
              <input className="field-input" type="text" value={form.name} disabled={!!form.userId} placeholder="Nur Aisyah"
                     onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="field">
              <label className="field-label">Email address</label>
              <input className="field-input" type="email" value={form.email} disabled={!!form.userId} placeholder="name@university.edu.my"
                     onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <EmailHint hint={hint} checking={!form.userId && checking} />

          <div className="inv-form-grid" style={{ marginTop: 12 }}>
            <div className="field">
              <label className="field-label">Institution</label>
              <input className="field-input" type="text" value={form.institution} placeholder="Universiti Teknologi Malaysia"
                     onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} />
            </div>
            <div className="field">
              <label className="field-label">ORCID iD <span className="muted">(optional)</span></label>
              <input className="field-input" type="text" value={form.orcidId} placeholder="0000-0000-0000-0000"
                     onChange={e => setForm(f => ({ ...f, orcidId: e.target.value }))} />
            </div>
          </div>

          <div className="field" style={{ marginTop: 4 }}>
            <label className="field-label">Areas of expertise</label>
            <TagPicker value={form.specialtyTags} onChange={tags => setForm(f => ({ ...f, specialtyTags: tags }))} collapsible />
          </div>

          {error && <div className="inv-error" role="alert">{error}</div>}

          <div className="inv-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending || hint?.tone === 'block'}>
              {sending ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>

        <div className="inv-side">
          <div className="card inv-card">
            <div className="inv-card-head">
              <div>
                <div className="card-title">
                  Pending editor invites
                  {invites?.length > 0 && <span className="inv-count">{invites.length}</span>}
                </div>
                <div className="card-meta">New people who haven't created their account yet.</div>
              </div>
            </div>
            {invites === null ? <p className="inv-empty">Loading…</p>
              : invites.length === 0 ? <p className="inv-empty">No pending invites. People who already had an account appear under Recently added.</p>
              : (
                <ul className="inv-rows">
                  {invites.map(inv => (
                    <li key={inv.id} className="inv-row">
                      <span className={`inv-dot ${inv.expired ? 'expired' : 'pending'}`} aria-hidden="true" />
                      <div className="inv-row-main">
                        <div className="inv-row-title">
                          {inv.name || inv.email} {inv.name && <span className="muted">· {inv.email}</span>}
                        </div>
                        <div className="inv-row-meta" title={fullDateTime(inv.expires_at)}>
                          {inv.expired ? 'Link expired — send a new invite' : `Expires ${timeUntil(inv.expires_at)}`}
                          {inv.institution && ` · ${inv.institution}`}
                          {(inv.specialty_tags || []).slice(0, 2).map(slug => (
                            <span key={slug} className="inv-chip tag">{SPECIALTY_TAG_LABELS[slug] || slug}</span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--red-700)', borderColor: 'var(--red-200)' }}
                        disabled={cancelling === inv.id}
                        onClick={() => handleCancelInvite(inv.id)}
                      >
                        {cancelling === inv.id ? '…' : 'Cancel'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>
          <RecentlyAdded role="editor" refreshKey={refreshKey} title="Recently added editors" />
        </div>
      </div>
    </>
  );
}
