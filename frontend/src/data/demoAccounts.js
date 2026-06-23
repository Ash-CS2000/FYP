export const ROLE_HOME = {
  author: '/author/dashboard',
  reviewer: '/reviewer/dashboard',
  editor: '/editor/dashboard',
  admin: '/admin/dashboard',
};

export const ROLE_LABELS = {
  author: 'Author',
  reviewer: 'Reviewer',
  editor: 'Editor',
  admin: 'Admin',
};

export const DEMO_ACCOUNTS = [
  {
    email: 'author@utm.edu.my',
    password: 'Author@123',
    name: 'Ahmad Razif',
    initials: 'AR',
    roles: ['author'],
    defaultRole: 'author',
  },
  {
    email: 'reviewer@um.edu.my',
    password: 'Reviewer@123',
    name: 'Dr. Lim Wei Ping',
    initials: 'LW',
    roles: ['reviewer'],
    defaultRole: 'reviewer',
  },
  {
    email: 'editor@usm.my',
    password: 'Editor@123',
    name: 'Prof. Hassan Ibrahim',
    initials: 'HI',
    roles: ['editor'],
    defaultRole: 'editor',
  },
  {
    email: 'admin@paperbridge.edu.my',
    password: 'Admin@123',
    name: 'System Admin',
    initials: 'SA',
    roles: ['admin'],
    defaultRole: 'admin',
  },
];

export function findDemoAccount(email, password) {
  return DEMO_ACCOUNTS.find((account) => (
    account.email.toLowerCase() === email.trim().toLowerCase()
    && account.password === password
  ));
}

export function saveDemoSession(account, activeRole = account.defaultRole) {
  window.localStorage.setItem('paperbridge-demo-account', JSON.stringify({
    email: account.email,
    name: account.name,
    initials: account.initials,
    roles: account.roles,
  }));
  window.localStorage.setItem('paperbridge-active-role', activeRole);
}

export function getDemoSession() {
  try {
    const raw = window.localStorage.getItem('paperbridge-demo-account');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDemoSession() {
  window.localStorage.removeItem('paperbridge-demo-account');
  window.localStorage.removeItem('paperbridge-active-role');
}
