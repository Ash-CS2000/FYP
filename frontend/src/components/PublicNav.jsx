import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const WORKSPACE = {
  student:  { label: 'Training',       route: '/student/training' },
  author:   { label: 'My Work',        route: '/author/dashboard' },
  reviewer: { label: 'My Reviews',     route: '/reviewer/dashboard' },
  editor:   { label: 'Editorial Desk', route: '/editor/dashboard' },
  admin:    { label: 'Control Panel',  route: '/admin/dashboard' },
};

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

export default function PublicNav() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = getUser();
  const workspace = user ? WORKSPACE[user.role] : null;

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    navigate(`/search?${params.toString()}`);
    setQuery('');
  }

  function handleSignOut() {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    navigate('/');
  }

  return (
    <nav className="public-nav">
      <div className="public-nav-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">PaperBridge</span>
          <span className="brand-sub">Research Portal</span>
        </Link>
        <div className="public-nav-links">
          <Link to="/" className={pathname === '/' ? 'active' : ''}>Home</Link>
          <Link to="/about" className={pathname === '/about' ? 'active' : ''}>About</Link>
          <Link to="/resources" className={pathname === '/resources' ? 'active' : ''}>Resources</Link>
        </div>
        <form className="nav-search-mini" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Search papers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" aria-label="Search">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </form>
        <div className="public-nav-cta">
          {user ? (
            <>
              {workspace && (
                <Link to={workspace.route} className="btn btn-accent btn-sm">
                  {workspace.label}
                </Link>
              )}
              <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
