import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { API_URL } from '../config';
import { saveTokens } from '../api/auth';
import { useCurrentUser } from '../auth/CurrentUserContext.jsx';

// Editor activation page. Opened from the invite link an admin sends
// (POST /api/users/editors/). The invitee sets a password; on success we get
// { access, refresh, user } back and drop them straight into the editor
// workspace.
export default function EditorInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setUser } = useCurrentUser();

  const [state, setState] = useState('loading'); // loading | ready | invalid
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/editor-invite/${token}/`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState('invalid');
          setError(data.detail || 'This invitation link is invalid or has expired.');
          return;
        }
        setInvite(data);
        setState('ready');
      } catch {
        if (!cancelled) {
          setState('invalid');
          setError('Could not reach the server. Please try again.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/users/editor-invite/${token}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || 'Could not activate your account. The link may have expired.');
        return;
      }
      if (data.status === 'existing_account') {
        navigate('/login', { state: { registered: true } });
        return;
      }
      saveTokens(data.access, data.refresh);
      setUser(data.user);
      navigate('/editor/dashboard');
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <style>{`
        .auth-page { min-height:100vh; display:grid; grid-template-columns:minmax(400px,0.9fr) 1.1fr; background:var(--white); }
        .auth-brand { background:var(--navy-950); color:var(--white); padding:52px 56px; display:flex; flex-direction:column; position:relative; overflow:hidden; }
        .auth-brand::before { content:""; position:absolute; inset:-140px -180px auto auto; width:520px; height:520px; background:radial-gradient(circle,rgba(239,159,39,0.12),transparent 70%); border-radius:50%; }
        .auth-brand-inner { position:relative; z-index:1; flex:1; display:flex; flex-direction:column; }
        .auth-brand-logo { display:flex; align-items:baseline; gap:8px; margin-bottom:auto; }
        .auth-brand-name { font-family:var(--font-display); font-weight:600; font-size:22px; color:var(--white); }
        .auth-brand-tag  { font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--amber-500); }
        .auth-copy { margin-top:auto; max-width:480px; }
        .auth-copy-title { font-family:var(--font-display); font-size:42px; font-weight:500; line-height:1.08; letter-spacing:-0.02em; margin-bottom:14px; }
        .auth-copy-title em { color:var(--amber-500); font-style:italic; font-weight:400; }
        .auth-copy-body  { color:var(--navy-200); font-size:15px; line-height:1.7; }
        .auth-benefits { list-style:none; display:grid; gap:10px; margin-top:28px; }
        .auth-benefit { display:flex; align-items:flex-start; gap:12px; padding:12px 14px; border:1px solid rgba(255,255,255,0.08); border-radius:var(--r-md); color:var(--navy-100); background:rgba(255,255,255,0.04); font-size:13.5px; line-height:1.5; }
        .auth-benefit svg { flex-shrink:0; margin-top:1px; color:var(--amber-500); }
        .auth-figure { margin-top:34px; border:1px solid rgba(255,255,255,0.08); border-radius:var(--r-lg); overflow:hidden; background:rgba(255,255,255,0.03); }
        .auth-figure svg { display:block; width:100%; height:auto; }
        .auth-form-side { padding:52px 56px; display:flex; flex-direction:column; justify-content:center; }
        .auth-form-wrap { max-width:400px; width:100%; margin:0 auto; }
        .auth-form-title { font-family:var(--font-display); font-size:36px; font-weight:500; color:var(--navy-900); letter-spacing:-0.02em; line-height:1.1; margin-bottom:8px; }
        .auth-form-title em { font-style:italic; color:var(--amber-700); font-weight:400; }
        .auth-form-sub { color:var(--ink-600); font-size:14px; margin-bottom:26px; }
        .pw-wrap { position:relative; }
        .pw-wrap .field-input { padding-right:44px; }
        .pw-toggle { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--ink-500); cursor:pointer; padding:4px; font-size:12px; }
        .auth-submit { width:100%; padding:13px; font-size:14.5px; margin-top:4px; }
        .auth-submit:disabled { opacity:.6; cursor:not-allowed; }
        .auth-error   { background:var(--red-50); border:1px solid #f5c6c6; border-radius:var(--r-md); padding:11px 14px; margin-bottom:16px; font-size:13px; color:var(--red-700); }
        .auth-switch { text-align:center; font-size:13.5px; color:var(--ink-600); margin-top:20px; }
        @media(max-width:900px){ .auth-page{grid-template-columns:1fr;} .auth-brand{display:none;} .auth-form-side{padding:40px 24px;} }
      `}</style>

      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <Link to="/" className="auth-brand-logo">
            <span className="auth-brand-name">PaperBridge</span>
            <span className="auth-brand-tag">Research Portal</span>
          </Link>
          <div className="auth-copy">
            <h2 className="auth-copy-title">Editor <em>onboarding</em>.</h2>
            <p className="auth-copy-body">Set a password to activate your editor account. Once you&apos;re in, the editorial desk is yours.</p>

            <ul className="auth-benefits">
              <li className="auth-benefit">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
                Manage the submission queue and triage new manuscripts.
              </li>
              <li className="auth-benefit">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 3.5a2.1 2.1 0 0 1 3 3L8 17.5l-4 1 1-4Z" /></svg>
                Assign reviewers and record editorial decisions.
              </li>
              <li className="auth-benefit">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6Z" /><path d="m9 12 2 2 4-4" /></svg>
                A complete audit trail behind every action you take.
              </li>
            </ul>

            <div className="auth-figure" aria-hidden="true">
              <svg viewBox="0 0 480 210" xmlns="http://www.w3.org/2000/svg">
                <rect width="480" height="210" fill="#0d1b33" />
                <rect x="24" y="24" width="300" height="14" rx="4" fill="#263b5e" />
                <rect x="24" y="48" width="180" height="10" rx="4" fill="#1c2c49" />
                <rect x="24" y="86" width="432" height="1" fill="#22375c" />
                <rect x="24" y="102" width="120" height="10" rx="4" fill="#1c2c49" />
                <rect x="24" y="122" width="432" height="34" rx="6" fill="#12233f" stroke="#22375c" />
                <circle cx="44" cy="139" r="7" fill="#ef9f27" />
                <rect x="60" y="132" width="150" height="8" rx="4" fill="#2b406a" />
                <rect x="60" y="144" width="90" height="6" rx="3" fill="#1c2c49" />
                <rect x="392" y="130" width="52" height="18" rx="9" fill="#173a2b" stroke="#2f6d4f" />
                <rect x="24" y="168" width="432" height="34" rx="6" fill="#12233f" stroke="#22375c" />
                <circle cx="44" cy="185" r="7" fill="#5b8def" />
                <rect x="60" y="178" width="170" height="8" rx="4" fill="#2b406a" />
                <rect x="60" y="190" width="70" height="6" rx="3" fill="#1c2c49" />
                <rect x="386" y="176" width="58" height="18" rx="9" fill="#3a2f14" stroke="#7a5f1f" />
              </svg>
            </div>
          </div>
        </div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-form-wrap">
          {state === 'loading' && <p className="auth-form-sub">Checking your invitation…</p>}

          {state === 'invalid' && (
            <>
              <h1 className="auth-form-title">Link <em>expired</em>.</h1>
              <div className="auth-error">{error}</div>
              <p className="auth-switch">
                Ask your administrator to send a new invite, or{' '}
                <Link to="/login" className="auth-anchor" style={{ fontWeight: 600 }}>sign in</Link>.
              </p>
            </>
          )}

          {state === 'ready' && (
            <>
              <h1 className="auth-form-title">Set your <em>password</em>.</h1>
              <p className="auth-form-sub">
                Activating the editor account for{' '}
                {invite?.name ? <><strong>{invite.name}</strong> ({invite.email})</> : <strong>{invite?.email}</strong>}.
              </p>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label className="field-label">New password</label>
                  <div className="pw-wrap">
                    <input
                      className="field-input"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                      {showPw ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Confirm password</label>
                  <input
                    className="field-input"
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
                  {submitting ? 'Activating…' : 'Activate account →'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
