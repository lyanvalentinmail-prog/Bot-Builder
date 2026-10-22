import path from 'node:path';

try {
  // Node ≥20.12: carga .env si existe, sin dependencias externas.
  process.loadEnvFile?.();
} catch {
  /* no hay archivo .env o Node no lo soporta */
}
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');
export const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
export const DB_FILE = path.join(DATA_DIR, 'db.json');
export const WEB_DIST = path.join(ROOT_DIR, 'dist');

export const PORT = Number(process.env.PORT || 3001);
export const HOST = process.env.HOST || '0.0.0.0';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PROD = NODE_ENV === 'production';

/** Base pública usada para mostrar el endpoint de Teams. */
export const PUBLIC_URL = process.env.PUBLIC_URL || '';
