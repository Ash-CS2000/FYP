import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { getFirstName } from '../utils/user.js';
import { useCurrentUser } from '../auth/CurrentUserContext.jsx';
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_TONE,
  deadlineState,
  formatDate,
} from '../data/invitations.js';
import { getReviewerKpi } from '../api/invitations.js';
import { useReviewerAssignments } from '../hooks/useReviewerAssignments.jsx';
import { getMe } from '../api/users.js';
import { SPECIALTY_TAG_LABELS } from '../data/specialtyTags.js';
import { RECOMMENDATION_LABELS } from '../data/reviews.js';

function AnonymousAuthor() {
  return (
    <div className="row">
      <div className="avatar avatar-sm" title="Hidden under double-blind review">??</div>
      <span className="muted" style={{ fontSize: 13 }}>Anonymised</span>
    </div>
  );
}

function metricText(value, suffix = '%') {
  return value == null ? 'No data' : `${value}${suffix}`;
}

export default function ReviewerDashboard() {
  const firstName = getFirstName(useCurrentUser().user) || 'Reviewer';

  const assignments = useReviewerAssignments()?.assignments || [];
  const [specialtyTags, setSpecialtyTags] = useState([]);
  const [kpi, setKpi] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => { if (!cancelled) setSpecialtyTags(me.specialty_tags || []); })
      .catch(() => { /* left empty */ });
    getReviewerKpi()
      .then((data) => { if (!cancelled) setKpi(data); })
      .catch(() => { /* left empty */ });
    return () => { cancelled = true; };
  }, []);

  const invited = assignments.filter(a => a.status === 'invited');
  const accepted = assignments.filter(a => a.status === 'accepted');
  const overdue = accepted.filter(a => deadlineState(a.due_at).tone === 'overdue');
  const open = [...invited, ...accepted];
  const onTimeRate = kpi?.metrics?.on_time_rate;
  const quality = kpi?.metrics?.avg_quality;
  const accuracy = kpi?.metrics?.avg_accuracy;

  return (
    <AppShell role="reviewer" searchPlaceholder="Search assigned papers...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Reviewer Workspace</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Welcome, <em className="serif-italic">{firstName}</em>.</h1>
          <p className="page-subtitle">
            {invited.length > 0
              ? `${invited.length} invitation${invited.length === 1 ? '' : 's'} waiting on your response.`
              : 'No invitations waiting on you right now.'}
          </p>
        </div>
      </div>

      <div className="stat-grid">
        {[
          {
            label: 'Awaiting your response',
            value: invited.length,
            accent: 'var(--amber-700)',
            trend: invited.length
              ? <Link to="/reviewer/invitations" style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Respond now</Link>
              : 'Nothing to decide',
          },
          { label: 'Reviews in progress', value: accepted.length, accent: 'var(--navy-700)', trend: 'Accepted and open' },
          {
            label: 'Overdue',
            value: overdue.length,
            accent: 'var(--red-700)',
            trend: overdue.length ? 'Address as soon as possible' : 'All on time',
          },
          {
            label: 'Reviewer KPI',
            value: kpi ? `${kpi.score}%` : '...',
            accent: 'var(--navy-700)',
            trend: kpi
              ? [
                `${kpi.summary.submitted} submitted`,
                kpi.summary.overdue_open ? `${kpi.summary.overdue_open} overdue` : null,
                kpi.band.replace('_', ' '),
              ].filter(Boolean).join(' · ')
              : 'Calculating',
          },
        ].map((s, i) => (
          <div key={s.label} className={`stat fade-up delay-${i + 1}`} style={{ '--accent': s.accent }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-trend">{s.trend}</div>
          </div>
        ))}
      </div>

      <div className="card fade-up delay-3">
        <div className="card-header">
          <div>
            <div className="card-title">Your open assignments</div>
            <div className="card-meta">
              Invitations you have not answered, and reviews you have accepted. Author
              identities are hidden under double-blind review.
            </div>
          </div>
          <Link to="/reviewer/assignments" style={{ color: 'var(--navy-700)', fontSize: 13, fontWeight: 600 }}>
            View all
          </Link>
        </div>

        {open.length === 0 ? (
          <div style={{ padding: '28px 4px', color: 'var(--ink-600)', fontSize: 13.5 }}>
            Nothing open. Anything new will appear here and in your invitations.
          </div>
        ) : (
          <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Paper</th><th>Category</th><th>Author</th><th>Deadline</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {open.map(a => {
                const due = deadlineState(a.status === 'invited' ? a.respond_by : a.due_at);
                const tone = ASSIGNMENT_TONE[a.status];
                const dueColor = { overdue: 'var(--red-700)', due: 'var(--amber-800)', ok: 'var(--ink-600)', none: 'var(--ink-600)' }[due.tone];
                return (
                  <tr key={a.id} style={due.tone === 'overdue'
                    ? { background: 'linear-gradient(90deg, color-mix(in srgb, var(--red-50) 40%, transparent), transparent)' }
                    : undefined}>
                    <td>
                      <div className="table-title">{a.title}</div>
                      <div className="table-meta">Manuscript #{a.manuscript_id}</div>
                    </td>
                    <td><span className="muted">{a.category}</span></td>
                    <td><AnonymousAuthor /></td>
                    <td><span style={{ color: dueColor, fontWeight: due.tone === 'ok' ? 400 : 600, fontSize: 13 }}>{due.label}</span></td>
                    <td>
                      <span className="pill" style={{ background: tone.bg, color: tone.fg }}>
                        {ASSIGNMENT_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td>
                      {a.status === 'invited' ? (
                        <Link to="/reviewer/invitations" className="btn btn-primary btn-sm">Respond</Link>
                      ) : (
                        <Link to={`/reviewer/review/${a.manuscript_id}`} className="btn btn-ghost btn-sm">Open</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <div className="split-grid fade-up delay-4" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Recent Completed Reviews</div><div className="card-meta">Your recent contributions to the journal.</div></div>
            <Link to="/reviewer/completed" style={{ color: 'var(--navy-700)', fontSize: 13, fontWeight: 600 }}>View all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(kpi?.recent_reviews || []).length === 0 && (
              <span className="muted" style={{ fontSize: 13 }}>No completed reviews yet.</span>
            )}
            {(kpi?.recent_reviews || []).map((r) => (
              <div key={r.assignment_id} style={{ padding: 14, border: '1px solid var(--ink-200)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, background: r.on_time ? 'var(--green-50)' : 'var(--amber-50)', color: r.on_time ? 'var(--green-800)' : 'var(--amber-800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 14 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
                    Reviewed {formatDate(r.submitted_at)} - {RECOMMENDATION_LABELS[r.recommendation] || r.recommendation}
                  </div>
                  {r.assessment?.note && (
                    <div style={{ fontSize: 12.5, color: 'var(--ink-700)', marginTop: 6, lineHeight: 1.45 }}>
                      Editor note: {r.assessment.note}
                    </div>
                  )}
                </div>
                <span className={`pill ${r.assessment ? 'pill-approved' : 'pill-pending'}`}>
                  {r.assessment ? `Q${r.assessment.quality} A${r.assessment.accuracy}` : 'Awaiting score'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Your Expertise Areas</div>
            <Link to="/reviewer/profile" style={{ color: 'var(--navy-700)', fontSize: 13, fontWeight: 600 }}>Edit</Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {specialtyTags.length === 0 && (
              <span className="muted" style={{ fontSize: 13 }}>
                No specialty tags set yet - add some so manuscripts can be matched to you.
              </span>
            )}
            {specialtyTags.map(slug => (
              <span key={slug} style={{ padding: '6px 12px', background: 'var(--navy-100)', color: 'var(--navy-800)', borderRadius: 'var(--r-pill)', fontSize: 12.5, fontWeight: 500 }}>
                {SPECIALTY_TAG_LABELS[slug] || slug}
              </span>
            ))}
          </div>
          <div style={{ paddingTop: 16, borderTop: '1px solid var(--ink-200)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-900)', marginBottom: 12 }}>Reviewer Performance</div>
            {[
              { label: 'On-time reviews', value: metricText(onTimeRate), width: onTimeRate ?? 0, color: 'var(--teal-500)', valColor: 'var(--teal-700)' },
              {
                label: 'Editor quality rating',
                value: quality == null ? 'Awaiting assessment' : `${quality} / 5`,
                width: quality == null ? 0 : quality * 20,
                color: 'var(--navy-700)',
                valColor: 'var(--navy-700)',
              },
              {
                label: 'Accuracy rating',
                value: accuracy == null ? 'Awaiting assessment' : `${accuracy} / 5`,
                width: accuracy == null ? 0 : accuracy * 20,
                color: 'var(--amber-600)',
                valColor: 'var(--amber-800)',
              },
            ].map((m) => (
              <div key={m.label} style={{ marginBottom: 14 }}>
                <div className="row" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-700)' }}>{m.label}</span>
                  <span className="spacer"></span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: m.valColor }}>{m.value}</span>
                </div>
                <div className="progress" style={{ '--accent': m.color }}><div className="progress-fill" style={{ width: `${m.width}%` }}></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
