import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { API_URL } from '../config';

const WORKSPACE_ROUTES = {
  author:   '/author/dashboard',
  reviewer: '/reviewer/dashboard',
  editor:   '/editor/dashboard',
  admin:    '/admin/dashboard',
};

function landingRoute(user) {
  const roles = user?.roles || [];
  if (roles.length > 1) return '/select-workspace';
  return WORKSPACE_ROUTES[roles[0] || user?.role] || '/';
}

export default function OrcidCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading' | 'error'
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      const returnedState = searchParams.get('state');
      const orcidError = searchParams.get('error');

      if (orcidError) {
        setStatus('error');
        setError('ORCID authorization was cancelled or denied.');
        return;
      }

      const savedState = sessionStorage.getItem('orcid_state');

      if (!code || !returnedState) {
        setStatus('error');
        setError('Missing authorization code from ORCID.');
        return;
      }

      if (returnedState !== savedState) {
        setStatus('error');
        setError('State mismatch — possible security issue. Please try again.');
        return;
      }

      sessionStorage.removeItem('orcid_state');

      try {
        const existingAccess = localStorage.getItem('access');

        const res = await fetch(`${API_URL}/api/users/orcid/callback/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(existingAccess ? { Authorization: `Bearer ${existingAccess}` } : {}),
          },
          body: JSON.stringify({ code, state: returnedState }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.detail || 'ORCID authentication failed.');
        }

        // Logged-in user linking/adding a role via ORCID (no new tokens issued)
        if (data.detail && data.user && !data.access) {
          localStorage.setItem('user', JSON.stringify(data.user));
          navigate(landingRoute(data.user), {
            state: data.already_registered
              ? { message: 'This ORCID iD is already registered for this role.' }
              : { orcidLinked: true },
          });
          return;
        }

        // Fresh login/registration via ORCID (new tokens issued)
        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate(landingRoute(data.user));

      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    }

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="orcid-callback-page">
      <style>{`
        .orcid-callback-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--white);
          padding: 24px;
        }
        .occ-card { max-width: 420px; width: 100%; text-align: center; }
        .occ-spinner {
          width: 40px; height: 40px;
          border: 3px solid var(--ink-200);
          border-top-color: var(--navy-700);
          border-radius: 50%;
          margin: 0 auto 20px;
          animation: occ-spin 0.8s linear infinite;
        }
        @keyframes occ-spin { to { transform: rotate(360deg); } }
        .occ-title { font-family: var(--font-display); font-size: 22px; font-weight: 500; color: var(--navy-900); margin-bottom: 8px; }
        .occ-body { color: var(--ink-600); font-size: 14px; line-height: 1.6; }
        .occ-error-icon {
          width: 48px; height: 48px; border-radius: 50%;
          background: var(--red-50); color: var(--red-700);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px; font-size: 22px;
        }
        .occ-link { display: inline-block; margin-top: 18px; color: var(--navy-700); font-weight: 600; }
      `}</style>

      <div className="occ-card">
        {status === 'loading' && (
          <>
            <div className="occ-spinner" />
            <h1 className="occ-title">Verifying your ORCID iD…</h1>
            <p className="occ-body">Please wait while we complete your authentication.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="occ-error-icon">!</div>
            <h1 className="occ-title">Something went wrong</h1>
            <p className="occ-body">{error}</p>
            <Link to="/register" className="occ-link">← Back to registration</Link>
          </>
        )}
      </div>
    </div>
  );
}