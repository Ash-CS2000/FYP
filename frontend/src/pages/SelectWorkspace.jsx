import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getStoredUser,
  getRoles,
  setActiveRole,
  workspaceEntry,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
} from '../auth/roles';

// ── Role icons ────────────────────────────────────────────────────────────────
const ICONS = {
  author: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" />
    </svg>
  ),
  reviewer: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  editor: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

export default function SelectWorkspace() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const roles = getRoles(user);

  // Redirect away if this page doesn't apply (not signed in, or single role).
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (roles.length <= 1) {
      const only = roles[0];
      setActiveRole(only);
      navigate(workspaceEntry(only), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(role) {
    setActiveRole(role);
    navigate(workspaceEntry(role));
  }

  if (!user || roles.length <= 1) return null;

  return (
    <div className="ws-page">
      <style>{`
        .ws-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--navy-950); padding:32px; }
        .ws-card { max-width:520px; width:100%; }
        .ws-brand { display:flex; align-items:baseline; gap:8px; margin-bottom:32px; justify-content:center; }
        .ws-brand-name { font-family:var(--font-display); font-weight:600; font-size:22px; color:var(--white); }
        .ws-brand-tag  { font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--amber-500); }
        .ws-title { font-family:var(--font-display); font-size:30px; font-weight:500; color:var(--white); letter-spacing:-0.02em; text-align:center; margin-bottom:6px; }
        .ws-title em { color:var(--amber-500); font-style:italic; font-weight:400; }
        .ws-sub { color:var(--navy-200); font-size:14px; text-align:center; margin-bottom:28px; }
        .ws-list { display:grid; gap:12px; }
        .ws-item { display:flex; align-items:center; gap:16px; padding:18px 20px; border:1.5px solid rgba(255,255,255,0.12); border-radius:var(--r-lg); cursor:pointer; background:rgba(255,255,255,0.04); transition:all var(--t-fast); text-align:left; width:100%; color:var(--white); }
        .ws-item:hover { border-color:var(--amber-500); background:rgba(255,255,255,0.08); transform:translateY(-1px); }
        .ws-item-icon { width:46px; height:46px; border-radius:var(--r-md); display:flex; align-items:center; justify-content:center; flex-shrink:0; background:rgba(255,255,255,0.08); color:var(--amber-500); }
        .ws-item-label { font-weight:600; font-size:15.5px; color:var(--white); margin-bottom:3px; }
        .ws-item-desc  { font-size:13px; color:var(--navy-200); line-height:1.5; }
        .ws-arrow { margin-left:auto; color:var(--navy-300); flex-shrink:0; }
        .ws-foot { text-align:center; margin-top:24px; font-size:13px; }
        .ws-foot a { color:var(--navy-200); font-weight:500; }
        .ws-foot a:hover { color:var(--white); }
      `}</style>

      <div className="ws-card">
        <Link to="/" className="ws-brand">
          <span className="ws-brand-name">PaperBridge</span>
          <span className="ws-brand-tag">Research Portal</span>
        </Link>

        <h1 className="ws-title">Choose your <em>workspace</em>.</h1>
        <p className="ws-sub">Your account has more than one role. Pick where you'd like to work.</p>

        <div className="ws-list">
          {roles.map((role) => (
            <button key={role} type="button" className="ws-item" onClick={() => choose(role)}>
              <span className="ws-item-icon">{ICONS[role]}</span>
              <span>
                <span className="ws-item-label">{ROLE_LABELS[role] || role}</span>
                <span className="ws-item-desc" style={{ display: 'block' }}>
                  {ROLE_DESCRIPTIONS[role] || ''}
                </span>
              </span>
              <svg className="ws-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>

        <p className="ws-foot">
          <Link to="/login">← Sign in as a different account</Link>
        </p>
      </div>
    </div>
  );
}
