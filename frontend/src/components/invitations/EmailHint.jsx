// src/components/invitations/EmailHint.jsx
// Tells the admin, as they type an address, what sending an invite will do —
// before they press Send. Reads GET /api/users/email-status/.

import { useEffect, useState } from 'react';
import { getEmailStatus } from '../../api/admin.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** { status, checking } for a typed address; status is null until it is a valid email. */
export function useEmailStatus(email) {
  const value = useDebouncedValue(String(email || '').trim().toLowerCase(), 400);
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!EMAIL_RE.test(value)) { setStatus(null); setChecking(false); return undefined; }
    let cancelled = false;
    setChecking(true);
    getEmailStatus(value)
      .then(res => { if (!cancelled) setStatus({ ...res, email: value }); })
      .catch(() => { if (!cancelled) setStatus(null); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [value]);

  return { status: status && status.email === value ? status : null, checking };
}

const list = roles => roles.map(r => r[0].toUpperCase() + r.slice(1)).join(', ');

/** { tone: 'ok' | 'info' | 'warn' | 'block', text } — `block` means sending will be refused. */
export function describeEmail(status, mode) {
  if (!status) return null;
  const { exists, name, roles, account_status: acct } = status;
  if (exists && acct !== 'active') {
    return { tone: 'block', text: `${name}'s account is ${acct === 'suspended' ? 'suspended' : 'deleted'}. Restore it in Manage Users first.` };
  }
  if (mode === 'editor') {
    if (!exists) return { tone: 'info', text: `New to PaperBridge — they'll get a link to create their account.${status.pending_editor_invite ? ' This replaces the invite they already have.' : ''}` };
    if (roles.includes('admin')) return { tone: 'block', text: `${name} is an administrator and can't be given the editor role.` };
    if (roles.includes('editor')) return { tone: 'warn', text: `${name} is already an editor.` };
    return { tone: 'ok', text: `${name} already has an account (${list(roles) || 'no role'}) — they'll get editor access immediately.` };
  }
  if (roles?.includes('admin')) return { tone: 'block', text: `${name} is already an administrator.` };
  const again = status.pending_admin_invite ? ' Sending again replaces the invite they already have.' : '';
  if (!exists) return { tone: 'info', text: `New to PaperBridge — they'll create a password when they accept.${again}` };
  return {
    tone: status.pending_admin_invite ? 'warn' : 'ok',
    text: `${name} has an account (${list(roles) || 'no role'}) — they'll confirm with their existing password${roles.includes('editor') ? ' and keep their editor role' : ''}.${again}`,
  };
}

const ICON = {
  ok: <path d="M20 6L9 17l-5-5" />,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  warn: <><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  block: <><circle cx="12" cy="12" r="10" /><path d="M4.9 4.9l14.2 14.2" /></>,
};

export default function EmailHint({ hint, checking }) {
  if (checking && !hint) return <div className="email-hint checking">Checking this address…</div>;
  if (!hint) return null;
  return (
    <div className={`email-hint ${hint.tone}`} role={hint.tone === 'block' ? 'alert' : 'status'}>
      <style>{`
        .email-hint { display:flex; gap:8px; align-items:flex-start; margin-top:7px; padding:8px 11px; border-radius:var(--r-md);
          font-size:12.5px; line-height:1.5; }
        .email-hint svg { flex-shrink:0; margin-top:2px; }
        .email-hint.checking { padding:0; margin-top:6px; color:var(--ink-500); }
        .email-hint.ok { background:var(--teal-50); color:var(--teal-800); }
        .email-hint.info { background:var(--navy-100); color:var(--navy-800); }
        .email-hint.warn { background:var(--amber-50); color:var(--amber-800); }
        .email-hint.block { background:var(--red-50); color:var(--red-800); }
      `}</style>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICON[hint.tone]}
      </svg>
      <span>{hint.text}</span>
    </div>
  );
}
