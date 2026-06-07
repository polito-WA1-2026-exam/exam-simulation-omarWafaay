const API_BASE = 'http://localhost:3001';

/**
 * Thin fetch wrapper — every call uses session cookies (exam two-servers pattern).
 */

/**
 * This method is used to pass all the api requests from the client to the server.
 * It is a wrapper around the native fetch function, which adds some default headers and handles the response.
 */
export async function apiFetch(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return { ok: res.ok, status: res.status, data: null };
  }

  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}
