import { Link } from 'react-router-dom';
import PublicNav from '../components/PublicNav.jsx';

const RESOURCES = [
  {
    type: 'Writing Aid',
    title: 'Abstract Checklist',
    description: 'Problem, objective, method, result, and conclusion checklist for research manuscripts.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    type: 'Discovery',
    title: 'Keyword Selection Guide',
    description: 'A quick guide for choosing 4–6 searchable keywords without becoming too broad or too narrow.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
    ),
  },
  {
    type: 'Reviewing',
    title: 'Reviewer Comment Template',
    description: 'A structured template for summary, strengths, major comments, minor comments, and recommendation.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/>
      </svg>
    ),
  },
  {
    type: 'Publishing',
    title: 'Submission Readiness Checklist',
    description: 'Final checks for references, figures, author details, ethics statements, and journal formatting.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    type: 'Reference',
    title: 'Citation Style Guide',
    description: 'Side-by-side comparison of APA, MLA, IEEE, and Chicago citation formats with examples.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
      </svg>
    ),
  },
  {
    type: 'Writing Aid',
    title: 'Research Gap Analysis Template',
    description: 'A framework for identifying, articulating, and positioning your research gap in the literature.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
];

const TYPE_COLORS = {
  'Writing Aid': { bg: 'var(--navy-100)',   color: 'var(--navy-800)'   },
  'Discovery':   { bg: 'var(--teal-50)',    color: 'var(--teal-800)'   },
  'Reviewing':   { bg: 'var(--amber-100)',  color: 'var(--amber-800)'  },
  'Publishing':  { bg: 'var(--purple-50)',  color: 'var(--purple-800)' },
  'Reference':   { bg: 'var(--green-50)',   color: 'var(--green-800)'  },
};

export default function ResourcesPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink-50)' }}>
      <style>{`
        .res-hero { background:var(--white); border-bottom:1px solid var(--ink-200); padding:64px 32px 48px; }
        .res-inner { max-width:1100px; margin:0 auto; }
        .res-eyebrow { font-family:var(--font-mono); font-size:11px; font-weight:500; letter-spacing:0.12em; text-transform:uppercase; color:var(--navy-700); margin-bottom:16px; }
        .res-title { font-family:var(--font-display); font-size:clamp(34px,5vw,50px); font-weight:500; line-height:1.06; letter-spacing:-0.02em; color:var(--navy-900); margin-bottom:16px; }
        .res-title em { color:var(--amber-700); font-style:italic; font-weight:400; }
        .res-lead { font-size:16px; color:var(--ink-600); line-height:1.75; max-width:600px; }
        .res-body { padding:48px 32px; }
        .res-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:18px; }
        .res-card { background:var(--white); border:1px solid var(--ink-200); border-radius:var(--r-lg); padding:24px; display:flex; flex-direction:column; gap:14px; transition:all var(--t-base); }
        .res-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); border-color:var(--ink-300); }
        .res-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
        .res-card-icon { width:40px; height:40px; border-radius:var(--r-md); display:flex; align-items:center; justify-content:center; flex-shrink:0; background:var(--navy-100); color:var(--navy-800); }
        .res-type { display:inline-flex; align-items:center; font-size:11.5px; font-weight:600; padding:3px 9px; border-radius:var(--r-pill); }
        .res-card-title { font-family:var(--font-display); font-size:18px; font-weight:500; color:var(--navy-900); letter-spacing:-0.01em; line-height:1.2; }
        .res-card-desc { font-size:13.5px; color:var(--ink-600); line-height:1.65; flex:1; }
        .res-card-footer { padding-top:14px; border-top:1px solid var(--ink-100); display:flex; gap:8px; }
        .res-cta { margin-top:48px; background:var(--navy-950); border-radius:var(--r-xl); padding:40px 48px; display:flex; align-items:center; justify-content:space-between; gap:28px; flex-wrap:wrap; }
        .res-cta-title { font-family:var(--font-display); font-size:24px; font-weight:500; color:var(--white); letter-spacing:-0.01em; margin-bottom:6px; }
        .res-cta-title em { color:var(--amber-500); font-style:italic; font-weight:400; }
        .res-cta-sub { color:var(--navy-200); font-size:14px; }
      `}</style>

      <PublicNav />

      <section className="res-hero">
        <div className="res-inner">
          <div className="res-eyebrow">Research Resources</div>
          <h1 className="res-title">Templates and <em>guides</em> for researchers.</h1>
          <p className="res-lead">Free reference materials to support your research writing, submission, and review process — no account required.</p>
        </div>
      </section>

      <main className="res-body">
        <div className="res-inner">
          <div className="res-grid">
            {RESOURCES.map(r => {
              const typeStyle = TYPE_COLORS[r.type] || TYPE_COLORS['Writing Aid'];
              return (
                <div key={r.title} className="res-card">
                  <div className="res-card-top">
                    <div className="res-card-icon">{r.icon}</div>
                    <span className="res-type" style={{ background: typeStyle.bg, color: typeStyle.color }}>
                      {r.type}
                    </span>
                  </div>
                  <div className="res-card-title">{r.title}</div>
                  <p className="res-card-desc">{r.description}</p>
                  <div className="res-card-footer">
                    <button className="btn btn-ghost btn-sm">Download</button>
                    <button className="btn btn-ghost btn-sm">Preview</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="res-cta fixed-palette">
            <div>
              <div className="res-cta-title">Access more with a <em>free account</em>.</div>
              <div className="res-cta-sub">Create an account to unlock training modules, track your progress, and discover papers.</div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
              <Link to="/" className="btn btn-outline-light">Browse Papers</Link>
              <Link to="/register" className="btn btn-accent">Create Account</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
