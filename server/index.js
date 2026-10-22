import http from 'node:http';
import { createApp, attachRealtime } from './app.js';
import { whatsapp } from './whatsapp.js';
import { store } from './storage.js';
import {
  DATA_DIR,
  EPHEMERAL_DATA,
  HOST,
  IS_PROD,
  IS_SERVERLESS,
  PORT,
  PUBLIC_URL,
} from './config.js';

const app = createApp({ serveStatic: true });
const server = http.createServer(app);

attachRealtime(server);

server.listen(PORT, HOST, () => {
  console.log(`\n  ⚡ BotForge API escuchando en http://${HOST}:${PORT}`);
  if (PUBLIC_URL) console.log(`  🌐 URL pública: ${PUBLIC_URL}`);
  console.log(`  📁 Datos: ${DATA_DIR}`);
  if (!IS_PROD) console.log('  🖥️  Interfaz de desarrollo: http://localhost:5173');
  if (IS_SERVERLESS) {
    console.log('  ☁️  Modo serverless: WhatsApp real deshabilitado\n');
  } else if (EPHEMERAL_DATA) {
    console.log(
      '  ⚠️  Sin disco persistente: los bots y la sesión de WhatsApp se pierden al reiniciar.',
    );
    console.log('     Para producción seguí la sección A2 de DEPLOY.md.\n');
  } else {
    console.log('');
  }
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
