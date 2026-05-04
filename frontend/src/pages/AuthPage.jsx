import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function AuthPage({ initialTab = 'signin' }) {
  const [tab, setTab] = useState(initialTab);
  const [role, setRole] = useState('author');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Send user to the dashboard for the chosen role
    if (tab === 'signin') {
      navigate('/author/dashboard'); // sign-in defaults to author
    } else {
      navigate(`/${role}/dashboard`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--white)' }}>
      <style>{`
        .auth-brand-side { background: var(--navy-950); color: var(--white); padding: 56px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        .auth-brand-side::before { content: ""; position: absolute; top: -100px; right: -100px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(239,159,39,0.10), transparent 70%); border-radius: 50%; }
        .auth-brand-side::after { content: ""; position: absolute; bottom: -150px; left: -100px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(55,138,221,0.08), transparent 70%); border-radius: 50%; }
        .auth-brand-inner { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; }
        .auth-brand-inner .brand-mark { color: var(--white); font-size: 28px; }
        .auth-brand-inner .brand-sub { color: var(--amber-500); font-size: 11px; letter-spacing: 0.14em; }
        .auth-quote { margin-top: auto; padding-top: 60px; }
        .auth-quote-mark { font-family: var(--font-display); font-size: 96px; line-height: 1; color: var(--amber-500); font-weight: 500; margin-bottom: -10px; opacity: 0.9; }
        .auth-quote-text { font-family: var(--font-display); font-style: italic; font-weight: 400; font-size: 24px; line-height: 1.4; letter-spacing: -0.01em; margin-bottom: 24px; }
        .auth-quote-author { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.06em; color: var(--navy-300); }
        .auth-quote-author strong { color: var(--white); font-weight: 500; }
        .auth-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; padding-top: 40px; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.1); }
        .auth-stat .num { font-family: var(--font-display); font-size: 32px; font-weight: 500; color: var(--amber-500); letter-spacing: -0.02em; }
        .auth-stat .lbl { font-size: 12px; color: var(--navy-200); margin-top: 4px; }
        .auth-form-side { padding: 56px; display: flex; flex-direction: column; justify-content: center; overflow-y: auto; }
        .auth-form-wrap { max-width: 440px; margin: 0 auto; width: 100%; }
        .auth-tabs { display: flex; gap: 4px; background: var(--ink-100); padding: 4px; border-radius: var(--r-md); margin-bottom: 36px; }
        .auth-tab { flex: 1; padding: 10px 16px; text-align: center; border-radius: 7px; font-size: 13.5px; font-weight: 500; color: var(--ink-700); cursor: pointer; transition: all var(--t-fast); border: none; background: transparent; font-family: inherit; }
        .auth-tab.active { background: var(--white); color: var(--navy-900); box-shadow: var(--shadow-sm); }
        .auth-form-title { font-family: var(--font-display); font-size: 32px; font-weight: 500; color: var(--navy-900); letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 8px; }
        .auth-form-title em { font-style: italic; color: var(--amber-700); font-weight: 400; }
        .auth-form-subtitle { color: var(--ink-600); font-size: 14.5px; margin-bottom: 32px; }
        .role-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 18px; }
        .role-card { padding: 14px 10px; border: 1px solid var(--ink-200); border-radius: var(--r-md); text-align: center; cursor: pointer; transition: all var(--t-fast); background: var(--white); }
        .role-card:hover { border-color: var(--navy-700); }
        .role-card.active { border-color: var(--navy-900); background: var(--navy-100); }
        .role-card .role-icon { width: 28px; height: 28px; margin: 0 auto 8px; color: var(--navy-700); }
        .role-card.active .role-icon { color: var(--navy-900); }
        .role-card .role-name { font-size: 12.5px; font-weight: 600; color: var(--navy-900); }
        .auth-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; font-size: 13px; }
        .checkbox { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; color: var(--ink-700); }
        .auth-submit { width: 100%; padding: 13px; font-size: 14.5px; }
        .auth-divider { display: flex; align-items: center; gap: 14px; margin: 26px 0; font-size: 12px; color: var(--ink-500); }
        .auth-divider::before, .auth-divider::after { content: ""; flex: 1; height: 1px; background: var(--ink-200); }
        .sso-btn { width: 100%; padding: 11px; border: 1px solid var(--ink-300); border-radius: var(--r-md); background: var(--white); color: var(--ink-800); font-weight: 500; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; cursor: pointer; transition: all var(--t-fast); }
        .sso-btn:hover { border-color: var(--ink-500); background: var(--ink-50); }
        .auth-back { position: absolute; top: 32px; left: 32px; color: var(--ink-600); font-size: 13.5px; display: flex; align-items: center; gap: 6px; z-index: 10; }
        .auth-back:hover { color: var(--navy-900); }
        @media (max-width: 900px) { body { grid-template-columns: 1fr; } .auth-brand-side { display: none !important; } }
      `}</style>

      <Link to="/" className="auth-back">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to home
      </Link>

      <div className="auth-brand-side">
        <div className="auth-brand-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">JSRMS</span>
            <span className="brand-sub">Research Portal</span>
          </Link>
          <div className="auth-quote">
            <div className="auth-quote-mark">"</div>
            <p className="auth-quote-text">JSRMS turned a process that used to take months of email chasing into something I can actually track. My last paper went from submission to publication in eleven weeks.</p>
            <p className="auth-quote-author"><strong>Dr. Aisha Rahman</strong> · Associate Professor, Computer Science · Universiti Malaya</p>
            <div className="auth-stats">
              <div className="auth-stat"><div className="num">500+</div><div className="lbl">Papers Published</div></div>
              <div className="auth-stat"><div className="num">300+</div><div className="lbl">Active Reviewers</div></div>
              <div className="auth-stat"><div className="num">14d</div><div className="lbl">Avg. Review</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'signin' ? 'active' : ''}`} onClick={() => setTab('signin')}>Sign In</button>
            <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Create Account</button>
          </div>

          {tab === 'signin' && (
            <form onSubmit={handleSubmit}>
              <h1 className="auth-form-title">Welcome <em>back</em>.</h1>
              <p className="auth-form-subtitle">Sign in to continue your research journey.</p>

              <button type="button" className="sso-btn">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.12z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                Continue with Google
              </button>

              <div className="auth-divider">or with email</div>

              <div className="field">
                <label className="field-label">Email address</label>
                <input className="field-input" type="email" placeholder="you@university.edu" defaultValue="ahmad@utm.edu.my" />
              </div>
              <div className="field">
                <label className="field-label">Password</label>
                <input className="field-input" type="password" placeholder="Enter your password" defaultValue="••••••••" />
              </div>

              <div className="auth-row">
                <label className="checkbox"><input type="checkbox" defaultChecked /> Remember me</label>
                <a href="#" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Forgot password?</a>
              </div>

              <button type="submit" className="btn btn-primary auth-submit">Sign In →</button>
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-500)', marginTop: 16 }}>
                Demo: this signs you in as an Author. Use the sidebar links once inside.
              </p>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSubmit}>
              <h1 className="auth-form-title">Join the <em>community</em>.</h1>
              <p className="auth-form-subtitle">Create your account to submit, review, or publish.</p>

              <label className="field-label" style={{ marginBottom: 10 }}>I am joining as</label>
              <div className="role-grid">
                {[
                  { id: 'author', name: 'Author', icon: <svg className="role-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg> },
                  { id: 'reviewer', name: 'Reviewer', icon: <svg className="role-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> },
                  { id: 'editor', name: 'Editor', icon: <svg className="role-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 113 3L12 15l-4 1 1-4z"/></svg> },
                ].map((r) => (
                  <div key={r.id} className={`role-card ${role === r.id ? 'active' : ''}`} onClick={() => setRole(r.id)}>
                    {r.icon}
                    <div className="role-name">{r.name}</div>
                  </div>
                ))}
              </div>

              <div className="field">
                <label className="field-label">Full name</label>
                <input className="field-input" type="text" placeholder="Dr. Ahmad Razif" />
              </div>
              <div className="field-grid">
                <div className="field">
                  <label className="field-label">Email address</label>
                  <input className="field-input" type="email" placeholder="ahmad@utm.edu.my" />
                </div>
                <div className="field">
                  <label className="field-label">Institution</label>
                  <input className="field-input" type="text" placeholder="UTM" />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Password</label>
                <input className="field-input" type="password" placeholder="Choose a strong password" />
                <div className="field-hint">Use at least 8 characters with a mix of letters and numbers.</div>
              </div>

              <div className="auth-row">
                <label className="checkbox"><input type="checkbox" defaultChecked /> I agree to the <a href="#" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Terms</a> and <a href="#" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Privacy Policy</a></label>
              </div>

              <button type="submit" className="btn btn-accent auth-submit">Create Account →</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
