import { API_BASE, AUTH_TOKEN } from './config.js';

const authHeaders = AUTH_TOKEN ? { 'x-auth-token': AUTH_TOKEN } : {};

async function request(path, options = {}) {
  const { body, headers, ...rest } = options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  // `fetch` no serializa objetos: los convertimos a JSON una sola vez acá.
  const payload =
    body === undefined || body === null || isForm || typeof body === 'string'
      ? body
      : JSON.stringify(body);

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...rest,
    headers: {
      ...(payload !== undefined && payload !== null && !isForm
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...authHeaders,
      ...(headers || {}),
    },
    ...(payload !== undefined && payload !== null ? { body: payload } : {}),
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
    error.code = data?.code;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  // Solo adjuntamos `body` si el llamador lo pasó: un POST vacío no necesita JSON.
  post: (path, body) =>
    request(path, body === undefined ? { method: 'POST' } : { method: 'POST', body }),
  put: (path, body) =>
    request(path, body === undefined ? { method: 'PUT' } : { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
