import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { findDemoAccount, ROLE_HOME, saveDemoSession } from '../data/demoAccounts.js';
import { API_URL } from '../config';


export default function AuthPage({ initialTab = 'signin' }) {
  const [tab, setTab] = useState(initialTab);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institution, setInstitution] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ── Role → dashboard route ──────────────────────────────────────────
  const ROLE_HOME = {
    author:   '/author/training',
    reviewer: '/reviewer/dashboard',
    editor:   '/editor/dashboard',
    admin:    '/admin/dashboard',
  };

  // ── Handlers ────────────────────────────────────────────────────────
  async function handleSignIn() {
    const res = await fetch(`${API_URL}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Show error from backend
      const msg =
        data?.detail ||
        data?.email?.[0] ||
        data?.non_field_errors?.[0] ||
        'Invalid email or password.';
      throw new Error(msg);
    }

    // Save tokens
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Redirect to role dashboard
    const role = data.user.role;
    navigate(ROLE_HOME[role] || '/dashboard');
  }

  async function handleSignUp() {
    const res = await fetch(`${API_URL}/api/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
        role: 'student',       // default role on signup
        institution,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg =
        data?.email?.[0] ||
        data?.password?.[0] ||
        data?.full_name?.[0] ||
        data?.non_field_errors?.[0] ||
        'Registration failed. Please try again.';
      throw new Error(msg);
    }

    // Save tokens (auto login after register)
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));

    navigate(ROLE_HOME[data.user.role] || '/dashboard');
  }

  async function handleSubmit(e) {
    e.preventDefault();

  try {
    if (tab === 'signin') {
      await handleSignIn();
    } else {
      await handleSignUp();
    }
  } catch (err) {
    setError(err.message);
  }
}
   

  return (
    <div className="auth-page">
      <style>{`
        .auth-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(420px, 0.95fr) 1.05fr;
          background: var(--white);
        }
        .auth-brand-side {
          background: var(--navy-950);
          color: var(--white);
          padding: 56px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .auth-brand-side::before {
          content: "";
          position: absolute;
          inset: -140px -180px auto auto;
          width: 520px;
          height: 520px;
          background: radial-gradient(circle, rgba(239,159,39,0.12), transparent 70%);
          border-radius: 50%;
        }
        .auth-brand-inner { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; }
        .auth-brand-inner .brand-mark { color: var(--white); font-size: 28px; }
        .auth-brand-inner .brand-sub { color: var(--amber-500); font-size: 11px; letter-spacing: 0.14em; }
        .auth-copy { margin-top: auto; max-width: 520px; }
        .auth-copy h1 {
          font-family: var(--font-display);
          font-size: 44px;
          font-weight: 500;
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin-bottom: 18px;
        }
        .auth-copy h1 em { color: var(--amber-500); font-style: italic; font-weight: 400; }
        .auth-copy p { color: var(--navy-200); font-size: 15.5px; line-height: 1.7; }
        .auth-benefits { display: grid; gap: 12px; margin-top: 32px; }
        .auth-benefit {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: var(--r-md);
          color: var(--navy-100);
          background: rgba(255,255,255,0.04);
          font-size: 13.5px;
        }
        .auth-benefit span {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--amber-500);
          color: var(--navy-950);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 11px;
          flex-shrink: 0;
        }
        .auth-form-side {
          padding: 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .auth-form-wrap { max-width: 460px; width: 100%; margin: 0 auto; }
        .auth-back { position: absolute; top: 32px; left: 32px; color: var(--ink-600); font-size: 13.5px; display: flex; align-items: center; gap: 6px; z-index: 10; }
        .auth-tabs { display: flex; gap: 4px; background: var(--ink-100); padding: 4px; border-radius: var(--r-md); margin-bottom: 34px; }
        .auth-tab { flex: 1; padding: 10px 16px; text-align: center; border-radius: 7px; font-size: 13.5px; font-weight: 600; color: var(--ink-700); transition: all var(--t-fast); }
        .auth-tab.active { background: var(--white); color: var(--navy-900); box-shadow: var(--shadow-sm); }
        .auth-form-title { font-family: var(--font-display); font-size: 34px; font-weight: 500; color: var(--navy-900); letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 8px; }
        .auth-form-title em { font-style: italic; color: var(--amber-700); font-weight: 400; }
        .auth-form-subtitle { color: var(--ink-600); font-size: 14.5px; margin-bottom: 28px; }
        .auth-submit { width: 100%; padding: 13px; font-size: 14.5px; }
        .credential-box { background: var(--ink-50); border: 1px solid var(--ink-200); border-radius: var(--r-md); padding: 14px 16px; margin-bottom: 18px; font-size: 13px; color: var(--ink-700); }
        .credential-box code { font-family: var(--font-mono); font-size: 12px; color: var(--navy-900); }
        .auth-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; font-size: 13px; }
        .checkbox { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; color: var(--ink-700); }
        @media (max-width: 900px) {
          .auth-page { grid-template-columns: 1fr; }
          .auth-brand-side { display: none; }
          .auth-form-side { padding: 40px 24px; }
        }
      `}</style>

      <Link to="/" className="auth-back">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to papers
      </Link>

      <aside className="auth-brand-side">
        <div className="auth-brand-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">PaperBridge</span>
            <span className="brand-sub">Research Portal</span>
          </Link>
          <div className="auth-copy">
            <h1>One account for papers and <em>training</em>.</h1>
            <p>Create a normal user account to browse research, view abstracts, download or buy papers, and learn citation, publishing, and reviewer skills.</p>
            <div className="auth-benefits">
              <div className="auth-benefit"><span>1</span> Search and discover published papers.</div>
              <div className="auth-benefit"><span>2</span> Access training modules from the same account.</div>
              <div className="auth-benefit"><span>3</span> Request author or reviewer access later.</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'signin' ? 'active' : ''}`} type="button" onClick={() => setTab('signin')}>Sign In</button>
            <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} type="button" onClick={() => setTab('signup')}>Create Account</button>
          </div>

          <form onSubmit={handleSubmit}>
            <h1 className="auth-form-title">
              {tab === 'signin' ? <>Welcome <em>back</em>.</> : <>Create your <em>account</em>.</>}
            </h1>
            <p className="auth-form-subtitle">
              {tab === 'signin' ? 'Sign in as a normal user to continue.' : 'Anyone can create a normal user account.'}
            </p>

            {tab === 'signin' && (
              <div className="credential-box">
                <div className="label" style={{ marginBottom: 8 }}>Demo User Credential</div>
                <div>Email: <code>user@utm.edu.my</code></div>
                <div>Password: <code>User@123</code></div>
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--navy-700)', fontWeight: 600 }}>Role demo credentials</summary>
                  <div style={{ marginTop: 8, lineHeight: 1.7 }}>
                    <div><code>author@utm.edu.my</code> / <code>Author@123</code></div>
                    <div><code>reviewer@um.edu.my</code> / <code>Reviewer@123</code></div>
                    <div><code>editor@usm.my</code> / <code>Editor@123</code></div>
                    <div><code>admin@paperbridge.edu.my</code> / <code>Admin@123</code></div>
                  </div>
                </details>
              </div>
            )}

            {tab === 'signup' && (
              <div className="field">
                <label className="field-label">Full name</label>
                <input className="field-input" type="text"placeholder="Nur Aisyah" value={fullName} onChange={(e) => setFullName(e.target.value)}/>
              </div>
            )}

            <div className="field">
              <label className="field-label">Email address</label>
              <input className="field-input" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            {tab === 'signup' && (
              <div className="field">
                <label className="field-label">Institution</label>
                <input className="field-input" type="text" placeholder="Universiti Teknologi Malaysia" value={institution} onChange={(e) => setInstitution(e.target.value)}/>
              </div>
            )}

            <div className="field">
              <label className="field-label">Password</label>
              <input className="field-input" type={tab === 'signin' ? 'text' : 'password'} placeholder="Choose a strong password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {tab === 'signup' && <div className="field-hint">Use at least 8 characters with letters and numbers.</div>}
            </div>

            {error && <div className="field-hint" style={{ color: 'var(--red-700)', marginBottom: 14 }}>{error}</div>}

            <div className="auth-row">
              <label className="checkbox"><input type="checkbox" defaultChecked /> {tab === 'signin' ? 'Remember me' : 'I agree to the Terms and Privacy Policy'}</label>
              {tab === 'signin' && <a href="#" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Forgot password?</a>}
            </div>

            <button type="submit" className={`btn ${tab === 'signin' ? 'btn-primary' : 'btn-accent'} auth-submit`}>
              {tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
