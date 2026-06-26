import { useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { SIDEBAR_CONFIG } from '../data/sidebarConfig.jsx';
import { getStoredUser, getInitials } from '../utils/user.js';
import { API_URL } from '../config';

export default function Profile({ role = 'author' }) {
  const cfg = SIDEBAR_CONFIG[role];

  const storedUser = getStoredUser();
  const userRoles        = storedUser?.roles || [role];
  const reviewerStatus   = storedUser?.reviewer_status || '';
  const isAuthor         = userRoles.includes('author');
  const isAlreadyReviewer = userRoles.includes('reviewer');

  const [applyLoading, setApplyLoading]   = useState(false);
  const [applyError, setApplyError]       = useState('');
  const [applySuccess, setApplySuccess]   = useState(false);
  const [expertiseInput, setExpertiseInput] = useState(storedUser?.expertise_areas || '');

  async function handleApplyReviewer(e) {
    e.preventDefault();
    setApplyError('');
    setApplyLoading(true);
    try {
      const access = localStorage.getItem('access');
      const res = await fetch(`${API_URL}/api/users/apply-reviewer/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
        body: JSON.stringify({ expertise_areas: expertiseInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Failed to submit application.');
      localStorage.setItem('user', JSON.stringify(data));
      setApplySuccess(true);
    } catch (err) {
      setApplyError(err.message);
    } finally {
      setApplyLoading(false);
    }
  }

  return (
    <AppShell role={role} searchPlaceholder="Search...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Account</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Your <em className="serif-italic">profile</em>.</h1>
          <p className="page-subtitle">Update how you appear across PaperBridge.</p>
        </div>
        <button className="btn btn-primary btn-sm">Save Changes</button>
      </div>

      <div className="split-grid fade-up delay-1" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{
            width: 100, height: 100, margin: '12px auto 16px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--amber-500), var(--amber-700))',
            color: 'var(--navy-900)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 500,
          }}>{getInitials(storedUser) || cfg.user.initials}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--navy-900)' }}>{storedUser?.name || cfg.user.name}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 4 }}>{storedUser?.institution || cfg.role}</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>Change photo</button>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Personal Information</div></div>
          <div className="field-grid">
            <div className="field">
              <label className="field-label">Full name</label>
              <input className="field-input" defaultValue={storedUser?.name || ''} />
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" defaultValue={storedUser?.email || ''} />
            </div>
            <div className="field">
              <label className="field-label">Institution</label>
              <input className="field-input" defaultValue={storedUser?.institution || ''} placeholder="Your institution" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Bio</label>
            <textarea className="field-textarea" rows="4" placeholder="Tell us about your research background and interests." />
          </div>
          <div className="field">
            <label className="field-label">Research interests</label>
            <input className="field-input" placeholder="e.g. deep learning, medical imaging, computer vision" />
          </div>
        </div>
      </div>

      {isAuthor && (
        <div className="card fade-up delay-2" style={{ marginTop: 0 }}>
          <div className="card-header">
            <div className="card-title">Become a Reviewer</div>
          </div>

          {isAlreadyReviewer && reviewerStatus === 'active' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--teal-50)', border: '1px solid #a8dcc8', borderRadius: 'var(--r-md)', fontSize: 13.5, color: 'var(--teal-800)' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              You are an active reviewer on this platform.
            </div>
          )}

          {reviewerStatus === 'pending' && !applySuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fffbeb', border: '1px solid #f0d58c', borderRadius: 'var(--r-md)', fontSize: 13.5, color: '#92600a' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Your reviewer application is under review by an admin.
            </div>
          )}

          {reviewerStatus === 'rejected' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--red-50)', border: '1px solid #f5c6c6', borderRadius: 'var(--r-md)', fontSize: 13.5, color: 'var(--red-700)' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Your previous reviewer application was not approved. You may reapply below.
            </div>
          )}

          {applySuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--teal-50)', border: '1px solid #a8dcc8', borderRadius: 'var(--r-md)', fontSize: 13.5, color: 'var(--teal-800)' }}>
              Application submitted — an admin will review it shortly.
            </div>
          )}

          {!isAlreadyReviewer && reviewerStatus !== 'pending' && !applySuccess && (
            <form onSubmit={handleApplyReviewer} style={{ marginTop: 16 }}>
              <p style={{ fontSize: 13.5, color: 'var(--ink-600)', marginBottom: 14, lineHeight: 1.6 }}>
                As an author on PaperBridge, you can also contribute as a peer reviewer. Your application will be reviewed by an admin before the reviewer role is activated.
              </p>
              <div className="field">
                <label className="field-label">Expertise areas</label>
                <input className="field-input" type="text" placeholder="e.g. Machine Learning, Biomedical Engineering"
                  value={expertiseInput} onChange={e => setExpertiseInput(e.target.value)} />
                <div className="field-hint">Help us match you with relevant manuscripts.</div>
              </div>
              {applyError && (
                <div style={{ padding: '10px 14px', background: 'var(--red-50)', border: '1px solid #f5c6c6', borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--red-700)', marginBottom: 12 }}>{applyError}</div>
              )}
              <button type="submit" className="btn btn-primary btn-sm" disabled={applyLoading}>
                {applyLoading ? 'Submitting…' : 'Apply as Reviewer →'}
              </button>
            </form>
          )}
        </div>
      )}

    </AppShell>
  );
}
