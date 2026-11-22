// Attach the current session to private API requests, including file uploads.
export function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem('wincrea-auth-token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return globalThis.fetch(url, { ...options, headers });
}
