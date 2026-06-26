import { Link } from 'react-router-dom';
import { TOPICS } from '../data/papers.js';
import PublicNav from '../components/PublicNav.jsx';

const TRENDING = [...TOPICS].sort((a, b) => b.rating - a.rating).slice(0, 3);

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Search & Discover',
    desc: 'Search research topics by keyword or discipline. See what areas are being studied and find inspiration for your own work.',
  },
  {
    step: '02',
    title: 'Explore Topics',
    desc: 'Read summaries of peer-reviewed research — institution, level, year, and rating — without access to full documents, to encourage original thinking.',
  },
  {
    step: '03',
    title: 'Learn & Grow',
    desc: 'Enrol in training modules, build research skills, and track your progress from your dashboard.',
  },
];

export default function HomePage() {
  const user = getUser();
  return (
    <div className="paper-portal">
      <style>{`
        .paper-portal {
          min-height: 100vh;
          background: var(--ink-50);
        }
        .portal-hero {
          background: linear-gradient(145deg, #fffdf8 0%, #f5f8ff 55%, #eef2ff 100%);
          border-bottom: 1px solid var(--ink-200);
          padding: 64px 32px 72px;
        }
        .portal-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .portal-hero-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .portal-heading {
          margin-bottom: 0;
        }
        .portal-heading h1 {
          font-family: var(--font-display);
          font-size: clamp(38px, 4.5vw, 56px);
          font-weight: 500;
          line-height: 1.04;
          letter-spacing: -0.03em;
          color: var(--navy-900);
          margin: 8px 0 12px;
        }
        .portal-heading h1 em {
          color: var(--amber-700);
          font-style: italic;
          font-weight: 400;
        }
        .portal-heading p {
          color: var(--ink-600);
          max-width: 480px;
          font-size: 16px;
          line-height: 1.65;
          margin-bottom: 24px;
        }

        /* Floating cards */
        .hero-cards { position: relative; height: 460px; }
        .hcard {
          position: absolute; background: #fff; border-radius: 16px;
          box-shadow: 0 8px 32px rgba(26,43,74,0.13), 0 1px 4px rgba(26,43,74,0.07);
          padding: 18px 20px; font-size: 13px; color: #1a2b4a; line-height: 1.5;
        }
        .hcard-1 { width: 268px; top: 0; left: 16px; transform: rotate(-4deg); z-index: 1; }
        .hcard-2 { width: 256px; top: 22px; left: 240px; transform: rotate(2.5deg); z-index: 3; }
        .hcard-3 { width: 298px; bottom: 52px; left: 60px; transform: rotate(1deg); z-index: 2; }
        .hcard-title { font-size: 13.5px; font-weight: 600; color: #1a2b4a; margin-bottom: 10px; line-height: 1.35; }
        .hcard-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f1f3f5; }
        .hcard-row:last-of-type { border-bottom: none; }
        .hcard-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; border-radius: 99px; padding: 3px 9px; }
        .hcard-pill-blue  { background: #dbeafe; color: #1d4ed8; }
        .hcard-pill-amber { background: #fef3c7; color: #c8851a; }
        .hcard-avatar { width: 26px; height: 26px; border-radius: 50%; background: #1a2b4a; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .hcard-track { height: 5px; border-radius: 99px; background: #e9ecef; margin: 10px 0 6px; overflow: hidden; }
        .hcard-fill  { height: 100%; border-radius: 99px; }
        .hcard-label { font-size: 11px; color: #8493a6; margin-bottom: 2px; }
        .hcard-cat-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #1a2b4a; font-weight: 500; padding: 3px 0; }
        .hcard-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .hcard-icon-sq { width: 32px; height: 32px; border-radius: 8px; background: #fef3c7; color: #c8851a; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .hcard-caption { font-size: 11.5px; color: #8493a6; margin-top: 8px; }
        .hcard-green { font-size: 11.5px; font-weight: 600; color: #2e8b57; }
        .hcard-amber { font-size: 11.5px; font-weight: 600; color: #c8851a; }
        .hcard-name  { font-size: 12px; color: #1a2b4a; }

        @media (max-width: 960px) {
          .portal-hero-inner { grid-template-columns: 1fr; }
          .hero-cards { display: none; }
        }

        /* Trending */
        .trending-section {
          padding: 32px 32px 0;
        }
        .trending-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .trending-header h2 {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 500;
          color: var(--navy-900);
          letter-spacing: -0.01em;
        }
        .trending-badge {
          background: var(--amber-700);
          color: var(--white);
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: var(--r-pill);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .trending-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .trending-card {
          background: var(--white);
          border: 1px solid var(--ink-200);
          border-radius: var(--r-lg);
          padding: 18px 20px;
          display: flex;
          gap: 14px;
          align-items: flex-start;
          transition: all var(--t-base);
          cursor: default;
        }
        .trending-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--amber-300, #fcd34d);
        }
        .trending-rank {
          font-family: var(--font-display);
          font-size: 36px;
          font-weight: 700;
          color: var(--ink-200);
          line-height: 1;
          min-width: 40px;
          letter-spacing: -0.04em;
        }
        .trending-rank.rank-1 { color: var(--amber-400, #f59e0b); }
        .trending-rank.rank-2 { color: var(--ink-300); }
        .trending-rank.rank-3 { color: var(--ink-200); }
        .trending-info {
          flex: 1;
          min-width: 0;
        }
        .trending-info h3 {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 500;
          color: var(--navy-900);
          line-height: 1.3;
          margin-bottom: 6px;
          letter-spacing: -0.01em;
        }
        .trending-meta {
          color: var(--ink-500);
          font-size: 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .trending-downloads {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: var(--amber-700);
        }

        /* How It Works */
        .how-it-works {
          background: var(--white);
          border-top: 1px solid var(--ink-200);
          padding: 56px 32px;
          margin-top: 32px;
        }
        .how-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .how-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .how-header h2 {
          font-family: var(--font-display);
          font-size: 32px;
          font-weight: 500;
          color: var(--navy-900);
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }
        .how-header p {
          color: var(--ink-500);
          font-size: 15px;
        }
        .how-steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
        }
        .how-step {
          background: var(--ink-50);
          border: 1px solid var(--ink-200);
          border-radius: var(--r-lg);
          padding: 28px 24px;
        }
        .how-step-number {
          font-family: var(--font-display);
          font-size: 48px;
          font-weight: 700;
          color: var(--ink-200);
          line-height: 1;
          margin-bottom: 12px;
          letter-spacing: -0.04em;
        }
        .how-step h3 {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 500;
          color: var(--navy-900);
          margin-bottom: 8px;
        }
        .how-step p {
          color: var(--ink-600);
          font-size: 14px;
          line-height: 1.65;
        }

        /* Footer */
        .site-footer {
          background: var(--navy-900);
          color: rgba(255,255,255,0.75);
          padding: 56px 32px 0;
          margin-top: 0;
        }
        .footer-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .footer-top {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
          padding-bottom: 48px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .footer-brand .brand-mark {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 600;
          color: var(--white);
          letter-spacing: -0.02em;
          display: block;
          margin-bottom: 4px;
        }
        .footer-brand .brand-sub {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.4);
          display: block;
          margin-bottom: 16px;
        }
        .footer-brand p {
          font-size: 13.5px;
          line-height: 1.7;
          color: rgba(255,255,255,0.55);
          max-width: 280px;
          margin-bottom: 20px;
        }
        .footer-contact-item {
          font-size: 12.5px;
          color: rgba(255,255,255,0.5);
          margin-bottom: 6px;
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .footer-col h4 {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.4);
          margin-bottom: 16px;
        }
        .footer-col a {
          display: block;
          font-size: 13.5px;
          color: rgba(255,255,255,0.65);
          text-decoration: none;
          margin-bottom: 10px;
          transition: color 0.15s;
        }
        .footer-col a:hover { color: var(--white); }
        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0;
          gap: 16px;
          flex-wrap: wrap;
        }
        .footer-copy {
          font-size: 12.5px;
          color: rgba(255,255,255,0.35);
        }
        .footer-legal {
          display: flex;
          gap: 20px;
        }
        .footer-legal a {
          font-size: 12.5px;
          color: rgba(255,255,255,0.35);
          text-decoration: none;
          transition: color 0.15s;
        }
        .footer-legal a:hover { color: rgba(255,255,255,0.7); }

        @media (max-width: 900px) {
          .footer-top { grid-template-columns: 1fr 1fr; gap: 32px; }
        }
        @media (max-width: 760px) {
          .portal-heading { grid-template-columns: 1fr; }
          .portal-actions { justify-content: flex-start; }

          .trending-grid { grid-template-columns: 1fr; }
          .footer-top { grid-template-columns: 1fr; gap: 28px; }
          .footer-bottom { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <PublicNav />

      <section className="portal-hero">
        <div className="portal-inner">
          <div className="portal-hero-inner">

            {/* Left — text */}
            <div className="portal-heading">
              <span className="eyebrow">Public Research Library</span>
              <h1>Explore research topics, learn methods, and build your <em>research skills</em>.</h1>
              <p>Discover what researchers are studying, read peer-reviewed summaries, and find inspiration to conduct your own original research.</p>
              {user
                ? <Link to="/search" className="btn btn-primary">Browse Topics</Link>
                : <Link to="/register" className="btn btn-primary">Join Us</Link>}
            </div>

            {/* Right — floating cards */}
            <div className="hero-cards">

              {/* Card 1 — Manuscript */}
              <div className="hcard hcard-1">
                <div style={{ marginBottom: 10 }}>
                  <span className="hcard-pill hcard-pill-blue">
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    AI Classifier
                  </span>
                </div>
                <div className="hcard-title">Deep Learning Methods in Medical Imaging</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <div className="hcard-avatar">AR</div>
                  <span style={{ fontSize:11.5, color:'#8493a6' }}>Ahmad Razif · 12 min ago</span>
                </div>
                <div className="hcard-label">Category confidence</div>
                <div className="hcard-track">
                  <div className="hcard-fill" style={{ width:'82%', background:'#3b82f6' }} />
                </div>
                <div className="hcard-cat-row"><span className="hcard-dot" style={{ background:'#3b82f6' }} />Computer Science</div>
                <div className="hcard-cat-row"><span className="hcard-dot" style={{ background:'#8b5cf6' }} />Medicine</div>
              </div>

              {/* Card 2 — Review Progress */}
              <div className="hcard hcard-2">
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <span style={{ fontSize:13.5, fontWeight:600, color:'#1a2b4a' }}>Review Progress</span>
                  <span className="hcard-pill hcard-pill-amber">
                    <span style={{ width:6, height:6, borderRadius:'50%', background:'#c8851a', display:'inline-block' }} />
                    In Review
                  </span>
                </div>
                {[
                  { name:'Reviewer 1 · Dr. Lim',  status:'Approved', cls:'hcard-green' },
                  { name:'Reviewer 2 · Prof. Tan', status:'Approved', cls:'hcard-green' },
                  { name:'Reviewer 3 · Dr. Chen',  status:'Pending',  cls:'hcard-amber' },
                ].map(r => (
                  <div className="hcard-row" key={r.name}>
                    <span className="hcard-name">{r.name}</span>
                    <span className={r.cls}>{r.status}</span>
                  </div>
                ))}
                <div className="hcard-track">
                  <div className="hcard-fill" style={{ width:'66%', background:'#2e8b57' }} />
                </div>
                <div className="hcard-caption">2 of 3 reviews completed</div>
              </div>

              {/* Card 3 — Reminder */}
              <div className="hcard hcard-3">
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div className="hcard-icon-sq">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:6 }}>
                      <span style={{ fontWeight:600, color:'#1a2b4a', fontSize:13.5 }}>Reminder sent</span>
                      <span style={{ fontSize:11.5, color:'#8493a6' }}>Auto-followup · 3 days</span>
                    </div>
                    <p style={{ fontSize:12.5, color:'#5a6a80', lineHeight:1.6, margin:0 }}>
                      Reviewer hasn't responded — replacement will be assigned in 24 hours if no action.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Trending This Week */}
      <section className="trending-section">
        <div className="portal-inner">
          <div className="trending-header">
            <h2>Trending Research Topics</h2>
            <span className="trending-badge">Top Rated</span>
          </div>
          <div className="trending-grid">
            {TRENDING.map((t, i) => (
              <div className="trending-card" key={t.id}>
                <span className={`trending-rank rank-${i + 1}`}>{String(i + 1).padStart(2, '0')}</span>
                <div className="trending-info">
                  <h3>{t.topic}</h3>
                  <div className="trending-meta">
                    <span>{t.institution}</span>
                    <span>{t.area}</span>
                    <span>{t.level} · {t.year}</span>
                  </div>
                  <div className="trending-downloads" style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
                    {[1,2,3,4,5].map(n => (
                      <svg key={n} width="13" height="13" viewBox="0 0 20 20" style={{ color: n <= t.rating ? '#f59e0b' : 'var(--ink-200)', fill: 'currentColor' }} aria-hidden="true">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="how-inner">
          <div className="how-header">
            <h2>How It Works</h2>
            <p>Get started with PaperBridge in three simple steps.</p>
          </div>
          <div className="how-steps">
            {HOW_IT_WORKS.map((step) => (
              <div className="how-step" key={step.step}>
                <div className="how-step-number">{step.step}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <span className="brand-mark">PaperBridge</span>
              <span className="brand-sub">Research Portal</span>
              <p>A centralised platform for discovering, accessing, and publishing academic research. Built for researchers, students, and institutions.</p>
              <div className="footer-contact-item">✉ support@paperbridge.edu.my</div>
              <div className="footer-contact-item">📍 Kuala Lumpur, Malaysia</div>
            </div>

            <div className="footer-col">
              <h4>Explore</h4>
              <Link to="/search">Browse Topics</Link>
              <Link to="/search?category=Computer+Science">Computer Science</Link>
              <Link to="/search?category=Engineering">Engineering</Link>
              <Link to="/search?category=Physics">Physics</Link>
              <Link to="/search?category=Linguistics">Linguistics</Link>
            </div>

            <div className="footer-col">
              <h4>Platform</h4>
              <Link to="/about">About Us</Link>
              <Link to="/resources">Resources</Link>
              <Link to="/register">Create Account</Link>
              <Link to="/login">Sign In</Link>
              <Link to="/author/training">Training Modules</Link>
            </div>

            <div className="footer-col">
              <h4>For Researchers</h4>
              <Link to="/register">Submit a Paper</Link>
              <Link to="/author/dashboard">Author Dashboard</Link>
              <Link to="/reviewer/dashboard">Reviewer Portal</Link>
              <Link to="/about">Editorial Board</Link>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="footer-copy">© {new Date().getFullYear()} PaperBridge Research Portal. All rights reserved.</span>
            <div className="footer-legal">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Use</Link>
              <Link to="/contact">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
