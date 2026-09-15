// src/pages/AdminInviteAccept.jsx
// Opened from an administrator invitation email. The invitee proves who they
// are — their existing password, or a new one for a new account — and becomes
// an administrator. See acceptAdminInvite in api/admin.js.

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { acceptAdminInvite, getAdminInvite } from '../api/admin.js';
import { saveTokens } from '../api/auth';
import { useCurrentUser } from '../auth/CurrentUserContext.jsx';
import { fullDateTime, timeUntil } from '../utils/time.js';

export default function AdminInviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setUser } = useCurrentUser();

  const [state, setState] = useState('loading'); // loading | ready | invalid
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAdminInvite(token)
      .then(data => { if (!cancelled) { setInvite(data); setState('ready'); } })
      .catch(err => { if (!cancelled) { setError(err.message); setState('invalid'); } });
    return () => { cancelled = true; };
  }, [token]);

  const existing = invite?.existing_account;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!existing) {
      if (password.length < 8) return setError('Your password must be at least 8 characters.');
      if (password !== confirm) return setError('The two passwords do not match.');
    } else if (!password) {
      return setError('Enter the password you use to sign in to PaperBridge.');
    }
    setSubmitting(true);
    try {
      const data = await acceptAdminInvite(token, password);
      saveTokens(data.access, data.refresh);
      setUser(data.user);
      navigate('/admin/dashboard');
    } catch (err) {
      if (err.status === 404) { setState('invalid'); setError(err.message); return; }
      setError(err.status === 429 ? 'Too many attempts. Please wait a while and try again.' : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="aia-page">
      <style>{`
        .aia-page { min-height:100vh; display:grid; grid-template-columns:minmax(380px, 0.85fr) 1.15fr; background:var(--white); }
        .aia-brand { position:relative; overflow:hidden; background:var(--navy-950); color:var(--white); padding:52px 56px; display:flex; flex-direction:column; }
        .aia-brand::before { content:""; position:absolute; inset:-160px -200px auto auto; width:540px; height:540px; border-radius:50%;
          background:radial-gradient(circle, rgba(239,159,39,0.14), transparent 70%); }
        .aia-brand > * { position:relative; }
        .aia-logo { display:flex; align-items:baseline; gap:8px; }
        .aia-logo-name { font-family:var(--font-display); font-size:22px; font-weight:600; color:var(--white); }
        .aia-logo-tag { font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:var(--amber-500); }
        .aia-copy { margin-top:auto; max-width:460px; }
        .aia-copy h2 { font-family:var(--font-display); font-size:40px; font-weight:500; line-height:1.08; letter-spacing:-0.02em; margin:0 0 14px; }
        .aia-copy h2 em { color:var(--amber-500); font-weight:400; }
        .aia-copy p { color:var(--navy-200); font-size:15px; line-height:1.7; margin:0; }
        .aia-points { list-style:none; margin:28px 0 0; padding:0; display:grid; gap:10px; }
        .aia-points li { display:flex; gap:12px; padding:12px 14px; border:1px solid rgba(255,255,255,0.08); border-radius:var(--r-md);
          background:rgba(255,255,255,0.04); font-size:13.5px; line-height:1.5; color:var(--navy-100); }
        .aia-points svg { flex-shrink:0; margin-top:1px; color:var(--amber-500); }
        .aia-main { display:flex; align-items:center; justify-content:center; padding:52px 56px; }
        .aia-wrap { width:100%; max-width:420px; }
        .aia-eyebrow { font-family:var(--font-mono); font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ink-500); }
        .aia-title { font-family:var(--font-display); font-size:34px; font-weight:500; letter-spacing:-0.02em; line-height:1.1;
          color:var(--navy-900); margin:8px 0 10px; }
        .aia-title em { color:var(--amber-700); font-weight:400; }
        .aia-sub { font-size:14px; color:var(--ink-600); line-height:1.6; margin:0 0 20px; }
        .aia-invite { display:grid; grid-template-columns:auto 1fr; gap:6px 14px; padding:14px 16px; margin-bottom:22px;
          border:1px solid var(--ink-200); border-radius:var(--r-md); background:var(--ink-50); font-size:13px; }
        .aia-invite dt { color:var(--ink-500); }
        .aia-invite dd { margin:0; color:var(--navy-900); font-weight:500; overflow-wrap:anywhere; }
        .aia-pw { position:relative; }
        .aia-pw .field-input { padding-right:56px; }
        .aia-toggle { position:absolute; right:10px; top:50%; transform:translateY(-50%); font-size:12px; font-weight:600; color:var(--navy-700); padding:4px; }
        .aia-submit { width:100%; padding:13px; font-size:14.5px; margin-top:6px; }
        .aia-error { margin-bottom:16px; padding:11px 14px; border-radius:var(--r-md); border:1px solid var(--red-200); background:var(--red-50); color:var(--red-800); font-size:13px; }
        .aia-foot { margin-top:20px; font-size:13px; color:var(--ink-600); text-align:center; }
        .aia-foot a { color:var(--navy-700); font-weight:600; }
        @media (max-width:900px) { .aia-page { grid-template-columns:1fr; } .aia-brand { display:none; } .aia-main { padding:40px 22px; } }
      `}</style>

      <aside className="aia-brand">
        <Link to="/" className="aia-logo">
          <span className="aia-logo-name">PaperBridge</span>
          <span className="aia-logo-tag">Administration</span>
        </Link>
        <div className="aia-copy">
          <h2>Administrator <em>invitation</em>.</h2>
          <p>Administrators keep the platform running — they don't judge papers, they make sure the people and systems that do can work.</p>
          <ul className="aia-points">
            <li>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M16 11l2 2 4-4" /></svg>
              Manage accounts, roles, reviewer applications and invitations.
            </li>
            <li>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              Watch platform health and the editorial pipeline.
            </li>
            <li>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
              Every administrator action is recorded in a permanent audit log.
            </li>
          </ul>
        </div>
      </aside>

      <main className="aia-main">
        <div className="aia-wrap">
          {state === 'loading' && <p className="aia-sub">Checking your invitation…</p>}

          {state === 'invalid' && (
            <>
              <div className="aia-eyebrow">Invitation</div>
              <h1 className="aia-title">This link <em>doesn't work</em>.</h1>
              <div className="aia-error" role="alert">{error}</div>
              <p className="aia-sub">Invitation links work once and expire after 48 hours. Ask the administrator who invited you to send a new one.</p>
              <p className="aia-foot"><Link to="/login">Go to sign in</Link></p>
            </>
          )}

          {state === 'ready' && (
            <>
              <div className="aia-eyebrow">You've been invited</div>
              <h1 className="aia-title">{existing ? <>Confirm it's <em>you</em>.</> : <>Create your <em>account</em>.</>}</h1>
              <p className="aia-sub">
                {existing
                  ? 'This address already has a PaperBridge account. Enter its password to accept — your existing roles stay as they are.'
                  : 'Choose a password to create your administrator account.'}
              </p>

              <dl className="aia-invite">
                <dt>For</dt><dd>{invite.name ? `${invite.name} · ${invite.email}` : invite.email}</dd>
                <dt>Invited by</dt><dd>{invite.invited_by_name || 'An administrator'}</dd>
                <dt>Expires</dt><dd title={fullDateTime(invite.expires_at)}>{timeUntil(invite.expires_at)}</dd>
              </dl>

              {error && <div className="aia-error" role="alert">{error}</div>}

              <form onSubmit={submit} noValidate>
                <div className="field">
                  <label className="field-label" htmlFor="aia-password">{existing ? 'Your current password' : 'New password'}</label>
                  <div className="aia-pw">
                    <input id="aia-password" className="field-input" type={show ? 'text' : 'password'} value={password}
                           autoComplete={existing ? 'current-password' : 'new-password'} onChange={e => setPassword(e.target.value)} />
                    <button type="button" className="aia-toggle" onClick={() => setShow(v => !v)}>{show ? 'Hide' : 'Show'}</button>
                  </div>
                  {!existing && <div className="field-hint">At least 8 characters, not a common or all-number password.</div>}
                </div>
                {!existing && (
                  <div className="field">
                    <label className="field-label" htmlFor="aia-confirm">Confirm password</label>
                    <input id="aia-confirm" className="field-input" type={show ? 'text' : 'password'} value={confirm}
                           autoComplete="new-password" onChange={e => setConfirm(e.target.value)} />
                  </div>
                )}
                <button type="submit" className="btn btn-primary aia-submit" disabled={submitting}>
                  {submitting ? 'Accepting…' : 'Accept and become an administrator →'}
                </button>
              </form>
              <p className="aia-foot">Not expecting this? Close this page — nothing happens unless you accept.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
