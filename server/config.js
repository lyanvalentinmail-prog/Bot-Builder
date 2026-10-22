import path from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  // Node ≥20.12: carga .env si existe, sin dependencias externas.
  process.loadEnvFile?.();
} catch {
  /* no hay archivo .env o Node no lo soporta */
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * En Vercel (serverless) el disco es efímero: usamos /tmp para que el editor
 * pueda funcionar durante la vida de la instancia. Los canales persistentes
 * (WhatsApp/Teams) requieren un servidor real.
 */
export const IS_SERVERLESS =
  process.env.SERVERLESS === '1' || Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

export const DATA_DIR =
  process.env.DATA_DIR || (IS_SERVERLESS ? '/tmp/botforge' : path.join(ROOT_DIR, 'data'));

export const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
export const DB_FILE = path.join(DATA_DIR, 'db.json');
export const WEB_DIST = path.join(ROOT_DIR, 'dist');

export const PORT = Number(process.env.PORT || 3001);
export const HOST = process.env.HOST || '0.0.0.0';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PROD = NODE_ENV === 'production';

export const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

/**
 * Render Free (y otros planes sin disco) mantiene un filesystem escribible pero
 * efímero: el blueprint marca EPHEMERAL_DATA=true para avisarlo en la interfaz.
 */
export const EPHEMERAL_DATA = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.EPHEMERAL_DATA || '').toLowerCase(),
);

/** Orígenes permitidos para CORS: "*" o lista separada por comas. */
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/** Base pública usada en enlaces/documentación (Render y Vercel la exponen). */
const hostFromPlatform = process.env.RENDER_EXTERNAL_URL
  ? process.env.RENDER_EXTERNAL_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : '';

export const PUBLIC_URL = (process.env.PUBLIC_URL || hostFromPlatform).replace(/\/+$/, '');
