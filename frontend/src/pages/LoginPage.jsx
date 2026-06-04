import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const API_URL = 'http://localhost:8000';

const ROLE_ROUTES = {
  student: '/user/papers',
  user:     '/user/papers',
  author:   '/author/dashboard',
  reviewer: '/reviewer/dashboard',
  editor:   '/editor/dashboard',
  admin:    '/admin/dashboard',
};

const EyeOpen = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const justRegistered = location.state?.registered;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/auth/login/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(
        data?.detail || data?.email?.[0] || data?.non_field_errors?.[0] || 'Invalid email or password.'
      );
      localStorage.setItem('access',  data.access);
      localStorage.setItem('refresh', data.refresh);
      localStorage.setItem('user',    JSON.stringify(data.user));
      navigate(ROLE_ROUTES[data.user?.role] || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        .auth-benefit { display:flex; align-items:center; gap:12px; padding:11px 14px; border:1px solid rgba(255,255,255,0.08); border-radius:var(--r-md); color:var(--navy-100); background:rgba(255,255,255,0.04); font-size:13.5px; }
        .auth-benefit-num { width:22px; height:22px; border-radius:50%; background:var(--amber-500); color:var(--navy-950); display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; flex-shrink:0; }
        .auth-form-side { padding:52px 56px; display:flex; flex-direction:column; justify-content:center; }
        .auth-form-wrap { max-width:400px; width:100%; margin:0 auto; }
        .auth-back { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--ink-600); margin-bottom:36px; transition:color var(--t-fast); }
        .auth-back:hover { color:var(--navy-900); }
        .auth-form-title { font-family:var(--font-display); font-size:36px; font-weight:500; color:var(--navy-900); letter-spacing:-0.02em; line-height:1.1; margin-bottom:8px; }
        .auth-form-title em { font-style:italic; color:var(--amber-700); font-weight:400; }
        .auth-form-sub { color:var(--ink-600); font-size:14px; margin-bottom:26px; }
        .pw-wrap { position:relative; }
        .pw-wrap .field-input { padding-right:44px; }
        .pw-toggle { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--ink-500); cursor:pointer; padding:4px; display:flex; line-height:0; }
        .pw-toggle:hover { color:var(--ink-800); }
        .auth-footer-row { display:flex; align-items:center; justify-content:space-between; margin:20px 0; font-size:13px; }
        .auth-checkbox { display:inline-flex; align-items:center; gap:8px; cursor:pointer; color:var(--ink-700); }
        .auth-anchor { color:var(--navy-700); font-weight:500; transition:color var(--t-fast); }
        .auth-anchor:hover { color:var(--navy-900); }
        .auth-submit { width:100%; padding:13px; font-size:14.5px; }
        .auth-submit:disabled { opacity:.6; cursor:not-allowed; transform:none !important; box-shadow:none !important; }
        .auth-switch { text-align:center; font-size:13.5px; color:var(--ink-600); margin-top:20px; }
        .auth-error   { background:var(--red-50); border:1px solid #f5c6c6; border-radius:var(--r-md); padding:11px 14px; margin-bottom:16px; font-size:13px; color:var(--red-700); }
        .auth-success { background:var(--teal-50); border:1px solid #a8dcc8; border-radius:var(--r-md); padding:11px 14px; margin-bottom:16px; font-size:13px; color:var(--teal-800); }
        @media(max-width:900px){ .auth-page{grid-template-columns:1fr;} .auth-brand{display:none;} .auth-form-side{padding:40px 24px;} }
      `}</style>

      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <Link to="/" className="auth-brand-logo">
            <span className="auth-brand-name">PaperBridge</span>
            <span className="auth-brand-tag">Research Portal</span>
          </Link>
          <div className="auth-copy">
            <h2 className="auth-copy-title">Welcome <em>back</em>.</h2>
            <p className="auth-copy-body">Sign in to access your workspace — manuscripts, reviews, or your editorial queue.</p>
            <ul className="auth-benefits">
              {[
                'Browse and discover published research.',
                'Track your submissions and revision status.',
                'Review assigned manuscripts on your schedule.',
              ].map((text, i) => (
                <li key={i} className="auth-benefit">
                  <span className="auth-benefit-num">{i + 1}</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-form-wrap">
          <Link to="/" className="auth-back">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to papers
          </Link>

          <h1 className="auth-form-title">Sign <em>in</em>.</h1>
          <p className="auth-form-sub">Use your email address and password to continue.</p>

          {justRegistered && (
            <div className="auth-success">Account created — sign in to get started.</div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="field-label">Email address</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Password</label>
              <div className="pw-wrap">
                <input
                  className="field-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div className="auth-footer-row">
              <label className="auth-checkbox">
                <input type="checkbox" defaultChecked />
                Remember me
              </label>
              <a href="#" className="auth-anchor">Forgot password?</a>
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/register" className="auth-anchor" style={{ fontWeight: 600 }}>Create one →</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
