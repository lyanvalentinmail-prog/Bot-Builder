const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

/**
 * URL del backend cuando la interfaz se sirve en otro dominio
 * (por ejemplo: frontend en Vercel + API en Render).
 * Vacío = mismo origen (Vite proxy en desarrollo o servidor único en producción).
 */
export const API_BASE = (env.VITE_API_URL || '').replace(/\/+$/, '');

export const SOCKET_URL = (env.VITE_SOCKET_URL || API_BASE) || undefined;

const queryToken =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('token')
    : null;

export const AUTH_TOKEN = queryToken || env.VITE_AUTH_TOKEN || '';

export const IS_EXTERNAL_API = Boolean(API_BASE);
