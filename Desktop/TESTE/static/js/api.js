/* SIGMS API Client - fetch wrapper with JWT refresh */
const API_BASE = '';

let _accessToken = sessionStorage.getItem('access_token') || '';

export function setToken(t) { _accessToken = t; sessionStorage.setItem('access_token', t); }
export function clearToken() { _accessToken = ''; sessionStorage.removeItem('access_token'); }
export function getToken() { return _accessToken; }

async function _refreshToken() {
  const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Session expired');
  const data = await res.json();
  setToken(data.access_token);
  return data.access_token;
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });

  if (res.status === 401 && _accessToken) {
    try {
      await _refreshToken();
      headers['Authorization'] = `Bearer ${_accessToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
    } catch {
      clearToken();
      window.location.hash = '#/login';
      throw new Error('Sessão expirada');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Erro ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function apiMultipart(path, formData) {
  const headers = {};
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData, credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Erro ${res.status}`);
  }
  return res.json();
}

// Convenience methods
export const get = (path) => api(path, { method: 'GET' });
export const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
export const put = (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body) });
export const patch = (path, body) => api(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined });
export const del = (path) => api(path, { method: 'DELETE' });
