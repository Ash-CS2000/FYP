// src/components/invitations/AdminInvitesPanel.jsx
// The Administrators tab of the Invitations page. See inviteAdmin in
// api/admin.js for the safeguards the server enforces.

import { useEffect, useState } from 'react';
import { cancelAdminInvite, inviteAdmin, listAdminInvites } from '../../api/admin.js';
import { fullDateTime, timeUntil } from '../../utils/time.js';
import EmailHint, { describeEmail, useEmailStatus } from './EmailHint.jsx';
import RecentlyAdded from './RecentlyAdded.jsx';

const EMPTY = { name: '', email: '', password: '' };

const SAFEGUARDS = [
  ['You confirm with your password', 'So nobody at an unattended computer can add an admin.'],
  ['They must accept', 'Even with an existing account — no one becomes an admin without knowing.'],
  ['The link expires in 48 hours', 'And works only once.'],
  ['Every admin is told', 'When an admin is invited, and again when they join.'],
];

export default function AdminInvitesPanel({ onCountChange }) {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [invites, setInvites] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { status, checking } = useEmailStatus(form.email);
  const hint = describeEmail(status, 'admin');

  function refresh() {
    listAdminInvites()
      .then(rows => { setInvites(rows); onCountChange?.(rows.filter(r => !r.expired).length); })
      .catch(() => setInvites([]));
  }
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    setError(''); setNotice('');
    if (form.name.trim().length < 2) return setError("Enter the invitee's full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid email address.');
    if (!form.password) return setError('Enter your password to confirm.');
    setSending(true);
    try {
      const res = await inviteAdmin(form);
      setNotice(`Invitation sent to ${res.email}. It expires ${timeUntil(res.expires_at)}; every other administrator has been notified.`);
      setForm(EMPTY);
      refresh();
    } catch (err) {
      setError(err.status === 429 ? 'Too many attempts. Wait a while before trying again.' : err.message);
      setForm(f => ({ ...f, password: '' }));
    } finally {
      setSending(false);
    }
  }

  async function cancel(id) {
    setCancelling(id);
    try {
      await cancelAdminInvite(id);
      setNotice('Invitation cancelled. The link no longer works.');
      refresh();
      setRefreshKey(k => k + 1);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setCancelling(null); setConfirmCancel(null);
    }
  }

  return (
    <>
      <div className="adm-guard" role="note">
        <div className="adm-guard-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div>
          <div className="adm-guard-title">Administrators can manage every account, role and platform setting.</div>
          <ul className="adm-guard-list">
            {SAFEGUARDS.map(([t, d]) => <li key={t}><strong>{t}.</strong> {d}</li>)}
          </ul>
        </div>
      </div>

      {notice && <div className="inv-notice" role="status">{notice}</div>}

      <div className="inv-layout">
        <form className="card inv-card" onSubmit={submit} noValidate>
          <div className="inv-card-head">
            <div>
              <div className="card-title">Invite an administrator</div>
              <div className="card-meta">They receive a single-use link by email.</div>
            </div>
          </div>
          <div className="inv-form-grid">
            <div className="field">
              <label className="field-label" htmlFor="adm-name">Full name</label>
              <input id="adm-name" className="field-input" value={form.name} placeholder="Nur Aisyah"
                     onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="adm-email">Email address</label>
              <input id="adm-email" type="email" className="field-input" value={form.email} placeholder="name@university.edu.my"
                     onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <EmailHint hint={hint} checking={checking} />

          <div className="inv-confirm">
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor="adm-password">Your password</label>
              <input id="adm-password" type="password" className="field-input" autoComplete="current-password"
                     value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <div className="field-hint">Confirms it is really you sending this invitation.</div>
            </div>
          </div>

          {error && <div className="inv-error" role="alert">{error}</div>}
          <div className="inv-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending || hint?.tone === 'block'}>
              {sending ? 'Sending…' : 'Send administrator invite'}
            </button>
          </div>
        </form>

        <div className="inv-side">
          <div className="card inv-card">
            <div className="inv-card-head">
              <div>
                <div className="card-title">
                  Pending administrator invites
                  {invites?.length > 0 && <span className="inv-count">{invites.length}</span>}
                </div>
                <div className="card-meta">Invited, but not accepted yet.</div>
              </div>
            </div>
            {invites === null ? <p className="inv-empty">Loading…</p>
              : invites.length === 0 ? <p className="inv-empty">No pending administrator invites.</p>
              : (
                <ul className="inv-rows">
                  {invites.map(inv => (
                    <li key={inv.id} className="inv-row">
                      <span className={`inv-dot ${inv.expired ? 'expired' : 'pending'}`} aria-hidden="true" />
                      <div className="inv-row-main">
                        <div className="inv-row-title">
                          {inv.name} <span className="muted">· {inv.email}</span>
                          {inv.existing_account && <span className="inv-chip">Has an account</span>}
                        </div>
                        <div className="inv-row-meta" title={fullDateTime(inv.expires_at)}>
                          {inv.expired ? 'Link expired' : `Expires ${timeUntil(inv.expires_at)}`} · invited by {inv.invited_by_name || 'an administrator'}
                        </div>
                      </div>
                      {confirmCancel === inv.id ? (
                        <span className="inv-row-actions">
                          <button type="button" className="btn btn-sm inv-danger" disabled={cancelling === inv.id} onClick={() => cancel(inv.id)}>
                            {cancelling === inv.id ? '…' : 'Cancel invite'}
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmCancel(null)}>Keep</button>
                        </span>
                      ) : (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmCancel(inv.id)}>Cancel</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
          </div>
          <RecentlyAdded role="admin" refreshKey={refreshKey} title="Recently added administrators" />
        </div>
      </div>
    </>
  );
}
