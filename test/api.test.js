import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'botforge-api-'));
process.env.DATA_DIR = tmpDir;
process.env.SERVERLESS = '1';
delete process.env.AUTH_TOKEN;

const { createApp } = await import('../server/app.js');

const app = createApp({ serveStatic: false });
const server = await new Promise((resolve) => {
  const s = app.listen(0, '127.0.0.1', () => resolve(s));
});
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

test.after(() => {
  server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const get = (path, options) => fetch(`${base}${path}`, options);

test('GET /api/health responde sin autenticación', async () => {
  const res = await get('/api/health');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
});

test('GET /api/meta indica el modo serverless y los canales', async () => {
  const res = await get('/api/meta');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.deploy.serverless, true);
  assert.equal(data.deploy.ephemeral, true);
  assert.equal(data.deploy.persistentChannels, false);
  assert.equal(data.deploy.persistentData, false);
  assert.equal(data.deploy.mode, 'serverless');
  assert.ok(Array.isArray(data.templates));
  assert.ok(data.deploy.hint.includes('Render'));
});

test('CORS refleja el origen y responde al preflight', async () => {
  const preflight = await get('/api/bots', {
    method: 'OPTIONS',
    headers: { Origin: 'https://panel.example.com', 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
  assert.match(preflight.headers.get('access-control-allow-headers'), /x-auth-token/);

  const res = await get('/api/bots', { headers: { Origin: 'https://panel.example.com' } });
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

test('flujo de bot: crear, simular y exportar', async () => {
  const created = await get('/api/bots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template: 'support', name: 'API Test' }),
  });
  assert.equal(created.status, 201);
  const { bot } = await created.json();
  assert.equal(bot.name, 'API Test');
  assert.ok(bot.commands.length > 0);

  const simulated = await get(`/api/bots/${bot.id}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '!horario', name: 'Ana' }),
  });
  const result = await simulated.json();
  assert.equal(result.matched, true);
  assert.match(result.actions[0].text, /horario/i);

  const exported = await get(`/api/bots/${bot.id}/export`);
  assert.equal(exported.status, 200);
  const payload = await exported.json();
  assert.equal(payload.kind, 'botforge-bot');
  assert.ok(payload.bot.commands.length > 0);
});

test('WhatsApp real se bloquea en serverless con un mensaje claro', async () => {
  const bots = await (await get('/api/bots')).json();
  const botId = bots.bots[0].id;

  const wa = await get(`/api/bots/${botId}/whatsapp/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'qr' }),
  });
  assert.equal(wa.status, 501);
  const waData = await wa.json();
  assert.equal(waData.code, 'SERVERLESS_WHATSAPP_UNSUPPORTED');
});

test('el catálogo expone comandos e instalarlos crea el comando real', async () => {
  const catalog = await (await get('/api/catalog')).json();
  assert.ok(catalog.plugins.length >= 10);
  assert.ok(catalog.categories.some((c) => c.id === 'moderacion'));

  const created = await (
    await get('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: 'starter', name: 'Catálogo Test' }),
    })
  ).json();
  const botId = created.bot.id;

  const install = await get(`/api/bots/${botId}/catalog/reglas`, { method: 'POST' });
  assert.equal(install.status, 201);
  const installed = await install.json();
  assert.equal(installed.command.trigger, 'reglas');

  const repeated = await get(`/api/bots/${botId}/catalog/reglas`, { method: 'POST' });
  assert.equal(repeated.status, 409);

  const simulated = await (
    await get(`/api/bots/${botId}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '!reglas' }),
    })
  ).json();
  assert.equal(simulated.matched, true);
  assert.match(simulated.actions[0].text, /Reglas del grupo/);
});

test('las métricas y los grupos salen de datos reales del servidor', async () => {
  const metrics = await (await get('/api/metrics')).json();
  assert.ok(metrics.totals.bots >= 2);
  assert.ok(metrics.totals.commands > 0);
  assert.equal(typeof metrics.uptimeSeconds, 'number');
  assert.ok(Array.isArray(metrics.perBot));
  assert.equal(metrics.perBot.length, metrics.totals.bots);

  const bots = await (await get('/api/bots')).json();
  const groups = await (await get(`/api/bots/${bots.bots[0].id}/groups`)).json();
  assert.equal(groups.connected, false);
  assert.deepEqual(groups.groups, []);

  const links = await (await get('/api/links')).json();
  assert.ok(links.links.some((l) => l.id === 'repo'));
});

test('las rutas desconocidas responden JSON 404', async () => {
  const res = await get('/api/no-existe');
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.ok(data.error);
});
