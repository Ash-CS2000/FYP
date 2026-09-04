export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

export function getFirstName(user) {
  if (!user) return '';
  // The nickname wins: it is the name someone chose to be greeted by, and a
  // one-word nickname is already the whole greeting.
  const nick = (user.display_name || '').trim();
  if (nick) return nick.split(/\s+/)[0];
  const first = (user.first_name || '').trim();
  if (first) return first;
  const name = (user.name || '').trim();
  if (name) return name.split(/\s+/)[0];
  return (user.email || '').split('@')[0];
}

export function getInitials(user) {
  if (!user) return '';
  // Initials follow the displayed name, so the avatar and the label under it
  // agree. A one-word nickname yields a single letter, which is correct.
  const nick = (user.display_name || '').trim();
  if (nick) {
    const parts = nick.split(/\s+/);
    const a = parts[0]?.charAt(0) || '';
    const b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return `${a}${b}`.toUpperCase();
  }
  const first = (user.first_name || '').trim();
  const last = (user.last_name || '').trim();
  if (first || last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  }
  const name = (user.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/);
    const a = parts[0]?.charAt(0) || '';
    const b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return `${a}${b}`.toUpperCase();
  }
  return (user.email || '?').charAt(0).toUpperCase();
}
