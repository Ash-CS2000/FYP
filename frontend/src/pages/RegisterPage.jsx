import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { saveTokens } from '../api/auth';
import { landingRoute } from '../auth/roles';
import { API_URL } from '../config';

// ── Shared icons ──────────────────────────────────────────────────────────────
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

// ── Brand panel config per view ───────────────────────────────────────────────
const BRAND = {
  roles: {
    title:    <>Tell us who <em>you are</em>.</>,
    body:     'Choose your role to get the right workspace and access level for your work on PaperBridge.',
    benefits: [
      'Browse and discover published research as a normal user.',
      'Submit manuscripts and track revisions as an author.',
      'Evaluate assigned manuscripts as a peer reviewer.',
    ],
  },
  user: {
    title:    <>Join as a <em>user</em>.</>,
    body:     'Browse published research, access training modules, and build your research skills — no approval needed.',
    benefits: [
      'Search and read published papers freely.',
      'Access training modules and learning resources.',
      'Track your learning progress and milestones.',
    ],
  },
  author: {
    title:    <>Register as an <em>author</em>.</>,
    body:     'Submit your manuscripts for peer review and manage your publication journey from submission to decision.',
    benefits: [
      'Submit manuscripts through a guided multi-step workflow.',
      'Track review status and respond to reviewer feedback.',
      'Manage revisions and receive editorial decisions.',
    ],
  },
  reviewer: {
    title:    <>Register as a <em>reviewer</em>.</>,
    body:     'Contribute to academic publishing by evaluating manuscripts matched to your area of expertise.',
    benefits: [
      'Receive manuscripts matched to your expertise.',
      'Submit structured reviews with scores and recommendations.',
      'Build your academic contribution record.',
    ],
  },
  student: {
    title:    <>Register as a <em>student</em>.</>,
    body:     'Verify your student status to access institution-specific resources, training modules, and research materials.',
    benefits: [
      'Access institution-specific research resources.',
      'Complete training modules and track your progress.',
      'Discover papers relevant to your programme.',
    ],
  },
};

// ── Extended role card definitions ────────────────────────────────────────────
const EXTENDED_ROLES = [
  {
    id:        'author',
    label:     'Author',
    desc:      'Submit manuscripts for peer review and track your publication journey.',
    note:      'Instant access',
    noteColor: 'var(--teal-700)',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/>
      </svg>
    ),
  },
  {
    id:        'reviewer',
    label:     'Reviewer',
    desc:      'Evaluate assigned manuscripts and contribute to academic quality.',
    note:      'Instant access',
    noteColor: 'var(--teal-700)',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
];

// ── Password strength helper ──────────────────────────────────────────────────
function pwStrength(pw) {
  if (!pw) return null;
  let s = 0;
  if (pw.length >= 8)            s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw))  s++;
  return [
    { label: 'Weak',   color: 'var(--red-500)',   width: '25%' },
    { label: 'Fair',   color: 'var(--amber-500)', width: '50%' },
    { label: 'Good',   color: 'var(--navy-500)',  width: '75%' },
    { label: 'Strong', color: 'var(--teal-500)',  width: '100%' },
  ][Math.min(s - 1, 3)];
}

