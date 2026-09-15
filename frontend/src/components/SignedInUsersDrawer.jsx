// src/components/SignedInUsersDrawer.jsx
// Who is signed in — opened from the "Signed-in users" tile on the admin dashboard.

import { useEffect, useRef, useState } from 'react';
import Drawer from './Drawer.jsx';
import Avatar from './Avatar.jsx';
import SearchField from './SearchField.jsx';
import Pagination from './Pagination.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { listSignedInUsers, USERS_PAGE_SIZE } from '../api/admin.js';
import { timeAgo, fullDateTime, recencyGroup } from '../utils/time.js';

const ROLE_CHIPS = [
  { id: '',         label: 'Everyone' },
  { id: 'author',   label: 'Authors' },
  { id: 'reviewer', label: 'Reviewers' },
  { id: 'editor',   label: 'Editors' },
  { id: 'admin',    label: 'Admins' },
];

export default function SignedInUsersDrawer({ open, onClose }) {
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 300);
  const key = `${role}|${query}`;
  const [pageState, setPageState] = useState({ key, page: 1 });
  if (pageState.key !== key) setPageState({ key, page: 1 });
  const page = pageState.key === key ? pageState.page : 1;

  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | refreshing | error
  const seq = useRef(0);
  const bodyTop = useRef(null);

  useEffect(() => {
    if (!open) return;
    const mine = ++seq.current;
    setState(prev => (prev === 'ready' || prev === 'refreshing' ? 'refreshing' : 'loading'));
    listSignedInUsers({ page, search: query, role })
      .then(res => { if (mine === seq.current) { setData(res); setState('ready'); } })
      .catch(() => { if (mine === seq.current) setState('error'); });
  }, [open, key, page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start fresh each time the panel opens.
  useEffect(() => {
    if (open) return;
    setRole(''); setSearch(''); setData(null); setState('loading');
  }, [open]);

  const counts = data?.counts;
  const total = data?.total ?? 0;
  const days = data?.window_days ?? 7;

  // Group the page by recency, keeping the server's newest-first order.
  const groups = [];
  for (const u of data?.results || []) {
    const label = recencyGroup(u.last_signed_in);
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, users: [] });
    groups[groups.length - 1].users.push(u);
  }

  const footer = (
    <p className="siu-note">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
      </svg>
      <span>
        <strong>Last signed in</strong> is when this person logged in or their login renewed — about every
        8 hours of use. It shows recent access, not who is online at this moment.
      </span>
    </p>
  );

  return (
    <Drawer open={open} onClose={onClose} eyebrow="System health" title="Signed-in users" footer={footer}>
      <style>{`
        .siu-summary { padding:20px 24px 4px; }
        .siu-count { font-family:var(--font-display); font-size:36px; font-weight:500; letter-spacing:-0.03em;
          color:var(--navy-900); line-height:1; }
        .siu-count small { font-family:var(--font-body); font-size:14px; font-weight:500; letter-spacing:0;
          color:var(--ink-600); margin-left:8px; }
        .siu-sub { font-size:13px; color:var(--ink-600); margin-top:6px; line-height:1.5; }
        .siu-tools { padding:16px 24px 6px; display:flex; flex-direction:column; gap:12px; }
        .siu-tools .search-field { max-width:none; }
        .siu-chips { display:flex; flex-wrap:wrap; gap:6px; }
        .siu-chips .filter-chip { font-size:12px; padding:5px 11px; }
        .siu-group { position:sticky; top:0; z-index:1; background:var(--surface-glass); backdrop-filter:blur(4px);
          padding:12px 24px 6px; font-family:var(--font-mono); font-size:10.5px; letter-spacing:0.1em;
          text-transform:uppercase; color:var(--ink-500); display:flex; gap:8px; }
        .siu-group span { color:var(--ink-400); }
        .siu-list { list-style:none; margin:0; padding:0 12px; }
        .siu-row { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:var(--r-md);
          transition:background var(--t-fast); }
        .siu-row:hover { background:var(--ink-50); }
        .siu-main { flex:1; min-width:0; }
        .siu-name-line { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .siu-name { font-size:13.5px; font-weight:600; color:var(--navy-900); }
        .siu-email { font-size:12px; color:var(--ink-500); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .siu-role { font-size:10.5px; font-weight:600; padding:1px 7px; border-radius:99px; background:var(--ink-100); color:var(--ink-700); }
        .siu-role.reviewer { background:var(--teal-50); color:var(--teal-800); }
        .siu-role.editor { background:var(--indigo-50); color:var(--indigo-800); }
        .siu-role.admin { background:var(--warn-100); color:var(--warn-800); }
        .siu-when { text-align:right; flex-shrink:0; }
        .siu-ago { font-size:12.5px; font-weight:600; color:var(--navy-900); white-space:nowrap; }
        .siu-exact { font-size:11px; color:var(--ink-500); margin-top:1px; white-space:nowrap; }
        .siu-skel { display:flex; align-items:center; gap:12px; padding:12px 24px; }
        .siu-skel i { display:block; border-radius:6px; background:linear-gradient(90deg, var(--ink-100) 25%, var(--ink-50) 50%, var(--ink-100) 75%);
          background-size:200% 100%; animation:siuShimmer 1.2s linear infinite; }
        @keyframes siuShimmer { from { background-position:200% 0; } to { background-position:-200% 0; } }
        .siu-empty { padding:48px 32px; text-align:center; }
        .siu-empty-icon { width:44px; height:44px; margin:0 auto 12px; border-radius:50%; background:var(--ink-100);
          color:var(--ink-500); display:flex; align-items:center; justify-content:center; }
        .siu-empty-title { font-size:14px; font-weight:600; color:var(--navy-900); }
        .siu-empty-text { font-size:12.5px; color:var(--ink-500); margin-top:4px; line-height:1.5; }
        .siu-refreshing { opacity:.55; transition:opacity var(--t-fast); }
        .siu-pager { padding:4px 24px 18px; }
        .siu-note { display:flex; gap:10px; align-items:flex-start; margin:0; font-size:12px; color:var(--ink-600); line-height:1.55; }
        .siu-note svg { flex-shrink:0; margin-top:2px; color:var(--navy-500); }
        .siu-note strong { color:var(--navy-900); font-weight:600; }
      `}</style>

      <div ref={bodyTop} />
      <div className="siu-summary">
        <div className="siu-count">
          {counts ? counts.all.toLocaleString() : '—'}
          <small>{counts?.all === 1 ? 'person' : 'people'}</small>
        </div>
        <div className="siu-sub">
          {query
            ? <>match “{query}” and have a valid login from the last {days} days.</>
            : <>have a valid login from the last {days} days.</>}
        </div>
      </div>

      <div className="siu-tools">
        <SearchField value={search} onChange={setSearch} placeholder="Search by name or email…" label="Search signed-in users" />
        <div className="siu-chips" role="group" aria-label="Filter by role">
          {ROLE_CHIPS.map(c => (
            <button
              key={c.id || 'all'}
              type="button"
              className={`filter-chip ${role === c.id ? 'active' : ''}`}
              aria-pressed={role === c.id}
              onClick={() => setRole(c.id)}
            >
              {c.label} <span style={{ opacity: 0.6 }}>{counts ? counts[c.id || 'all'] : ''}</span>
            </button>
          ))}
        </div>
      </div>

      {state === 'loading' && (
        <div aria-busy="true" aria-label="Loading">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="siu-skel">
              <i style={{ width: 36, height: 36, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <i style={{ width: `${55 - i * 5}%`, height: 11 }} />
                <i style={{ width: `${38 + i * 4}%`, height: 9, marginTop: 7 }} />
              </div>
              <i style={{ width: 52, height: 11 }} />
            </div>
          ))}
        </div>
      )}

      {state === 'error' && (
        <div className="siu-empty">
          <div className="siu-empty-title">Could not load signed-in users</div>
          <div className="siu-empty-text">Check your connection and open this panel again.</div>
        </div>
      )}

      {(state === 'ready' || state === 'refreshing') && total === 0 && (
        <div className="siu-empty">
          <div className="siu-empty-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="siu-empty-title">{query || role ? 'No matches' : 'Nobody is signed in'}</div>
          <div className="siu-empty-text">
            {query || role ? 'Try a different name or role.' : `No one has a valid login from the last ${days} days.`}
          </div>
        </div>
      )}

      {(state === 'ready' || state === 'refreshing') && total > 0 && (
        <div className={state === 'refreshing' ? 'siu-refreshing' : ''} aria-busy={state === 'refreshing'}>
          {groups.map(g => (
            <section key={g.label}>
              <div className="siu-group">{g.label}<span>{g.users.length}</span></div>
              <ul className="siu-list">
                {g.users.map(u => (
                  <li key={u.id} className="siu-row">
                    <Avatar user={u} size="lg" />
                    <div className="siu-main">
                      <div className="siu-name-line">
                        <span className="siu-name">{u.name}</span>
                        {u.roles.map(r => <span key={r} className={`siu-role ${r}`}>{r[0].toUpperCase() + r.slice(1)}</span>)}
                      </div>
                      <div className="siu-email" title={u.email}>{u.email}{u.institution ? ` · ${u.institution}` : ''}</div>
                    </div>
                    <div className="siu-when" title={fullDateTime(u.last_signed_in)}>
                      <div className="siu-ago">{timeAgo(u.last_signed_in)}</div>
                      <div className="siu-exact">{fullDateTime(u.last_signed_in)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className="siu-pager">
            <Pagination
              page={page}
              pageSize={USERS_PAGE_SIZE}
              total={total}
              busy={state === 'refreshing'}
              onChange={(n) => { setPageState({ key, page: n }); bodyTop.current?.scrollIntoView({ block: 'start' }); }}
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}
