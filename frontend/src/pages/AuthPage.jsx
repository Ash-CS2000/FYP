import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const LOGIN_ROLES = [
  { id: 'student', name: 'Student', email: 'student@utm.edu.my', password: 'Student@123', path: '/student/training' },
  { id: 'author', name: 'Author', email: 'author@utm.edu.my', password: 'Author@123', path: '/author/dashboard' },
  { id: 'reviewer', name: 'Reviewer', email: 'reviewer@um.edu.my', password: 'Reviewer@123', path: '/reviewer/dashboard' },
  { id: 'editor', name: 'Editor', email: 'editor@usm.my', password: 'Editor@123', path: '/editor/dashboard' },
  { id: 'admin', name: 'Admin', email: 'admin@jsrms.edu.my', password: 'Admin@123', path: '/admin/dashboard' },
];

const SIGNUP_ROLES = [
  { id: 'student', name: 'Student', desc: 'Learn citation, publishing, and reviewing basics.' },
  { id: 'author', name: 'Author', desc: 'Submit and manage research manuscripts.' },
  { id: 'reviewer', name: 'Reviewer', desc: 'Apply to review papers after admin approval.' },
];

const ROLE_ICONS = {
  student: <svg className="role-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  author: <svg className="role-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  reviewer: <svg className="role-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  editor: <svg className="role-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 113 3L12 15l-4 1 1-4z"/></svg>,
  admin: <svg className="role-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15 1.65 1.65 0 003.09 14H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 008 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09A1.65 1.65 0 0014 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.32.47.58.94.72.16.05.34.08.56.08H21a2 2 0 010 4h-.09A1.65 1.65 0 0019.4 15z"/></svg>,
};

