import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import { Server as SocketServer } from 'socket.io';
import { api } from './api.js';
import { whatsapp } from './whatsapp.js';
import { store } from './storage.js';
import { AUTH_TOKEN, CORS_ORIGINS, IS_PROD, WEB_DIST } from './config.js';

const parseCookies = (header = '') =>
  header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index > -1) acc[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1));
    return acc;
  }, {});

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const loginPage = () => `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>BotForge · Acceso</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070a12;color:#e8ecf8;font-family:system-ui,sans-serif}
form{background:#111726;border:1px solid rgba(255,255,255,.1);padding:28px;border-radius:16px;display:flex;flex-direction:column;gap:12px;width:min(340px,90vw)}
h1{font-size:18px;margin:0}p{color:#7c87a1;font-size:12px;margin:0}
input{height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#070a12;color:#fff;padding:0 12px;font-size:14px}
button{height:40px;border:none;border-radius:10px;background:linear-gradient(140deg,#6d6cf5,#9a6bff);color:#fff;font-weight:600;cursor:pointer}</style>
</head><body><form method="get" action="/">
<h1>⚡ BotForge</h1><p>Ingresá el token de acceso configurado en AUTH_TOKEN.</p>
<input type="password" name="token" placeholder="Token de acceso" autofocus required>
<button type="submit">Entrar</button></form></body></html>`;

/** CORS configurable: `CORS_ORIGINS="*"` o una lista separada por comas. */
function corsMiddleware(req, res, next) {
  const origin = req.get('origin');
  const allowAll = CORS_ORIGINS.includes('*');
  if (origin) {
    const allowed = allowAll || CORS_ORIGINS.includes(origin);
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', allowAll ? '*' : origin);
      if (!allowAll) res.setHeader('Vary', 'Origin');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

/**
 * Crea la aplicación Express completa (API + webhooks + estáticos opcionales).
 * Se reutiliza tanto en el servidor persistente como en la función serverless de Vercel.
 */
export function createApp({ serveStatic = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(corsMiddleware);

  if (AUTH_TOKEN) {
    app.use((req, res, next) => {
      // La salud del servicio queda abierta para el health check del hosting.
      if (req.path === '/api/health') {
        return next();
      }
      const bearer = req.get('authorization')?.replace(/^Bearer\s+/i, '');
      const token =
        req.get('x-auth-token') ||
        req.query.token ||
        bearer ||
        parseCookies(req.headers.cookie).botforge_token;
      if (token && safeEqual(token, AUTH_TOKEN)) {
        if (typeof req.query.token === 'string') {
          res.setHeader(
            'Set-Cookie',
            `botforge_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
          );
        }
        return next();
      }
      if (req.path.startsWith('/api') || !serveStatic) {
        return res.status(401).json({ error: 'No autorizado: falta el token de acceso' });
      }
      return res.status(401).type('html').send(loginPage());
    });
  }

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.use('/api', api);

  // Cualquier ruta /api desconocida responde JSON (antes del handler estático).
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} /api${req.path}` });
  });

  /* ------------------------------- estáticos ------------------------------ */

  if (serveStatic && IS_PROD && fs.existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST, { index: false, maxAge: '1h' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      return res.sendFile(path.join(WEB_DIST, 'index.html'));
    });
  } else if (serveStatic) {
    app.get('/', (req, res) => {
      res.type('text/plain').send(
        'BotForge API en ejecución.\n' +
          'En desarrollo abrí la interfaz de Vite (por defecto http://localhost:5173).\n' +
          'Endpoints: /api/health, /api/meta, /api/bots',
      );
    });
  }

  app.use((error, req, res, next) => {
    console.error('[server]', error);
    if (res.headersSent) return next(error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  });

  return app;
}

/** Socket.IO: estado en vivo de WhatsApp. Solo en servidores persistentes. */
export function attachRealtime(server) {
  const io = new SocketServer(server, {
    cors: {
      origin: CORS_ORIGINS.includes('*') ? true : CORS_ORIGINS,
      credentials: true,
    },
    maxHttpBufferSize: 1e6,
  });

  if (AUTH_TOKEN) {
    io.use((socket, next) => {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        parseCookies(socket.handshake.headers.cookie || '').botforge_token;
      if (token && safeEqual(token, AUTH_TOKEN)) return next();
      return next(new Error('No autorizado'));
    });
  }

  whatsapp.attachIo(io);

  io.on('connection', (socket) => {
    socket.on('bot:join', (payload = {}) => {
      const botId = typeof payload === 'string' ? payload : payload.botId;
      if (!botId || !store.getBot(botId)) return;
      for (const room of socket.rooms) {
        if (room.startsWith('bot:')) socket.leave(room);
      }
      socket.join(`bot:${botId}`);
      const status = whatsapp.status(botId);
      socket.emit('whatsapp:status', {
        botId,
        ...status,
        phone: status.phone || store.getBot(botId)?.channels.whatsapp.phone || '',
      });
      if (status.qr) socket.emit('whatsapp:qr', { botId, qr: status.qr });
      if (status.pairingCode) {
        socket.emit('whatsapp:pairing', { botId, code: status.pairingCode });
      }
      socket.emit('ready', { botId, at: new Date().toISOString() });
    });
  });

  return io;
}
