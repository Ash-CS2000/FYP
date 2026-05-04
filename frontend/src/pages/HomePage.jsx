import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div style={{ background: 'var(--white)' }}>
      <style>{`
        .hero {
          position: relative;
          background: linear-gradient(180deg, #FBFCFE 0%, #F1F4F8 100%);
          padding: 80px 32px 100px;
          overflow: hidden;
        }
        .hero::before {
          content: ""; position: absolute; top: -200px; right: -200px;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(239,159,39,0.08) 0%, transparent 70%);
          border-radius: 50%;
        }
        .hero::after {
          content: ""; position: absolute; bottom: -300px; left: -200px;
          width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(24,95,165,0.06) 0%, transparent 70%);
          border-radius: 50%;
        }
        .hero-inner {
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 1.1fr 0.9fr;
          gap: 80px; align-items: center;
          position: relative; z-index: 1;
        }
        .hero h1 {
          font-family: var(--font-display);
          font-size: clamp(40px, 6vw, 68px);
          font-weight: 500; color: var(--navy-900);
          line-height: 1; letter-spacing: -0.035em;
          margin-bottom: 28px;
        }
        .hero h1 em { font-style: italic; font-weight: 400; color: var(--amber-700); }
        .hero-lead { font-size: 18px; color: var(--ink-700); line-height: 1.6; margin-bottom: 36px; max-width: 540px; }
        .hero-eyebrow { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 28px; }
        .hero-eyebrow .dot { width: 8px; height: 8px; background: var(--amber-500); border-radius: 50%; box-shadow: 0 0 0 4px rgba(239,159,39,0.18); }
        .hero-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .hero-actions .btn { padding: 14px 26px; font-size: 14.5px; }
        .hero-trust { margin-top: 48px; padding-top: 28px; border-top: 1px solid var(--ink-200); display: flex; gap: 36px; align-items: center; flex-wrap: wrap; }
        .hero-trust-item .num { font-family: var(--font-display); font-size: 28px; font-weight: 500; color: var(--navy-900); line-height: 1; letter-spacing: -0.02em; }
        .hero-trust-item .lbl { font-size: 12px; color: var(--ink-600); margin-top: 4px; }
        .hero-visual { position: relative; height: 520px; }
        .visual-card { position: absolute; background: var(--white); border-radius: var(--r-lg); box-shadow: var(--shadow-xl); padding: 22px; border: 1px solid var(--ink-200); }
        .visual-card-1 { top: 0; left: 0; width: 320px; transform: rotate(-3deg); }
        .visual-card-2 { top: 100px; right: 0; width: 290px; transform: rotate(2deg); z-index: 2; }
        .visual-card-3 { bottom: 20px; left: 60px; width: 280px; transform: rotate(-1deg); }
        .vc-title { font-weight: 600; color: var(--navy-900); font-size: 14px; margin-bottom: 10px; }
        .vc-meta { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--ink-600); margin-bottom: 14px; }
        .vc-bar { height: 6px; background: var(--ink-100); border-radius: var(--r-pill); overflow: hidden; margin-bottom: 8px; }
        .vc-bar > div { height: 100%; background: var(--accent, var(--navy-700)); border-radius: var(--r-pill); }
        .vc-row { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--ink-600); padding: 6px 0; border-bottom: 1px dashed var(--ink-100); }
        .vc-row:last-child { border: none; }
        .vc-row strong { color: var(--navy-900); font-weight: 600; }
        .vc-ai-badge { display: inline-flex; align-items: center; gap: 6px; background: var(--navy-100); color: var(--navy-800); padding: 4px 10px; border-radius: var(--r-pill); font-size: 11px; font-weight: 600; }

        section { padding: 100px 32px; }
        .section-inner { max-width: 1280px; margin: 0 auto; }
        .section-header { text-align: center; max-width: 720px; margin: 0 auto 56px; }
        .section-header h2 {
          font-family: var(--font-display);
          font-size: clamp(32px, 4vw, 44px);
          font-weight: 500; color: var(--navy-900);
          letter-spacing: -0.02em; line-height: 1.1;
          margin: 14px 0 16px;
        }
        .section-header h2 em { font-style: italic; font-weight: 400; color: var(--amber-700); }
        .section-header p { font-size: 16px; color: var(--ink-600); line-height: 1.6; }

        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        .feature { padding: 32px; background: var(--white); border: 1px solid var(--ink-200); border-radius: var(--r-lg); transition: all var(--t-base); }
        .feature:hover { transform: translateY(-4px); border-color: var(--navy-700); box-shadow: var(--shadow-lg); }
        .feature-icon { width: 52px; height: 52px; border-radius: var(--r-md); background: var(--navy-100); color: var(--navy-800); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; transition: all var(--t-base); }
        .feature:hover .feature-icon { background: var(--amber-500); color: var(--navy-900); }
        .feature-icon svg { width: 24px; height: 24px; }
        .feature h3 { font-family: var(--font-display); font-weight: 500; font-size: 22px; color: var(--navy-900); letter-spacing: -0.01em; margin-bottom: 10px; }
        .feature p { color: var(--ink-700); line-height: 1.6; font-size: 14.5px; }

        .workflow { background: var(--navy-950); color: var(--navy-100); position: relative; overflow: hidden; }
        .workflow::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 20% 30%, rgba(239,159,39,0.08), transparent 50%), radial-gradient(circle at 80% 70%, rgba(55,138,221,0.10), transparent 50%); }
        .workflow .section-header h2 { color: var(--white); }
        .workflow .section-header p { color: var(--navy-200); }
        .workflow .eyebrow { color: var(--amber-500); }
        .workflow-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; position: relative; z-index: 1; }
        .wf-step { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--r-lg); padding: 28px; backdrop-filter: blur(10px); }
        .wf-num { font-family: var(--font-display); font-size: 56px; font-weight: 500; color: var(--amber-500); line-height: 1; letter-spacing: -0.04em; margin-bottom: 16px; opacity: 0.9; }
        .wf-step h3 { font-family: var(--font-display); font-weight: 500; font-size: 19px; color: var(--white); margin-bottom: 8px; letter-spacing: -0.01em; }
        .wf-step p { color: var(--navy-200); font-size: 13.5px; line-height: 1.6; }

        .cta { background: linear-gradient(135deg, var(--navy-900) 0%, var(--navy-800) 100%); color: var(--white); text-align: center; border-radius: var(--r-xl); padding: 72px 40px; margin: 0 32px; position: relative; overflow: hidden; }
        .cta::before { content: ""; position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(239,159,39,0.15), transparent 70%); border-radius: 50%; }
        .cta-inner { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; }
        .cta h2 { font-family: var(--font-display); font-size: clamp(32px, 4.5vw, 48px); font-weight: 500; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 20px; }
        .cta h2 em { font-style: italic; font-weight: 400; color: var(--amber-500); }
        .cta p { font-size: 17px; color: var(--navy-200); margin-bottom: 36px; line-height: 1.6; }

        footer.site-footer { padding: 60px 32px 40px; background: var(--navy-950); color: var(--navy-200); }
        .footer-inner { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 40px; }
        .footer-brand .brand-mark { color: var(--white); font-size: 24px; }
        .footer-brand p { margin-top: 16px; font-size: 13.5px; color: var(--navy-300); line-height: 1.6; max-width: 320px; }
        .footer-col h4 { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--amber-500); margin-bottom: 16px; font-weight: 500; }
        .footer-col a { display: block; font-size: 13.5px; color: var(--navy-200); padding: 5px 0; transition: color var(--t-fast); }
        .footer-col a:hover { color: var(--white); }
        .footer-bottom { max-width: 1280px; margin: 0 auto; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: var(--navy-300); }

        @media (max-width: 900px) {
          .hero-inner { grid-template-columns: 1fr; gap: 40px; }
          .hero-visual { height: 420px; }
          .features-grid { grid-template-columns: 1fr; }
          .workflow-grid { grid-template-columns: repeat(2, 1fr); }
          .footer-inner { grid-template-columns: 1fr 1fr; gap: 32px; }
        }
      `}</style>

      <nav className="public-nav">
        <div className="public-nav-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">JSRMS</span>
            <span className="brand-sub">Research Portal</span>
          </Link>
          <div className="public-nav-links">
            <Link to="/" className="active">Home</Link>
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <Link to="/author/dashboard">Author</Link>
            <Link to="/reviewer/dashboard">Reviewer</Link>
            <Link to="/editor/dashboard">Editor</Link>
            <Link to="/admin/dashboard">Admin</Link>
          </div>
          <div className="public-nav-cta">
            <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-inner">
          <div>
            <div className="hero-eyebrow">
              <span className="dot"></span>
              <span className="eyebrow">AI-Assisted Academic Publishing</span>
            </div>
            <h1>Where research finds its <em>readers</em>—faster.</h1>
            <p className="hero-lead">JSRMS streamlines the entire journal lifecycle: from manuscript submission and AI-assisted classification to peer review and editorial decisions—built for researchers, reviewers, and editors who value rigor and speed.</p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-accent">Submit a Paper →</Link>
              <a href="#workflow" className="btn btn-ghost">See How It Works</a>
            </div>
            <div className="hero-trust">
              <div className="hero-trust-item"><div className="num">500+</div><div className="lbl">Papers Published</div></div>
              <div className="hero-trust-item"><div className="num">1,200+</div><div className="lbl">Active Authors</div></div>
              <div className="hero-trust-item"><div className="num">14 days</div><div className="lbl">Avg. Review Time</div></div>
              <div className="hero-trust-item"><div className="num">95%</div><div className="lbl">On-Time Reviews</div></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-card visual-card-1" style={{ '--accent': 'var(--navy-700)' }}>
              <div className="row" style={{ marginBottom: 14 }}>
                <div className="vc-ai-badge">AI Classifier</div>
              </div>
              <div className="vc-title">Deep Learning Methods in Medical Imaging</div>
              <div className="vc-meta">
                <span className="avatar avatar-sm">AR</span>
                <span>Ahmad Razif · 12 min ago</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-600)', marginBottom: 6 }}>Category confidence</div>
              <div className="vc-bar"><div style={{ width: '92%' }}></div></div>
              <div className="vc-row"><span>Computer Science</span><strong>92%</strong></div>
              <div className="vc-row"><span>Medicine</span><strong>78%</strong></div>
            </div>
            <div className="visual-card visual-card-2" style={{ '--accent': 'var(--teal-500)' }}>
              <div className="vc-title row" style={{ justifyContent: 'space-between' }}>
                <span>Review Progress</span>
                <span className="pill pill-review">In Review</span>
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="vc-row"><span>Reviewer 1 · Dr. Lim</span><strong style={{ color: 'var(--teal-700)' }}>Approved</strong></div>
                <div className="vc-row"><span>Reviewer 2 · Prof. Tan</span><strong style={{ color: 'var(--teal-700)' }}>Approved</strong></div>
                <div className="vc-row"><span>Reviewer 3 · Dr. Chen</span><strong style={{ color: 'var(--amber-700)' }}>Pending</strong></div>
              </div>
              <div className="vc-bar" style={{ marginTop: 12 }}><div style={{ width: '67%' }}></div></div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-600)', marginTop: 6 }}>2 of 3 reviews completed</div>
            </div>
            <div className="visual-card visual-card-3" style={{ '--accent': 'var(--amber-500)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FAEEDA', color: 'var(--amber-800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-900)' }}>Reminder sent</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-600)' }}>Auto-followup · 3 days</div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-700)', lineHeight: 1.5 }}>Reviewer hasn't responded—replacement will be assigned in 24 hours if no action.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="section-inner">
          <div className="section-header">
            <span className="eyebrow">Built for the publication lifecycle</span>
            <h2>Every step, <em>handled</em>.</h2>
            <p>From the moment a manuscript is submitted to the day it's published, JSRMS keeps work moving with intelligent automation and human oversight where it matters most.</p>
          </div>
          <div className="features-grid">
            {[
              { title: 'AI Classification', desc: 'Machine learning models analyze your abstract and automatically suggest the right research category—with confidence scores you can verify.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2L4 6v12l8 4 8-4V6l-8-4z"/><path d="M12 2v20M4 6l8 4 8-4"/></svg> },
              { title: 'Smart Reviewer Matching', desc: 'Match papers with three qualified reviewers based on expertise, availability, and conflict-of-interest checks—automatically.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="17" cy="11" r="3"/><path d="M22 21v-1a3 3 0 00-3-3"/></svg> },
              { title: 'Automated Reminders', desc: 'Nothing falls through the cracks. Reminder cycles, deadline tracking, and replacement-reviewer escalation work in the background.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
              { title: 'Editorial Oversight', desc: 'Chief editors get a clear view of every review and the tools to make confident final decisions—with full audit trails.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
              { title: 'Threaded Discussions', desc: 'Authors, reviewers, and editors stay in sync through structured, threaded conversations attached to every submission.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
              { title: 'Student Track', desc: 'A dedicated submission flow for student research from schools and universities, with mentorship-friendly review guidelines.', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> },
            ].map((f) => (
              <div className="feature" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="workflow">
        <div className="section-inner">
          <div className="section-header">
            <span className="eyebrow">The four-stage pipeline</span>
            <h2>From submission to <em>publication</em>.</h2>
            <p>A transparent workflow with checkpoints at every stage—so authors always know where their paper stands.</p>
          </div>
          <div className="workflow-grid">
            <div className="wf-step"><div className="wf-num">01</div><h3>Submit</h3><p>Author uploads the manuscript. AI suggests the research category and confirms compliance with submission rules.</p></div>
            <div className="wf-step"><div className="wf-num">02</div><h3>Review</h3><p>Three reviewers are matched and assigned. The system tracks deadlines and sends reminders without manual chasing.</p></div>
            <div className="wf-step"><div className="wf-num">03</div><h3>Decide</h3><p>If reviewers agree, the decision is automatic. If they disagree, the chief editor steps in with full context.</p></div>
            <div className="wf-step"><div className="wf-num">04</div><h3>Publish</h3><p>Approved papers move into the publication archive—indexed, searchable, and accessible to the community.</p></div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 60 }}>
        <div className="cta">
          <div className="cta-inner">
            <h2>Ready to publish your <em>research</em>?</h2>
            <p>Join over a thousand authors and reviewers who use JSRMS to move their work forward—without the email back-and-forth.</p>
            <div className="hero-actions" style={{ justifyContent: 'center' }}>
              <Link to="/register" className="btn btn-accent">Create an Account</Link>
              <Link to="/login" className="btn btn-outline-light">Sign In</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="brand-mark">JSRMS</div>
            <p>An AI-assisted journal submission and review management platform for academic institutions and independent journals.</p>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <Link to="/author/submit">Submit Paper</Link>
            <Link to="/reviewer/dashboard">For Reviewers</Link>
            <Link to="/editor/dashboard">Editorial Team</Link>
            <Link to="/admin/dashboard">Administration</Link>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href="#">Author Guidelines</a>
            <a href="#">Review Standards</a>
            <a href="#">FAQ</a>
            <a href="#">Support</a>
          </div>
          <div className="footer-col">
            <h4>Institution</h4>
            <a href="#">About JSRMS</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 JSRMS Research Portal. All rights reserved.</span>
          <span>Built for academic excellence.</span>
        </div>
      </footer>
    </div>
  );
}
