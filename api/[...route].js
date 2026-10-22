/**
 * Función serverless de Vercel (catch-all de /api).
 *
 * Dos modos:
 *
 * 1. BACKEND_URL definido → proxy transparente hacia el servidor persistente
 *    (Render/Railway/VPS). El token se agrega del lado del servidor con
 *    BACKEND_TOKEN, así nunca llega al navegador. Ideal para producción.
 *
 * 2. Sin BACKEND_URL → API serverless de demostración: el editor y el simulador
 *    funcionan (datos en /tmp), pero WhatsApp y Teams reales necesitan un
 *    servidor persistente.
 */

const BACKEND_URL = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
const BACKEND_TOKEN = process.env.BACKEND_TOKEN || '';

let appPromise = null;

function getApp() {
  if (!appPromise) {
    appPromise = import('../server/app.js').then((module) =>
      module.createApp({ serveStatic: false }),
    );
  }
  return appPromise;
}

async function readRawBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function proxyToBackend(req, res) {
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];
  delete headers['accept-encoding'];
  if (BACKEND_TOKEN) headers['x-auth-token'] = BACKEND_TOKEN;

  const body = await readRawBody(req);
  const upstream = await fetch(`${BACKEND_URL}${req.url}`, {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  });

  res.statusCode = upstream.status;
  upstream.headers.forEach((value, key) => {
    if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key)) {
      res.setHeader(key, value);
    }
  });
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

export default async function handler(req, res) {
  if (BACKEND_URL) {
    try {
      await proxyToBackend(req, res);
    } catch (error) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: `No se pudo contactar el backend (${BACKEND_URL}): ${error.message}`,
        }),
      );
    }
    return;
  }

  const app = await getApp();
  return app(req, res);
}
