// src/api/auth.js
import { API_URL } from '../config';

export const register = async (formData) => {
  const res = await fetch(`${API_URL}/api/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  const data = await res.json();

  if (!res.ok) throw data;  // throws validation errors
  return data;
};

export const login = async (email, password) => {
  const res = await fetch(`${API_URL}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

export function getAccessToken() {
  return localStorage.getItem('access');
}

export function getRefreshToken() {
  return localStorage.getItem('refresh');
}

export function saveTokens(access, refresh) {
  if (access) localStorage.setItem('access', access);
  if (refresh) localStorage.setItem('refresh', refresh);
}

export function clearSession() {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
}

export async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearSession();
    window.location.href = '/login';
    return null;
  }

  const res = await fetch(`${API_URL}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    clearSession();
    window.location.href = '/login';
    return null;
  }

  const data = await res.json();
  saveTokens(data.access, data.refresh);
  return data.access;
}

export async function authFetch(url, options = {}) {
  const access = getAccessToken();

  // Let the browser set the multipart boundary for FormData bodies; forcing
  // application/json here would corrupt file uploads.
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  const makeRequest = (token) =>
    fetch(url, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let response = await makeRequest(access);

  // If 401 — try refreshing once silently
  if (response.status === 401) {
    const newAccess = await refreshAccessToken();
    if (!newAccess) return response;
    response = await makeRequest(newAccess);
  }

  return response;
}

export async function logout() {
  const refresh = getRefreshToken();
  const access = getAccessToken();

  if (refresh && access) {
    try {
      await fetch(`${API_URL}/api/users/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ refresh }),
      });
    } catch {
      // Even if request fails, clear session locally
    }
  }

  clearSession();
  window.location.href = '/login';
}
