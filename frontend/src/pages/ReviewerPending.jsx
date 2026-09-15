// src/pages/ReviewerPending.jsx
// Holding screen for a reviewer whose application an admin has not yet
// approved. Reached via workspaceEntry()/ReviewerActiveGate; it must live
// OUTSIDE the reviewer route block, or the gate would redirect into itself.
// Styles are self-contained (same convention as SelectWorkspace/RegisterPage).

import { Link, useNavigate } from 'react-router-dom';
import { clearDemoSession } from '../data/demoAccounts.js';
import { clearSession } from '../api/auth';
import { getStoredUser, getRoles } from '../auth/roles';

const STEPS = [
  'An editor or administrator reviews your credentials and expertise areas.',
  'You receive a notification by email once a decision is made.',
  'On approval, the reviewer workspace opens and assignments can be sent to you.',
];

export default function ReviewerPending() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const otherRoles = getRoles(user).filter((r) => r !== 'reviewer');

  function handleSignOut() {
    clearDemoSession();      // demo-account + active-role keys
    clearSession();          // user + access + refresh tokens
    navigate('/login');
  }

  return (
    <div className="rp-page fixed-palette">
      <style>{`
        .rp-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--navy-950); padding:32px; }
        .rp-card { max-width:560px; width:100%; }
        .rp-brand { display:flex; align-items:baseline; gap:8px; margin-bottom:32px; justify-content:center; }
        .rp-brand-name { font-family:var(--font-display); font-weight:600; font-size:22px; color:var(--white); }
        .rp-brand-tag  { font-size:11px; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--amber-500); }
        .rp-head { text-align:center; margin-bottom:28px; }
        .rp-badge { display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:999px; background:rgba(239,159,39,0.14); color:var(--amber-500); font-size:11.5px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; }
        .rp-title { font-family:var(--font-display); font-size:30px; font-weight:500; color:var(--white); letter-spacing:-0.02em; margin:16px 0 6px; }
        .rp-title em { color:var(--amber-500); font-style:italic; font-weight:400; }
        .rp-sub { color:var(--navy-200); font-size:14px; line-height:1.6; }
        .rp-steps { display:grid; gap:14px; padding:22px 24px; border:1.5px solid rgba(255,255,255,0.12); border-radius:var(--r-lg); background:rgba(255,255,255,0.04); }
        .rp-step { display:flex; gap:14px; align-items:flex-start; color:var(--navy-200); font-size:13.5px; line-height:1.6; }
        .rp-step-n { width:24px; height:24px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:var(--amber-500); color:var(--navy-950); font-size:11.5px; font-weight:700; }
        .rp-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-top:26px; }
        .rp-foot { text-align:center; margin-top:24px; font-size:13px; }
        .rp-signout { background:none; color:var(--navy-200); font-size:13px; font-weight:500; }
        .rp-signout:hover { color:var(--white); }
      `}</style>

      <div className="rp-card">
        <Link to="/" className="rp-brand">
          <span className="rp-brand-name">PaperBridge</span>
          <span className="rp-brand-tag">Research Portal</span>
        </Link>

        <div className="rp-head">
          <span className="rp-badge">Awaiting approval</span>
          <h1 className="rp-title">Your reviewer application is <em>under review</em>.</h1>
          <p className="rp-sub">
            Thanks for applying{user?.name ? `, ${user.name}` : ''}. Reviewer accounts are
            approved by hand, so there is nothing further for you to do right now.
          </p>
        </div>

        <div className="rp-steps">
          {STEPS.map((text, i) => (
            <div className="rp-step" key={i}>
              <span className="rp-step-n">{i + 1}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {otherRoles.length > 0 && (
          <div className="rp-actions">
            <Link to="/select-workspace" className="btn btn-accent btn-sm">Use another workspace</Link>
          </div>
        )}

        <div className="rp-foot">
          <button type="button" className="rp-signout" onClick={handleSignOut}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
