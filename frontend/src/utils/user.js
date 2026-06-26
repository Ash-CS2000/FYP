export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

export function getFirstName(user) {
  if (!user) return '';
  const first = (user.first_name || '').trim();
  if (first) return first;
  const name = (user.name || '').trim();
  if (name) return name.split(/\s+/)[0];
  return (user.email || '').split('@')[0];
}

export function getInitials(user) {
  if (!user) return '';
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
