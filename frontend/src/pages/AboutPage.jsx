import { Link } from 'react-router-dom';
import PublicNav from '../components/PublicNav.jsx';

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-50)' }}>
      <style>{`
        .about-hero { background:var(--white); border-bottom:1px solid var(--ink-200); padding:72px 32px 56px; }
        .about-inner { max-width:900px; margin:0 auto; }
        .about-eyebrow { font-family:var(--font-mono); font-size:11px; font-weight:500; letter-spacing:0.12em; text-transform:uppercase; color:var(--navy-700); margin-bottom:16px; }
        .about-title { font-family:var(--font-display); font-size:clamp(36px,5vw,54px); font-weight:500; line-height:1.06; letter-spacing:-0.02em; color:var(--navy-900); margin-bottom:20px; }
        .about-title em { color:var(--amber-700); font-style:italic; font-weight:400; }
        .about-lead { font-size:17px; color:var(--ink-600); line-height:1.75; max-width:680px; }
        .about-body { padding:56px 32px; }
        .about-grid { display:grid; grid-template-columns:1fr 1fr; gap:28px; margin-bottom:56px; }
        .about-card { background:var(--white); border:1px solid var(--ink-200); border-radius:var(--r-lg); padding:28px; }
        .about-card-icon { width:44px; height:44px; border-radius:var(--r-md); background:var(--navy-100); color:var(--navy-800); display:flex; align-items:center; justify-content:center; margin-bottom:16px; }
        .about-card-title { font-family:var(--font-display); font-size:20px; font-weight:500; color:var(--navy-900); letter-spacing:-0.01em; margin-bottom:8px; }
        .about-card-body { font-size:14px; color:var(--ink-600); line-height:1.7; }
        .about-section-title { font-family:var(--font-display); font-size:28px; font-weight:500; color:var(--navy-900); letter-spacing:-0.01em; margin-bottom:16px; }
        .about-section-body { font-size:15px; color:var(--ink-700); line-height:1.8; max-width:720px; margin-bottom:40px; }
        .about-cta { background:var(--navy-950); border-radius:var(--r-xl); padding:48px; display:flex; align-items:center; justify-content:space-between; gap:32px; flex-wrap:wrap; }
        .about-cta-title { font-family:var(--font-display); font-size:28px; font-weight:500; color:var(--white); letter-spacing:-0.01em; margin-bottom:8px; }
        .about-cta-title em { color:var(--amber-500); font-style:italic; font-weight:400; }
        .about-cta-sub { color:var(--navy-200); font-size:15px; }
        .about-cta-actions { display:flex; gap:12px; flex-wrap:wrap; flex-shrink:0; }
        .stat-row { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-bottom:56px; }
        .stat-tile { background:var(--white); border:1px solid var(--ink-200); border-radius:var(--r-lg); padding:24px 28px; }
        .stat-tile-value { font-family:var(--font-display); font-size:40px; font-weight:500; color:var(--navy-900); letter-spacing:-0.02em; line-height:1; margin-bottom:6px; }
        .stat-tile-label { font-size:13.5px; color:var(--ink-600); }
        @media(max-width:700px){ .about-grid{grid-template-columns:1fr;} .stat-row{grid-template-columns:1fr 1fr;} }
      `}</style>

      <PublicNav />

      <section className="about-hero">
        <div className="about-inner">
          <div className="about-eyebrow">About PaperBridge</div>
          <h1 className="about-title">Where research meets <em>peer review</em>.</h1>
          <p className="about-lead">PaperBridge is an academic journal management platform built to streamline manuscript submission, peer review, and publication — connecting authors, reviewers, and editors in one place.</p>
        </div>
      </section>

      <main className="about-body">
        <div className="about-inner">

          <div className="stat-row">
            {[
              { value: '1,247', label: 'Registered users across Malaysia' },
              { value: '320+',  label: 'Manuscripts reviewed to date' },
              { value: '98%',   label: 'Reviewer response rate' },
            ].map(s => (
              <div key={s.label} className="stat-tile">
                <div className="stat-tile-value">{s.value}</div>
                <div className="stat-tile-label">{s.label}</div>
              </div>
            ))}
          </div>

          <h2 className="about-section-title">What we do</h2>
          <p className="about-section-body">
            PaperBridge manages the full lifecycle of academic publishing — from the moment an author submits a manuscript to the day it's published. Our platform supports double-blind peer review, editorial decision workflows, revision management, and a public research library open to anyone.
          </p>

          <div className="about-grid">
            {[
              {
                title: 'For Authors',
                body:  'Submit manuscripts through a guided workflow, track review status in real time, respond to reviewer feedback, and manage revisions — all from one dashboard.',
                icon:  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>,
              },
              {
                title: 'For Reviewers',
                body:  'Receive manuscript assignments matched to your expertise, submit structured reviews with scoring and recommendations, and track your review history.',
                icon:  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
              },
              {
                title: 'For Editors',
                body:  'Manage incoming submissions, assign reviewers, monitor review progress, resolve disagreements, and make final editorial decisions with a complete audit trail.',
                icon:  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
              },
              {
                title: 'Open Research Library',
                body:  'Published papers are accessible to the public. Browse, search by category or keyword, preview abstracts, and download open-access publications without an account.',
                icon:  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
              },
            ].map(card => (
              <div key={card.title} className="about-card">
                <div className="about-card-icon">{card.icon}</div>
                <div className="about-card-title">{card.title}</div>
                <p className="about-card-body">{card.body}</p>
              </div>
            ))}
          </div>

          <div className="about-cta">
            <div>
              <div className="about-cta-title">Ready to get <em>started</em>?</div>
              <div className="about-cta-sub">Create an account or browse the research library — no sign-in required.</div>
            </div>
            <div className="about-cta-actions">
              <Link to="/" className="btn btn-outline-light">Browse Papers</Link>
              <Link to="/register" className="btn btn-accent">Create Account</Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
