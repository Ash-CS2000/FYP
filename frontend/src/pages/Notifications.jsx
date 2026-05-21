import AppShell from '../components/AppShell.jsx';

const NOTIFS = {
  student: [
    { icon: '01', title: 'Training progress saved', body: 'Your Citation Basics lesson progress has been updated.', time: '20 minutes ago', unread: true },
    { icon: '02', title: 'New learning material', body: 'Abstracts and Keywords is now available in your training path.', time: 'Today', unread: true },
    { icon: '03', title: 'Reviewer skills unlocked', body: 'Read Like a Reviewer has been added to help you practice constructive criticism.', time: 'Yesterday', unread: false },
  ],
  author: [
    { icon: '📝', title: 'Reviewer assigned', body: 'Dr. Lim Wei Ping was assigned to review your paper "Deep Learning Methods in Medical Imaging".', time: '2 hours ago', unread: true },
    { icon: '✏️', title: 'Revision requested', body: 'Reviewers have requested changes to "IoT Security Framework". Please address their comments.', time: 'Yesterday at 4:32 PM', unread: true },
    { icon: '✅', title: 'Paper approved', body: '"NLP Survey 2025" was approved for publication by all three reviewers.', time: '3 days ago', unread: true },
    { icon: '💬', title: 'New comment from editor', body: 'Prof. Hassan Ibrahim left a note on your submission MS-2026-014.', time: '1 week ago', unread: false },
    { icon: '📥', title: 'Submission received', body: 'We received your manuscript MS-2026-014. AI classification complete.', time: '2 weeks ago', unread: false },
  ],
  reviewer: [
    { icon: '⏰', title: 'Review due soon', body: 'Your review for "Supply Chain Blockchain Use Cases" is due in 2 days.', time: '4 hours ago', unread: true },
    { icon: '📄', title: 'New paper assigned', body: 'You have been assigned to review "Renewable Energy Grid Optimization".', time: 'Yesterday', unread: false },
  ],
  editor: [
    { icon: '⚖️', title: 'Decision required', body: '"Climate Change Impact" has reviewer disagreement and needs your final decision.', time: '1 hour ago', unread: true },
    { icon: '✅', title: 'Unanimous accept', body: '"A Survey of Quantum Computing Applications" received accept from all 3 reviewers.', time: '6 hours ago', unread: true },
  ],
};

export default function Notifications({ role = 'author' }) {
  const list = NOTIFS[role] || NOTIFS.author;

  return (
    <AppShell role={role} searchPlaceholder="Search notifications...">
      <div className="page-header fade-up">
        <div>
          <span className="eyebrow">Inbox</span>
          <h1 className="page-title" style={{ marginTop: 8 }}>Notifications.</h1>
          <p className="page-subtitle">{list.filter(n => n.unread).length} unread · {list.length} total</p>
        </div>
        <button className="btn btn-ghost btn-sm">Mark all as read</button>
      </div>

      <div className="card fade-up delay-1">
        {list.map((n, i) => (
          <div key={i} style={{
            display: 'flex', gap: 16, padding: '18px 4px',
            borderBottom: i === list.length - 1 ? 'none' : '1px solid var(--ink-100)',
            background: n.unread ? 'rgba(230,241,251,0.3)' : 'transparent',
            margin: n.unread ? '0 -8px' : 0,
            paddingLeft: n.unread ? 12 : 4,
            paddingRight: n.unread ? 12 : 4,
            borderRadius: n.unread ? 'var(--r-md)' : 0,
          }}>
            <div style={{
              width: 44, height: 44, fontSize: 20, borderRadius: 8,
              background: 'var(--navy-100)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>{n.icon}</div>
            <div style={{ flex: 1 }}>
              <div className="row" style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: 'var(--navy-900)', fontSize: 14 }}>{n.title}</span>
                {n.unread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber-500)', marginLeft: 'auto' }}></span>}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.5, marginBottom: 6 }}>{n.body}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
