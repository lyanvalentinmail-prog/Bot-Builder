import crypto from 'node:crypto';

export const uid = (prefix = '') =>
  prefix + crypto.randomBytes(6).toString('hex');

export const now = () => Date.now();

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const asString = (value, max = 4000) =>
  typeof value === 'string' ? value.slice(0, max) : '';

export const asBool = (value, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;

export const asInt = (value, fallback = 0, min = -2147483648, max = 2147483647) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(Math.round(n), min, max);
};

export const asArray = (value) => (Array.isArray(value) ? value : []);

export const pick = (value, allowed, fallback) =>
  allowed.includes(value) ? value : fallback;

export const sleep = (ms) => new Promise((r) => setTimeout(r, clamp(ms, 0, 15000)));
export const delay = sleep;

export const escapeRegExp = (text = '') => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const isHttpUrl = (value) => {
  try {
    const url = new URL(asString(value, 2000));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Quita acentos y normaliza para comparar comandos. */
export const fold = (text = '') =>
  String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Deja solo dígitos (para el pairing code). */
export const digitsOnly = (value = '') => String(value).replace(/\D/g, '');

export const truncate = (value = '', max = 160) => {
  const s = String(value);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

export const safeJson = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const randomOf = (list, rng = Math.random) =>
  list[Math.floor(rng() * list.length)];
