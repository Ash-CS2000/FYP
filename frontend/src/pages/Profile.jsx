import AppShell from '../components/AppShell.jsx';
import { SIDEBAR_CONFIG } from '../data/sidebarConfig.jsx';

export default function Profile({ role = 'author' }) {
  const cfg = SIDEBAR_CONFIG[role];

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
          }}>{cfg.user.initials}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--navy-900)' }}>{cfg.user.name}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-600)', marginTop: 4 }}>{cfg.user.role}</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>Change photo</button>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Personal Information</div></div>
          <div className="field-grid">
            <div className="field">
              <label className="field-label">Full name</label>
              <input className="field-input" defaultValue={cfg.user.name} />
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <input className="field-input" type="email" defaultValue="ahmad@utm.edu.my" />
            </div>
            <div className="field">
              <label className="field-label">Institution</label>
              <input className="field-input" defaultValue="Universiti Teknologi Malaysia" />
            </div>
            <div className="field">
              <label className="field-label">ORCID</label>
              <input className="field-input" defaultValue="0000-0001-2345-6789" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Bio</label>
            <textarea className="field-textarea" rows="4" defaultValue="Researcher in deep learning and computer vision, with a focus on medical imaging applications. Currently working on transformer architectures for diagnostic accuracy improvements." />
          </div>
          <div className="field">
            <label className="field-label">Research interests</label>
            <input className="field-input" defaultValue="deep learning, medical imaging, computer vision, transformers" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
