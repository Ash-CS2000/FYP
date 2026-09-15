// src/components/SearchField.jsx
// Inline filter box for admin list pages (Manage Users, Reviewer Approvals).
// Filtering is client-side against rows already fetched — this is a text input,
// not a query to the server.

import { useRef } from 'react';

export default function SearchField({ value, onChange, placeholder = 'Search…', label }) {
  const inputRef = useRef(null);

  return (
    <div className="search-field">
      <style>{`
        .search-field { position:relative; display:flex; align-items:center;
          flex:1; min-width:200px; max-width:320px; }
        .search-field > svg { position:absolute; left:11px; width:15px; height:15px;
          color:var(--ink-400); pointer-events:none; }
        .search-field input { width:100%; padding:8px 30px 8px 33px; font-size:13px;
          border:1px solid var(--ink-300); border-radius:var(--r-md); background:var(--white);
          color:var(--ink-900); outline:none; transition:all var(--t-fast); }
        .search-field input::placeholder { color:var(--ink-400); }
        .search-field input:focus { border-color:var(--navy-500); box-shadow:0 0 0 3px var(--navy-100); }
        .search-field-clear { position:absolute; right:7px; display:flex; align-items:center;
          justify-content:center; width:19px; height:19px; border-radius:50%; color:var(--ink-500);
          font-size:15px; line-height:1; transition:all var(--t-fast); }
        .search-field-clear:hover { background:var(--ink-100); color:var(--ink-800); }
        .search-field-clear:focus-visible { outline:2px solid var(--navy-500); outline-offset:2px; }
      `}</style>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape' && value) { e.preventDefault(); onChange(''); } }}
        placeholder={placeholder}
        aria-label={label || placeholder}
      />
      {value && (
        <button
          type="button"
          className="search-field-clear"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}