export default function AuthPage({ initialTab = 'signin' }) {
  const [tab, setTab] = useState(initialTab);
  const [loginRole, setLoginRole] = useState('student');
  const [signupRole, setSignupRole] = useState('student');
  const navigate = useNavigate();

  const activeLogin = LOGIN_ROLES.find((item) => item.id === loginRole);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (tab === 'signin') {
      navigate(activeLogin.path);
      return;
    }

    if (signupRole === 'reviewer') {
      navigate('/login');
      return;
    }

    navigate(signupRole === 'student' ? '/student/training' : '/author/dashboard');
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
        .auth-form-wrap { max-width: 520px; margin: 0 auto; width: 100%; }
        .auth-tabs { display: flex; gap: 4px; background: var(--ink-100); padding: 4px; border-radius: var(--r-md); margin-bottom: 36px; }
        .auth-tab { flex: 1; padding: 10px 16px; text-align: center; border-radius: 7px; font-size: 13.5px; font-weight: 500; color: var(--ink-700); cursor: pointer; transition: all var(--t-fast); border: none; background: transparent; font-family: inherit; }
        .auth-tab.active { background: var(--white); color: var(--navy-900); box-shadow: var(--shadow-sm); }
        .auth-form-title { font-family: var(--font-display); font-size: 32px; font-weight: 500; color: var(--navy-900); letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 8px; }
        .auth-form-title em { font-style: italic; color: var(--amber-700); font-weight: 400; }
        .auth-form-subtitle { color: var(--ink-600); font-size: 14.5px; margin-bottom: 28px; }
        .role-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 18px; }
        .role-grid.login { grid-template-columns: repeat(5, 1fr); }
        .role-card { padding: 14px 10px; border: 1px solid var(--ink-200); border-radius: var(--r-md); text-align: center; cursor: pointer; transition: all var(--t-fast); background: var(--white); }
        .role-card:hover { border-color: var(--navy-700); }
        .role-card.active { border-color: var(--navy-900); background: var(--navy-100); }
        .role-card .role-icon { width: 28px; height: 28px; margin: 0 auto 8px; color: var(--navy-700); }
        .role-card.active .role-icon { color: var(--navy-900); }
        .role-card .role-name { font-size: 12.5px; font-weight: 600; color: var(--navy-900); }
        .role-card .role-desc { font-size: 11.5px; color: var(--ink-500); line-height: 1.35; margin-top: 5px; }
        .auth-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; font-size: 13px; }
        .checkbox { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; color: var(--ink-700); }
        .auth-submit { width: 100%; padding: 13px; font-size: 14.5px; }
        .auth-divider { display: flex; align-items: center; gap: 14px; margin: 24px 0; font-size: 12px; color: var(--ink-500); }
        .auth-divider::before, .auth-divider::after { content: ""; flex: 1; height: 1px; background: var(--ink-200); }
        .sso-btn { width: 100%; padding: 11px; border: 1px solid var(--ink-300); border-radius: var(--r-md); background: var(--white); color: var(--ink-800); font-weight: 500; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; cursor: pointer; transition: all var(--t-fast); }
        .sso-btn:hover { border-color: var(--ink-500); background: var(--ink-50); }
        .auth-back { position: absolute; top: 32px; left: 32px; color: var(--ink-600); font-size: 13.5px; display: flex; align-items: center; gap: 6px; z-index: 10; }
        .auth-back:hover { color: var(--navy-900); }
        .credential-box { background: var(--ink-50); border: 1px solid var(--ink-200); border-radius: var(--r-md); padding: 14px 16px; margin-bottom: 18px; }
        .credential-box code { font-family: var(--font-mono); font-size: 12px; color: var(--navy-900); }
        .approval-note { background: #FFF8EC; border: 1px solid #F5DBA8; color: var(--amber-800); border-radius: var(--r-md); padding: 12px 14px; font-size: 12.5px; margin-bottom: 18px; }
        @media (max-width: 1100px) { .role-grid.login { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) { body { grid-template-columns: 1fr; } .auth-brand-side { display: none !important; } .auth-form-side { padding: 40px 24px; } }
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
            <p className="auth-quote-text">Students learn the research process, authors submit with confidence, reviewers give structured feedback, and editors are appointed through admin control.</p>
            <p className="auth-quote-author"><strong>JSRMS Role Model</strong> · Student, author, reviewer, editor, and admin workflows</p>
            <div className="auth-stats">
              <div className="auth-stat"><div className="num">6</div><div className="lbl">Training Modules</div></div>
              <div className="auth-stat"><div className="num">3</div><div className="lbl">Signup Roles</div></div>
              <div className="auth-stat"><div className="num">5</div><div className="lbl">Login Roles</div></div>
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
              <p className="auth-form-subtitle">Choose a demo role to continue into the matching workspace.</p>

              <label className="field-label" style={{ marginBottom: 10 }}>Sign in as</label>
              <div className="role-grid login">
                {LOGIN_ROLES.map((item) => (
                  <button type="button" key={item.id} className={`role-card ${loginRole === item.id ? 'active' : ''}`} onClick={() => setLoginRole(item.id)}>
                    {ROLE_ICONS[item.id]}
                    <div className="role-name">{item.name}</div>
                  </button>
                ))}
              </div>

              <div className="credential-box">
                <div className="label" style={{ marginBottom: 8 }}>Demo Credential</div>
                <div>Email: <code>{activeLogin.email}</code></div>
                <div>Password: <code>{activeLogin.password}</code></div>
              </div>

              <div className="field">
                <label className="field-label">Email address</label>
                <input className="field-input" type="email" value={activeLogin.email} readOnly />
              </div>
              <div className="field">
                <label className="field-label">Password</label>
                <input className="field-input" type="text" value={activeLogin.password} readOnly />
              </div>

              <div className="auth-row">
                <label className="checkbox"><input type="checkbox" defaultChecked /> Remember me</label>
                <a href="#" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Forgot password?</a>
              </div>

              <button type="submit" className="btn btn-primary auth-submit">Sign In as {activeLogin.name}</button>
              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-500)', marginTop: 16 }}>
                Editors and admins can log in here, but they cannot self-register.
              </p>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSubmit}>
              <h1 className="auth-form-title">Create your <em>account</em>.</h1>
              <p className="auth-form-subtitle">Students, authors, and reviewer applicants can register here.</p>

              <label className="field-label" style={{ marginBottom: 10 }}>I am joining as</label>
              <div className="role-grid">
                {SIGNUP_ROLES.map((item) => (
                  <button type="button" key={item.id} className={`role-card ${signupRole === item.id ? 'active' : ''}`} onClick={() => setSignupRole(item.id)}>
                    {ROLE_ICONS[item.id]}
                    <div className="role-name">{item.name}</div>
                    <div className="role-desc">{item.desc}</div>
                  </button>
                ))}
              </div>

              <div className="approval-note">
                Editors are appointed by administrators after approval. Reviewer accounts are submitted for admin review before assignments are available.
              </div>

              <div className="field">
                <label className="field-label">Full name</label>
                <input className="field-input" type="text" placeholder={signupRole === 'student' ? 'Nur Aisyah' : 'Dr. Ahmad Razif'} />
              </div>

              <div className="field-grid">
                <div className="field">
                  <label className="field-label">Email address</label>
                  <input className="field-input" type="email" placeholder={signupRole === 'student' ? 'student@utm.edu.my' : 'name@university.edu'} />
                </div>
                <div className="field">
                  <label className="field-label">Institution</label>
                  <input className="field-input" type="text" placeholder="UTM" />
                </div>
              </div>

              {signupRole === 'student' && (
                <div className="field-grid">
                  <div className="field">
                    <label className="field-label">Student ID</label>
                    <input className="field-input" type="text" placeholder="A23CS0123" />
                  </div>
                  <div className="field">
                    <label className="field-label">Programme</label>
                    <input className="field-input" type="text" placeholder="Software Engineering" />
                  </div>
                </div>
              )}

              {signupRole === 'author' && (
                <>
                  <div className="field-grid">
                    <div className="field">
                      <label className="field-label">ORCID ID</label>
                      <input className="field-input" type="text" placeholder="0000-0001-2345-6789" />
                    </div>
                    <div className="field">
                      <label className="field-label">Website</label>
                      <input className="field-input" type="url" placeholder="https://researcher.example" />
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Research areas</label>
                    <input className="field-input" type="text" placeholder="AI, medical imaging, education technology" />
                  </div>
                </>
              )}

              {signupRole === 'reviewer' && (
                <>
                  <div className="field-grid">
                    <div className="field">
                      <label className="field-label">ORCID ID</label>
                      <input className="field-input" type="text" placeholder="0000-0002-9876-5432" />
                    </div>
                    <div className="field">
                      <label className="field-label">Availability status</label>
                      <select className="field-select" defaultValue="available">
                        <option value="available">Available</option>
                        <option value="limited">Limited availability</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Expertise areas</label>
                    <input className="field-input" type="text" placeholder="Machine learning, cybersecurity, research methods" />
                  </div>
                </>
              )}

              <div className="field">
                <label className="field-label">Password</label>
                <input className="field-input" type="password" placeholder="Choose a strong password" />
                <div className="field-hint">Use at least 8 characters with a mix of letters and numbers.</div>
              </div>

              <div className="auth-row">
                <label className="checkbox"><input type="checkbox" defaultChecked /> I agree to the <a href="#" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Terms</a> and <a href="#" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Privacy Policy</a></label>
              </div>

              <button type="submit" className="btn btn-accent auth-submit">
                {signupRole === 'reviewer' ? 'Submit Reviewer Application' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
