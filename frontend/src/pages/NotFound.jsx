import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FBFCFE 0%, #F1F4F8 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -200, right: -200, width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(239,159,39,0.10) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -300, left: -200, width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(24,95,165,0.08) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 640, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <Link to="/" className="brand" style={{ justifyContent: 'center', marginBottom: 48 }}>
          <span className="brand-mark" style={{ color: 'var(--navy-900)' }}>PaperBridge</span>
          <span className="brand-sub" style={{ color: 'var(--amber-700)' }}>Research Portal</span>
        </Link>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(120px, 20vw, 200px)',
          fontWeight: 500,
          lineHeight: 0.9,
          color: 'var(--navy-900)',
          letterSpacing: '-0.04em',
          marginBottom: 8,
        }}>
          4<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--amber-700)' }}>0</em>4
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 500,
          color: 'var(--navy-900)',
          letterSpacing: '-0.02em',
          marginBottom: 16,
        }}>
          This page is <em className="serif-italic" style={{ color: 'var(--amber-700)' }}>missing</em> from the archive.
        </h1>

        <p style={{
          fontSize: 16, color: 'var(--ink-600)', lineHeight: 1.6,
          maxWidth: 480, margin: '0 auto 36px',
        }}>
          The page you're looking for doesn't exist, or it may have moved.
          Let's get you back to somewhere useful.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary">← Back to Home</Link>
          <button onClick={() => navigate(-1)} className="btn btn-ghost">Go back</button>
        </div>

        <div style={{
          marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--ink-200)',
          display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap',
          fontSize: 13.5,
        }}>
          <Link to="/author/training" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Training Modules</Link>
          <Link to="/author/dashboard" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Author Dashboard</Link>
          <Link to="/reviewer/dashboard" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Reviewer Dashboard</Link>
          <Link to="/editor/dashboard" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Editor Dashboard</Link>
          <Link to="/admin/dashboard" style={{ color: 'var(--navy-700)', fontWeight: 500 }}>Admin Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
