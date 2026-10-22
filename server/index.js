import http from 'node:http';
import { createApp, attachRealtime } from './app.js';
import { whatsapp } from './whatsapp.js';
import { store } from './storage.js';
import { HOST, IS_PROD, IS_SERVERLESS, PORT } from './config.js';

const app = createApp({ serveStatic: true });
const server = http.createServer(app);

attachRealtime(server);

server.listen(PORT, HOST, () => {
  console.log(`\n  ⚡ BotForge API escuchando en http://${HOST}:${PORT}`);
  if (!IS_PROD) console.log('  🖥️  Interfaz de desarrollo: http://localhost:5173');
  if (IS_SERVERLESS) console.log('  ☁️  Modo serverless: canales persistentes deshabilitados\n');
  else console.log('');
});

const shutdown = async () => {
  console.log('\n[server] cerrando…');
  for (const bot of store.listBots()) {
    try {
      await whatsapp.stop(bot.id);
    } catch {
      /* noop */
    }
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 4000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
