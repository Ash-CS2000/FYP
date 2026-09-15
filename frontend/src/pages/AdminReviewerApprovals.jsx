import { useEffect, useRef, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import SearchField from '../components/SearchField.jsx';
import Pagination from '../components/Pagination.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { patchReviewerStatus, listUsers, USERS_PAGE_SIZE } from '../api/admin.js';
import { SPECIALTY_TAG_LABELS } from '../data/specialtyTags.js';

function getInitials(name = '') {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export default function AdminReviewerApprovals() {
  const [pending, setPending] = useState([]);
  const [total, setTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 300);
  const [pageState, setPageState] = useState({ key: query, page: 1 });
  if (pageState.key !== query) setPageState({ key: query, page: 1 });
  const page = pageState.key === query ? pageState.page : 1;
  const requestSeq = useRef(0);

  // Only pending applications are fetched — the server filters, pages and
  // searches, so this stays one small request at any platform size.
  function loadUsers() {
    const seq = ++requestSeq.current;
    setRefreshing(true);
    setUsersError('');
    listUsers({ reviewerStatus: 'pending', page, search: query })
      .then(res => {
        if (seq !== requestSeq.current) return;
        if (res.results.length === 0 && res.total > 0 && page > 1) {
          setPageState({ key: query, page: Math.ceil(res.total / res.page_size) });
          return;
        }
        setPending(res.results);
        setTotal(res.total);
      })
      .catch(() => { if (seq === requestSeq.current) setUsersError('Could not load reviewer applications from the server.'); })
      .finally(() => {
        if (seq === requestSeq.current) {
          setUsersLoading(false);
          setRefreshing(false);
        }
      });
  }

  useEffect(() => { loadUsers(); }, [query, page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAction(userId, action) {
    setNotice('');
    setActionLoading(`${userId}-${action}`);
    try {
      await patchReviewerStatus(userId, action);
      setPending(prev => prev.filter(u => u.id !== userId));
      loadUsers();
      setNotice(
        action === 'approve'
          ? 'Reviewer approved. They have been emailed and can now log in to the reviewer workspace.'
          : 'Reviewer application rejected.'
      );
    } catch (err) {
      setNotice(err?.message || 'Could not update this application. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <AppShell role="admin">
      <style>{`
        .rva-card { padding: 20px 22px; border-bottom: 1px solid var(--ink-100); }
        .rva-card:last-child { border-bottom: none; }
        .rva-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .rva-name { font-weight: 600; color: var(--navy-900); font-size: 15px; }
        .rva-email { font-size: 13px; color: var(--ink-600); }
        .rva-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 14px; font-size: 13px; }
        .rva-field-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-500); font-weight: 700; margin-bottom: 3px; }
        .rva-field-value { color: var(--ink-800); line-height: 1.5; }
        .rva-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
        .rva-chip { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 99px; background: var(--teal-50); color: var(--teal-800); }
        .rva-actions { display: flex; gap: 8px; }
        /* .card-header is global and has no gap/wrap; scope both to this one. */
        .rva-toolbar { gap: 16px; flex-wrap: wrap; }
      `}</style>

      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">User Management</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Reviewer <em className="serif-italic">Approvals</em>.</h1>
          <p className="page-subtitle">Check an applicant's background and expertise, then approve or reject them as a reviewer.</p>
        </div>
      </div>

      {notice && (
        <div className="card fade-up delay-1" style={{ borderLeft: '3px solid var(--teal-600)', padding: '12px 18px', fontSize: 13.5, color: 'var(--navy-900)' }}>
          {notice}
        </div>
      )}

      <div className="card fade-up delay-2">
        <div className="card-header rva-toolbar">
          <div className="card-title">
            {usersLoading
              ? 'Loading applications…'
              : `${total.toLocaleString()} pending${query ? ' matching' : ''}`}
          </div>
          {!usersLoading && !usersError && (total > 0 || search) && (
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by name or email…"
              label="Search reviewer applications by name or email"
            />
          )}
        </div>

        {usersLoading ? (
          <p className="muted" style={{ fontSize: 13, padding: '16px 22px' }}>Loading reviewer applications…</p>
        ) : usersError ? (
          <div style={{ padding: '16px 22px', fontSize: 13 }}>
            <span style={{ color: 'var(--red-700)' }}>{usersError}</span>{' '}
            <button className="btn btn-ghost btn-sm" onClick={loadUsers}>Retry</button>
          </div>
        ) : pending.length === 0 ? (
          <p className="muted" style={{ fontSize: 13, padding: '16px 22px' }}>
            {query ? `No pending applications match “${query}”.` : 'No pending reviewer applications.'}
          </p>
        ) : pending.map(u => (
          <div key={u.id} className="rva-card">
            <div className="rva-head">
              <div className="avatar">{getInitials(u.name)}</div>
              <div>
                <div className="rva-name">{u.name}</div>
                <div className="rva-email">{u.email}</div>
              </div>
            </div>

            <div className="rva-grid">
              <div>
                <div className="rva-field-label">Institution</div>
                <div className="rva-field-value">{u.institution || '—'}</div>
              </div>
              <div>
                <div className="rva-field-label">Background</div>
                <div className="rva-field-value">{[u.degree, u.professional_type].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              <div>
                <div className="rva-field-label">Research areas</div>
                <div className="rva-field-value">{u.research_areas || '—'}</div>
              </div>
              <div>
                <div className="rva-field-label">Expertise areas</div>
                <div className="rva-field-value">{u.expertise_areas || '—'}</div>
              </div>
              {(u.orcid_id || u.website) && (
                <div>
                  <div className="rva-field-label">Links</div>
                  <div className="rva-field-value">
                    {u.orcid_id && <div>ORCID: {u.orcid_id}</div>}
                    {u.website && <div>{u.website}</div>}
                  </div>
                </div>
              )}
              {(u.specialty_tags || []).length > 0 && (
                <div>
                  <div className="rva-field-label">Specialty tags</div>
                  <div className="rva-tags">
                    {u.specialty_tags.map(slug => (
                      <span key={slug} className="rva-chip">{SPECIALTY_TAG_LABELS[slug] || slug}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rva-actions">
              <button
                className="btn btn-sm"
                style={{ background: 'var(--fill-success)', color: 'var(--on-fill)', border: 'none' }}
                disabled={actionLoading === `${u.id}-approve`}
                onClick={() => handleAction(u.id, 'approve')}
              >
                {actionLoading === `${u.id}-approve` ? '…' : 'Approve'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--red-700)', borderColor: 'var(--red-200)' }}
                disabled={actionLoading === `${u.id}-reject`}
                onClick={() => handleAction(u.id, 'reject')}
              >
                {actionLoading === `${u.id}-reject` ? '…' : 'Reject'}
              </button>
            </div>
          </div>
        ))}

        {!usersLoading && !usersError && (
          <div style={{ padding: '0 22px 6px' }}>
            <Pagination
              page={page}
              pageSize={USERS_PAGE_SIZE}
              total={total}
              busy={refreshing}
              onChange={(n) => { setPageState({ key: query, page: n }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
