const tokenFromUrl =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null;

const authHeaders = tokenFromUrl ? { 'x-auth-token': tokenFromUrl } : {};

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...authHeaders },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    const error = new Error(data?.error || `Error ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body = {}) => request(path, { method: 'POST', body }),
  put: (path, body = {}) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
