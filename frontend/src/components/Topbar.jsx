import { useState } from 'react';
import { Link } from 'react-router-dom';

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  );
}

export default function Topbar({
  searchPlaceholder = 'Search...',
  actions,
  role,
  unreadCount = 0,
  onSearch,
  onOpenNav,
  helpTo,
}) {
  const [term, setTerm] = useState('');

  // Only a role that passes onSearch gets a working search; without it the
  // field submits nowhere, as before.
  const submit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(term.trim());
  };

  return (
    <header className="topbar">
      {onOpenNav && (
        <button className="icon-btn topbar-menu" title="Open menu" type="button" onClick={onOpenNav}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      )}
      <form className="topbar-search" role="search" onSubmit={submit}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          value={term}
          onChange={e => setTerm(e.target.value)}
        />
      </form>
      <div className="topbar-actions">
        {helpTo ? (
          <Link className="icon-btn" title="Help" to={helpTo}>
            <HelpIcon />
          </Link>
        ) : (
          <button className="icon-btn" title="Help" type="button">
            <HelpIcon />
          </button>
        )}
        <Link className="icon-btn" title="Notifications" to={role ? `/${role}/notifications` : '#'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
          </svg>
          {unreadCount > 0 && <span className="badge-dot"></span>}
        </Link>
        {actions}
      </div>
    </header>
  );
}