// ── PasswordField sub-component ───────────────────────────────────────────────
function PasswordField({ label, value, onChange, placeholder, show, onToggle, showStrength }) {
  const strength = showStrength ? pwStrength(value) : null;
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="pw-wrap">
        <input
          className="field-input"
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete="new-password"
          required
        />
        <button type="button" className="pw-toggle" onClick={onToggle} tabIndex={-1}>
          {show ? <EyeClosed /> : <EyeOpen />}
        </button>
      </div>
      {strength && (
        <div className="pw-strength">
          <div className="pw-strength-bar">
            <div className="pw-strength-fill" style={{ width: strength.width, background: strength.color }} />
          </div>
          <span className="pw-strength-label" style={{ color: strength.color }}>{strength.label}</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RegisterPage() {
  // 'roles' | 'user' | 'author' | 'reviewer' | 'editor'
  const [view, setView] = useState('roles');

  // Shared account fields
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Role-specific fields
  const [institution, setInstitution]         = useState('');
  const [researchAreas, setResearchAreas]     = useState('');
  const [expertiseAreas, setExpertiseAreas]   = useState('');
  const [studentId, setStudentId]             = useState('');
  const [affiliationType, setAffiliationType] = useState('student');
  const [myState, setMyState]                 = useState('');
  const [dateOfBirth, setDateOfBirth]         = useState('');
  const [degree, setDegree]                   = useState('');
  const [position, setPosition]               = useState('');
  const [reviewerState, setReviewerState]     = useState('');
  const [availability, setAvailability]       = useState('');

  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function selectView(v) {
    setView(v);
    setError('');
  }

  function validateBase() {
    if (fullName.trim().length < 2) return 'Please enter your full name.';
    if (!email.trim())               return 'Email address is required.';
    if (password.length < 8)         return 'Password must be at least 8 characters.';
    if (password !== confirmPw)      return 'Passwords do not match.';
    return null;
  }

  async function handleOrcidClick() {
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/users/orcid/url/`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error('Failed to start ORCID authentication.');
      }

      sessionStorage.setItem('orcid_state', data.state);
      window.location.href = data.auth_url;
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e, role) {
    e.preventDefault();
    const err = validateBase();
    if (err) return setError(err);
    setError('');
    setLoading(true);
    try {
      const body = {
        full_name:   fullName.trim(),
        email:       email.trim().toLowerCase(),
        password,
        role,
        institution,
      };
      if (role === 'author') {
        body.affiliation_type  = affiliationType;
        body.research_areas    = researchAreas;
        body.state             = myState;
        if (dateOfBirth) body.date_of_birth = dateOfBirth;
      }
      if (role === 'reviewer') {
        body.expertise_areas     = expertiseAreas;
        body.degree              = degree;
        body.programme           = position;
        body.state               = reviewerState;
        body.availability_status = availability;
        if (dateOfBirth) body.date_of_birth = dateOfBirth;
      }

      const res  = await fetch(`${API_URL}/api/auth/register/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(
        data?.email?.[0] || data?.password?.[0] || data?.full_name?.[0] ||
        data?.non_field_errors?.[0] || 'Registration failed. Please try again.'
      );

      // Auto-login after registration
      const loginRes  = await fetch(`${API_URL}/api/auth/login/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (loginRes.ok) {
        saveTokens(data.access, data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Route on the same user object we persisted, so the guards in
        // ProtectedRoute agree with where we send them.
        navigate(landingRoute(data.user));
      } else {
        navigate('/login', { state: { registered: true } });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const brand = BRAND[view];

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
        .auth-copy-title { font-family:var(--font-display); font-size:40px; font-weight:500; line-height:1.08; letter-spacing:-0.02em; margin-bottom:14px; }
        .auth-copy-title em { color:var(--amber-500); font-style:italic; font-weight:400; }
        .auth-copy-body  { color:var(--navy-200); font-size:15px; line-height:1.7; }
        .auth-benefits { list-style:none; display:grid; gap:10px; margin-top:26px; }
        .auth-benefit { display:flex; align-items:center; gap:12px; padding:11px 14px; border:1px solid rgba(255,255,255,0.08); border-radius:var(--r-md); color:var(--navy-100); background:rgba(255,255,255,0.04); font-size:13.5px; }
        .auth-benefit-num { width:22px; height:22px; border-radius:50%; background:var(--amber-500); color:var(--navy-950); display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; flex-shrink:0; }
        .auth-form-side { padding:52px 56px; display:flex; flex-direction:column; justify-content:center; overflow-y:auto; }
        .auth-form-wrap { max-width:440px; width:100%; margin:0 auto; }
        .auth-back-link { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--ink-600); margin-bottom:28px; transition:color var(--t-fast); background:none; border:none; cursor:pointer; padding:0; }
        .auth-back-link:hover { color:var(--navy-900); }
        .auth-form-title { font-family:var(--font-display); font-size:34px; font-weight:500; color:var(--navy-900); letter-spacing:-0.02em; line-height:1.1; margin-bottom:6px; }
        .auth-form-title em { font-style:italic; color:var(--amber-700); font-weight:400; }
        .auth-form-sub { color:var(--ink-600); font-size:14px; margin-bottom:28px; }
        .role-list { display:grid; gap:10px; margin-bottom:24px; }
        .role-item { display:flex; align-items:flex-start; gap:14px; padding:18px; border:1.5px solid var(--ink-200); border-radius:var(--r-lg); cursor:pointer; background:var(--white); transition:all var(--t-fast); text-align:left; width:100%; }
        .role-item:hover:not(:disabled) { border-color:var(--navy-500); background:var(--navy-100); transform:translateY(-1px); box-shadow:var(--shadow-sm); }
        .role-item:disabled { opacity:.5; cursor:not-allowed; }
        .role-item-icon { width:46px; height:46px; border-radius:var(--r-md); display:flex; align-items:center; justify-content:center; flex-shrink:0; background:var(--ink-100); color:var(--navy-700); }
        .role-item-label { font-weight:600; font-size:14.5px; color:var(--navy-900); margin-bottom:3px; }
        .role-item-desc  { font-size:13px; color:var(--ink-600); line-height:1.5; }
        .role-item-note  { font-size:12px; font-weight:600; margin-top:5px; }
        .user-option { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border:1.5px dashed var(--ink-300); border-radius:var(--r-lg); cursor:pointer; background:transparent; transition:all var(--t-fast); width:100%; text-align:left; }
        .user-option:hover { border-color:var(--navy-500); background:var(--navy-100); }
        .user-option-label { font-size:14px; font-weight:600; color:var(--navy-900); }
        .user-option-desc  { font-size:12.5px; color:var(--ink-600); margin-top:2px; }
        .divider { display:flex; align-items:center; gap:12px; margin:18px 0; color:var(--ink-400); font-size:12px; }
        .divider::before, .divider::after { content:""; flex:1; height:1px; background:var(--ink-200); }
        .pw-wrap { position:relative; }
        .pw-wrap .field-input { padding-right:44px; }
        .pw-toggle { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--ink-500); cursor:pointer; padding:4px; display:flex; line-height:0; }
        .pw-toggle:hover { color:var(--ink-800); }
        .pw-strength { margin-top:6px; }
        .pw-strength-bar { height:3px; background:var(--ink-200); border-radius:2px; overflow:hidden; margin-bottom:4px; }
        .pw-strength-fill { height:100%; border-radius:2px; transition:width var(--t-base); }
        .pw-strength-label { font-size:11.5px; }
        .info-box { background:var(--ink-50); border:1px solid var(--ink-200); border-radius:var(--r-md); padding:12px 14px; margin-bottom:16px; font-size:13px; color:var(--ink-700); display:flex; gap:10px; align-items:flex-start; }
        .info-box svg { flex-shrink:0; margin-top:1px; color:var(--amber-700); }
        .info-box.editor { border-color:var(--navy-300); background:var(--navy-100); color:var(--navy-800); }
        .info-box.editor svg { color:var(--navy-700); }
        .orcid-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:10px; padding:12px; border:1.5px solid #a6ce39; border-radius:var(--r-md); background:#a6ce39; color:#1a1a1a; font-size:14px; font-weight:600; cursor:pointer; transition:all var(--t-fast); margin-bottom:4px; }
        .orcid-btn:hover { background:#91b82e; border-color:#91b82e; transform:translateY(-1px); box-shadow:0 4px 12px rgba(166,206,57,0.35); }
        .orcid-badge { width:24px; height:24px; border-radius:50%; background:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#a6ce39; flex-shrink:0; letter-spacing:-0.02em; }
        .orcid-note { font-size:12px; color:var(--ink-500); text-align:center; margin-bottom:16px; }
        .auth-error { background:var(--red-50); border:1px solid #f5c6c6; border-radius:var(--r-md); padding:11px 14px; margin-bottom:16px; font-size:13px; color:var(--red-700); }
        .auth-submit { width:100%; padding:13px; font-size:14.5px; }
        .auth-submit:disabled { opacity:.6; cursor:not-allowed; transform:none !important; box-shadow:none !important; }
        .auth-switch { text-align:center; font-size:13.5px; color:var(--ink-600); margin-top:16px; }
        .auth-anchor { color:var(--navy-700); font-weight:500; transition:color var(--t-fast); }
        .auth-anchor:hover { color:var(--navy-900); }
        @media(max-width:900px){ .auth-page{grid-template-columns:1fr;} .auth-brand{display:none;} .auth-form-side{padding:40px 24px;} }
      `}</style>

      {/* ── Brand panel ─────────────────────────────────────────────────────── */}
      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <Link to="/" className="auth-brand-logo">
            <span className="auth-brand-name">PaperBridge</span>
            <span className="auth-brand-tag">Research Portal</span>
          </Link>
          <div className="auth-copy">
            <h2 className="auth-copy-title">{brand.title}</h2>
            <p className="auth-copy-body">{brand.body}</p>
            <ul className="auth-benefits">
              {brand.benefits.map((text, i) => (
                <li key={i} className="auth-benefit">
                  <span className="auth-benefit-num">{i + 1}</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* ── Form panel ──────────────────────────────────────────────────────── */}
      <main className="auth-form-side">
        <div className="auth-form-wrap">

          {/* ── View: Role selector ─────────────────────────────────────────── */}
          {view === 'roles' && (
            <>
              <Link to="/" className="auth-back-link">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to papers
              </Link>

              <h1 className="auth-form-title">Tell us who <em>you are</em>.</h1>
              <p className="auth-form-sub">Choose your role to get the right workspace.</p>

              <div className="role-list">
                {EXTENDED_ROLES.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    className="role-item"
                    disabled={r.disabled}
                    onClick={() => !r.disabled && selectView(r.id)}
                  >
                    <div className="role-item-icon">{r.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div className="role-item-label">{r.label}</div>
                      <div className="role-item-desc">{r.desc}</div>
                      <div className="role-item-note" style={{ color: r.noteColor }}>{r.note}</div>
                    </div>
                    {!r.disabled && (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--ink-400)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>


              <p className="auth-switch" style={{ marginTop: 24 }}>
                Already have an account?{' '}
                <Link to="/login" className="auth-anchor" style={{ fontWeight: 600 }}>Sign in →</Link>
              </p>
            </>
          )}

          {/* ── View: Student form ───────────────────────────────────────────── */}
          {view === 'student' && (
            <>
              <button type="button" className="auth-back-link" onClick={() => selectView('roles')}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <h1 className="auth-form-title">Register as a <em>student</em>.</h1>
              <p className="auth-form-sub">Verify your student status to access institution-specific resources.</p>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={e => handleSubmit(e, 'student')} noValidate>
                <div className="field">
                  <label className="field-label">Full name</label>
                  <input className="field-input" type="text" placeholder="Nur Aisyah" value={fullName}
                    onChange={e => setFullName(e.target.value)} autoComplete="name" required />
                </div>
                <div className="field">
                  <label className="field-label">Email address</label>
                  <input className="field-input" type="email" placeholder="you@university.edu" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" required />
                </div>
                <div className="field">
                  <label className="field-label">Institution</label>
                  <input className="field-input" type="text" placeholder="Universiti Teknologi Malaysia"
                    value={institution} onChange={e => setInstitution(e.target.value)} required />
                </div>
                <div className="field">
                  <label className="field-label">
                    Student ID{' '}
                    <span style={{ color: 'var(--ink-400)', fontWeight: 400, textTransform: 'none', fontSize: 12, letterSpacing: 0 }}>(optional)</span>
                  </label>
                  <input className="field-input" type="text" placeholder="e.g. A22EC0001"
                    value={studentId} onChange={e => setStudentId(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">
                    Programme / Faculty{' '}
                    <span style={{ color: 'var(--ink-400)', fontWeight: 400, textTransform: 'none', fontSize: 12, letterSpacing: 0 }}>(optional)</span>
                  </label>
                  <input className="field-input" type="text" placeholder="e.g. Bachelor of Computer Science"
                    value={researchAreas} onChange={e => setResearchAreas(e.target.value)} />
                </div>
                <PasswordField
                  label="Password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters" show={showPw} onToggle={() => setShowPw(v => !v)} showStrength
                />
                <PasswordField
                  label="Confirm password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat your password" show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                />
                <button type="submit" className="btn btn-primary auth-submit" style={{ marginTop: 8 }} disabled={loading}>
                  {loading ? 'Creating account…' : 'Create Student Account →'}
                </button>
              </form>

              <p className="auth-switch">
                Already have an account?{' '}
                <Link to="/login" className="auth-anchor" style={{ fontWeight: 600 }}>Sign in →</Link>
              </p>
            </>
          )}



          {/* ── View: Author form ────────────────────────────────────────────── */}
          {view === 'author' && (
            <>
              <button type="button" className="auth-back-link" onClick={() => selectView('roles')}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <h1 className="auth-form-title">Register as an <em>author</em>.</h1>
              <p className="auth-form-sub">Provide your details to set up your author account.</p>

              <button type="button" className="orcid-btn" onClick={handleOrcidClick}>
                <span className="orcid-badge">iD</span>
                Continue with ORCID iD
              </button>

              <div className="divider">or fill in manually</div>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={e => handleSubmit(e, 'author')} noValidate>
                <div className="field">
                  <label className="field-label">Full name <span className="req">*</span></label>
                  <input className="field-input" type="text" placeholder="Ahmad Razif" value={fullName}
                    onChange={e => setFullName(e.target.value)} autoComplete="name" required />
                </div>
                <div className="field">
                  <label className="field-label">Email address <span className="req">*</span></label>
                  <input className="field-input" type="email" placeholder="you@university.edu" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" required />
                </div>
                <div className="field">
                  <label className="field-label">Date of birth <span className="req">*</span></label>
                  <input className="field-input" type="date" value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)} required />
                  <div className="field-hint">Used for age verification purposes.</div>
                </div>

                <div className="field">
                  <label className="field-label">I am a <span className="req">*</span></label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {[
                      { value: 'student',      label: 'Student' },
                      { value: 'professional', label: 'Professional' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAffiliationType(opt.value)}
                        style={{
                          flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)', fontSize: 13.5,
                          fontWeight: 600, cursor: 'pointer', transition: 'all var(--t-fast)',
                          border: affiliationType === opt.value ? '2px solid var(--navy-700)' : '2px solid var(--ink-200)',
                          background: affiliationType === opt.value ? 'var(--navy-100)' : 'transparent',
                          color: affiliationType === opt.value ? 'var(--navy-900)' : 'var(--ink-600)',
                        }}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Institution / Organisation</label>
                  <input className="field-input" type="text" placeholder="Universiti Teknologi Malaysia"
                    value={institution} onChange={e => setInstitution(e.target.value)} />
                </div>

                <div className="field">
                  <label className="field-label">
                    Research / Expertise areas{' '}
                    <span style={{ color: 'var(--ink-400)', fontWeight: 400, textTransform: 'none', fontSize: 12 }}>(optional)</span>
                  </label>
                  <input className="field-input" type="text" placeholder="e.g. Machine Learning, Computer Vision"
                    value={researchAreas} onChange={e => setResearchAreas(e.target.value)} />
                  <div className="field-hint">Helps us suggest relevant submissions and match reviewers.</div>
                </div>

                <div className="field">
                  <label className="field-label">State</label>
                  <select className="field-select" value={myState} onChange={e => setMyState(e.target.value)}>
                    <option value="">Select state…</option>
                    <option value="Johor">Johor</option>
                    <option value="Kedah">Kedah</option>
                    <option value="Kelantan">Kelantan</option>
                    <option value="Melaka">Melaka</option>
                    <option value="Negeri Sembilan">Negeri Sembilan</option>
                    <option value="Pahang">Pahang</option>
                    <option value="Perak">Perak</option>
                    <option value="Perlis">Perlis</option>
                    <option value="Pulau Pinang">Pulau Pinang</option>
                    <option value="Sabah">Sabah</option>
                    <option value="Sarawak">Sarawak</option>
                    <option value="Selangor">Selangor</option>
                    <option value="Terengganu">Terengganu</option>
                    <option value="Kuala Lumpur">W.P. Kuala Lumpur</option>
                    <option value="Labuan">W.P. Labuan</option>
                    <option value="Putrajaya">W.P. Putrajaya</option>
                  </select>
                </div>

                <PasswordField
                  label="Password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters" show={showPw} onToggle={() => setShowPw(v => !v)} showStrength
                />
                <PasswordField
                  label="Confirm password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat your password" show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                />
                <button type="submit" className="btn btn-primary auth-submit" style={{ marginTop: 8 }} disabled={loading}>
                  {loading ? 'Creating account…' : 'Create Author Account →'}
                </button>
              </form>

              <p className="auth-switch">
                Already have an account?{' '}
                <Link to="/login" className="auth-anchor" style={{ fontWeight: 600 }}>Sign in →</Link>
              </p>
            </>
          )}

          {/* ── View: Reviewer form ──────────────────────────────────────────── */}
          {view === 'reviewer' && (
            <>
              <button type="button" className="auth-back-link" onClick={() => selectView('roles')}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <h1 className="auth-form-title">Register as a <em>reviewer</em>.</h1>
              <p className="auth-form-sub">Provide your credentials to set up your reviewer account.</p>

              <button type="button" className="orcid-btn" onClick={handleOrcidClick}>
                <span className="orcid-badge">iD</span>
                Continue with ORCID iD
              </button>

              <div className="divider">or fill in manually</div>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={e => handleSubmit(e, 'reviewer')} noValidate>
                <div className="field">
                  <label className="field-label">Full name</label>
                  <input className="field-input" type="text" placeholder="Dr. Lim Wei Ping" value={fullName}
                    onChange={e => setFullName(e.target.value)} autoComplete="name" required />
                </div>
                <div className="field">
                  <label className="field-label">Email address</label>
                  <input className="field-input" type="email" placeholder="you@university.edu" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" required />
                </div>
                <div className="field">
                  <label className="field-label">Date of birth <span className="req">*</span></label>
                  <input className="field-input" type="date" value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)} required />
                  <div className="field-hint">Used for age verification purposes.</div>
                </div>
                <div className="field">
                  <label className="field-label">Academic degree <span className="req">*</span></label>
                  <select className="field-select" value={degree} onChange={e => setDegree(e.target.value)} required>
                    <option value="">Select degree…</option>
                    <option value="bachelor">Bachelor's Degree</option>
                    <option value="master">Master's Degree</option>
                    <option value="phd">PhD / Doctorate</option>
                    <option value="professor">Professor / Associate Professor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Institution</label>
                  <input className="field-input" type="text" placeholder="Universiti Malaya"
                    value={institution} onChange={e => setInstitution(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">Current position</label>
                  <input className="field-input" type="text" placeholder="e.g. Senior Lecturer, Research Fellow"
                    value={position} onChange={e => setPosition(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">State</label>
                  <select className="field-select" value={reviewerState} onChange={e => setReviewerState(e.target.value)}>
                    <option value="">Select state…</option>
                    <option value="Johor">Johor</option>
                    <option value="Kedah">Kedah</option>
                    <option value="Kelantan">Kelantan</option>
                    <option value="Melaka">Melaka</option>
                    <option value="Negeri Sembilan">Negeri Sembilan</option>
                    <option value="Pahang">Pahang</option>
                    <option value="Perak">Perak</option>
                    <option value="Perlis">Perlis</option>
                    <option value="Pulau Pinang">Pulau Pinang</option>
                    <option value="Sabah">Sabah</option>
                    <option value="Sarawak">Sarawak</option>
                    <option value="Selangor">Selangor</option>
                    <option value="Terengganu">Terengganu</option>
                    <option value="Kuala Lumpur">W.P. Kuala Lumpur</option>
                    <option value="Labuan">W.P. Labuan</option>
                    <option value="Putrajaya">W.P. Putrajaya</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Availability</label>
                  <select className="field-select" value={availability} onChange={e => setAvailability(e.target.value)}>
                    <option value="">Select availability…</option>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">
                    Areas of expertise <span className="req">*</span>
                  </label>
                  <input className="field-input" type="text" placeholder="e.g. Deep Learning, Biomedical Engineering"
                    value={expertiseAreas} onChange={e => setExpertiseAreas(e.target.value)} required />
                  <div className="field-hint">Used to match you with relevant manuscripts to review.</div>
                </div>
                <PasswordField
                  label="Password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters" show={showPw} onToggle={() => setShowPw(v => !v)} showStrength
                />
                <PasswordField
                  label="Confirm password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat your password" show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
                />
                <button type="submit" className="btn btn-primary auth-submit" style={{ marginTop: 8 }} disabled={loading}>
                  {loading ? 'Submitting application…' : 'Submit Application →'}
                </button>
              </form>

              <p className="auth-switch">
                Already have an account?{' '}
                <Link to="/login" className="auth-anchor" style={{ fontWeight: 600 }}>Sign in →</Link>
              </p>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
