import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildTemplate, getTemplate, TEMPLATES } from '../server/templates.js';
import {
  buildMenuText,
  buildMenuReply,
  commandBlock,
  defaultMenu,
  detectMenuCommands,
  menuGroups,
  normalizeMenu,
} from '../server/menu.js';
import { processMessage } from '../server/engine.js';

const EXPECTED = [
  'tiktok',
  'instagram',
  'pinterest',
  'ytmp3',
  'ytmp4',
  'facebook',
  'twitter',
  'spotify',
  'mediafire',
  'play',
  'sticker',
  'brat',
  'attp',
  'ttp',
  'gif',
  'emojimix',
  'search',
  'searchpack',
  'take',
  'toimg',
  'tovideo',
  'tomp3',
  'toaudio',
  'togif',
  'pack',
  'gemini',
  'chatgpt',
  'deepseek',
  'help',
  'debug',
];

const bot = () => ({ ...buildTemplate('media'), id: 'bot_test' });

test('la instancia multimedia trae exactamente los 30 comandos del menú', () => {
  const data = bot();
  const visible = data.commands.filter((c) => c.reply.type !== 'menu' && c.showInMenu !== false);
  assert.equal(visible.length, 30);
  assert.deepEqual(visible.map((c) => c.trigger), EXPECTED);
  assert.equal(data.commands.filter((c) => c.reply.type === 'menu').length, 1);
  assert.equal(data.settings.prefix, '.');
});

test('los comandos del menú están agrupados en 6 categorías numeradas', () => {
  const groups = menuGroups(bot());
  assert.equal(groups.length, 6);
  assert.deepEqual(
    groups.map((group) => `${group.index} ${group.name}`),
    [
      '1 Descargas',
      '2 Stickers',
      '3 Conversión',
      '4 Packs',
      '5 Inteligencia artificial',
      '6 Información',
    ],
  );
  assert.equal(groups[0].commands.length, 10);
  assert.equal(groups[1].commands.length, 9);
  assert.equal(groups[3].commands.length, 1);
});

test('el menú automático reproduce el formato del panel', () => {
  const text = buildMenuText(bot(), { name: 'Ana', groupName: 'Equipo Ventas' });
  assert.ok(text.startsWith('╭────────────────────╮'));
  assert.match(text, /MENÚ DE COMANDOS/);
  assert.match(text, /「 INFORMACIÓN 」/);
  assert.match(text, /Nombre: Multimedia del grupo/);
  assert.match(text, /Usuario: Ana/);
  assert.match(text, /Prefijo: \./);
  assert.match(text, /Ayuda: \.help/);
  assert.match(text, /「 01 \| DESCARGAS 」/);
  assert.match(text, /「 06 \| INFORMACIÓN 」/);
  assert.match(text, /\.tiktok\n> Descarga videos de TikTok sin marca de agua\./);
  assert.match(text, /FIN DEL MENÚ/);
  // 30 comandos listados y ningún comando de sistema
  const listed = text.match(/^\.[a-z0-9]+$/gm) || [];
  assert.equal(listed.length, 30);
  assert.ok(!text.includes('.menus'));
});

test('los parámetros {usuario}, {grupo} y {prefijo} se reemplazan', () => {
  const data = bot();
  data.menu.mode = 'manual';
  data.menu.custom =
    'Hola {usuario} 👋\nEstás en {grupo}.\nUsá {prefijo}menu o {ayuda}.\n\n{comandos}';
  const text = buildMenuText(data, { name: 'Lucía', groupName: 'Vecinos' });
  assert.match(text, /Hola Lucía 👋/);
  assert.match(text, /Estás en Vecinos\./);
  assert.match(text, /Usá \.menu o \.help\./);
  assert.match(text, /「 01 \| DESCARGAS 」/);
  assert.ok(!text.includes('{usuario}'));
});

test('una llave desconocida se mantiene tal cual', () => {
  const data = bot();
  data.menu.mode = 'manual';
  data.menu.custom = 'Hola {usuario}, esto es {inventado}';
  const text = buildMenuText(data, { name: 'Ana' });
  assert.match(text, /Hola Ana, esto es \{inventado\}/);
});

test('el banner viaja como imagen con el menú como texto', () => {
  const data = bot();
  data.menu.banner = 'https://cdn.ejemplo.com/banner.jpg';
  const reply = buildMenuReply(data, { name: 'Ana' });
  assert.equal(reply.banner, 'https://cdn.ejemplo.com/banner.jpg');

  const result = processMessage(
    data,
    { text: '.menu' },
    { isGroup: true, name: 'Ana', groupName: 'Equipo Ventas' },
  );
  assert.equal(result.matched, true);
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].kind, 'image');
  assert.equal(result.actions[0].url, 'https://cdn.ejemplo.com/banner.jpg');
  assert.match(result.actions[0].caption, /MENÚ DE COMANDOS/);
});

test('sin banner el menú se envía como texto', () => {
  const result = processMessage(bot(), { text: '.menu' }, { isGroup: true, name: 'Ana' });
  assert.equal(result.actions[0].kind, 'text');
  assert.match(result.actions[0].text, /「 02 \| STICKERS 」/);
});

test('solo los comandos de la lista responden', () => {
  const data = bot();
  const hit = processMessage(data, { text: '.tiktok' }, { isGroup: true, name: 'Ana' });
  assert.equal(hit.matched, true);
  const miss = processMessage(data, { text: '.ping' }, { isGroup: true, name: 'Ana' });
  assert.equal(miss.matched, false);
  const prefijoViejo = processMessage(data, { text: '!tiktok' }, { isGroup: true, name: 'Ana' });
  assert.equal(prefijoViejo.matched, false);
});

test('normalizeMenu valida el banner y los campos de información', () => {
  const menu = normalizeMenu({
    banner: 'javascript:alert(1)',
    info: Array.from({ length: 15 }, (_, index) => ({ label: `L${index}`, value: 'x' })),
    showDescriptions: 'sí',
  });
  assert.equal(menu.banner, '');
  assert.equal(menu.info.length, 10);
  assert.equal(menu.showDescriptions, true);

  const withBanner = normalizeMenu({ banner: ' https://cdn.ejemplo.com/a.png ' });
  assert.equal(withBanner.banner, 'https://cdn.ejemplo.com/a.png');
});

test('detecta comandos reales e inexistentes dentro del menú', () => {
  const data = bot();
  const found = detectMenuCommands(data, '.tiktok\n> video\n.menu\n.noexiste');
  const byTrigger = new Map(found.map((item) => [item.trigger, item]));
  assert.equal(byTrigger.get('tiktok').found, true);
  assert.equal(byTrigger.get('menu').found, true);
  assert.equal(byTrigger.get('noexiste').found, false);
  // La versión (1.0.0) no debe detectarse como el comando ".0"
  const version = detectMenuCommands(data, 'Versión: 1.0.0\nHora: 14.32');
  assert.deepEqual(version, []);
});

test('commandBlock arma el comando con su descripción', () => {
  const data = bot();
  const command = data.commands.find((c) => c.trigger === 'brat');
  assert.equal(commandBlock(command, '.'), '.brat\n> Crea stickers con estilo Brat.');
  assert.equal(commandBlock(command, '.', false), '.brat');
});

test('defaultMenu devuelve las filas del bloque de información', () => {
  const menu = defaultMenu();
  assert.deepEqual(
    menu.info.map((item) => item.label),
    ['Nombre', 'Equipo', 'Prefijo', 'Estado', 'Versión', 'Usuario', 'Ayuda'],
  );
  assert.equal(menu.mode, 'auto');
});

test('la instancia multimedia es la primera de las plantillas', () => {
  assert.equal(TEMPLATES[0].id, 'media');
  assert.ok(getTemplate('media'));
  assert.equal(getTemplate('media').name, 'Multimedia y descargas');
});

/* ------------------------------- API ---------------------------------- */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'botforge-menu-'));
process.env.DATA_DIR = tmpDir;
process.env.SERVERLESS = '1';
delete process.env.AUTH_TOKEN;

const { createApp } = await import('../server/app.js');
const app = createApp({ serveStatic: false });
const server = await new Promise((resolve) => {
  const s = app.listen(0, '127.0.0.1', () => resolve(s));
});
const base = `http://127.0.0.1:${server.address().port}`;

test.after(() => {
  server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const request = (url, options) => fetch(`${base}${url}`, options);
const json = async (url, options) => {
  const res = await request(url, options);
  return { status: res.status, body: await res.json() };
};
const send = (method, url, body) =>
  json(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('el bot nuevo guarda y devuelve su menú', async () => {
  const created = await send('POST', '/api/bots', { template: 'media', name: 'Menú API' });
  assert.equal(created.status, 201);
  assert.equal(created.body.bot.menu.mode, 'auto');
  assert.equal(created.body.bot.menu.banner, '');
  assert.match(created.body.bot.menu.title, /MENÚ/);
});

test('PUT /api/bots/:id/menu guarda el menú y el banner', async () => {
  const { body: created } = await send('POST', '/api/bots', { template: 'media', name: 'Menú 2' });
  const botId = created.bot.id;

  const saved = await send('PUT', `/api/bots/${botId}/menu`, {
    mode: 'manual',
    banner: 'https://cdn.ejemplo.com/banner.png',
    title: 'MENÚ DEL GRUPO',
    custom: 'Hola {usuario}\n\n{comandos}',
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.menu.mode, 'manual');
  assert.equal(saved.body.menu.banner, 'https://cdn.ejemplo.com/banner.png');
  assert.equal(saved.body.bot.menu.title, 'MENÚ DEL GRUPO');

  const preview = await send('POST', `/api/bots/${botId}/menu/preview`, { name: 'Sofía' });
  assert.equal(preview.status, 200);
  assert.match(preview.body.text, /Hola Sofía/);
  assert.match(preview.body.text, /「 01 \| DESCARGAS 」/);
  assert.equal(preview.body.banner, 'https://cdn.ejemplo.com/banner.png');
  assert.equal(preview.body.total, 30);
  assert.equal(preview.body.missing.length, 0);
});

test('la vista previa acepta cambios sin guardar y detecta comandos inválidos', async () => {
  const { body: created } = await send('POST', '/api/bots', { template: 'media', name: 'Menú 3' });
  const botId = created.bot.id;
  const preview = await send('POST', `/api/bots/${botId}/menu/preview`, {
    menu: { mode: 'manual', custom: '.tiktok\n> video\n\n.noexiste' },
    name: 'Ana',
  });
  assert.equal(preview.status, 200);
  assert.deepEqual(preview.body.missing, ['noexiste']);
  const found = preview.body.commands.find((item) => item.trigger === 'tiktok');
  assert.equal(found.found, true);

  const botData = await json(`/api/bots/${botId}`);
  assert.equal(botData.body.bot.menu.mode, 'auto');
});

test('el simulador devuelve el menú completo', async () => {
  const { body: created } = await send('POST', '/api/bots', { template: 'media', name: 'Menú 4' });
  const botId = created.bot.id;
  const simulated = await send('POST', `/api/bots/${botId}/simulate`, {
    text: '.menu',
    name: 'Ana',
    groupName: 'Equipo Ventas',
  });
  assert.equal(simulated.status, 200);
  assert.equal(simulated.body.matched, true);
  assert.equal(simulated.body.actions[0].kind, 'text');
  assert.match(simulated.body.actions[0].text, /「 06 \| INFORMACIÓN 」/);
  assert.match(simulated.body.actions[0].text, /Usuario: Ana/);
});

test('POST /api/bots/:id/menu/reset vuelve al menú por defecto', async () => {
  const { body: created } = await send('POST', '/api/bots', { template: 'media', name: 'Menú 5' });
  const botId = created.bot.id;
  await send('PUT', `/api/bots/${botId}/menu`, { mode: 'manual', custom: 'otra cosa' });
  const reset = await send('POST', `/api/bots/${botId}/menu/reset`, {});
  assert.equal(reset.status, 200);
  assert.equal(reset.body.menu.mode, 'auto');
  assert.notEqual(reset.body.menu.custom, 'otra cosa');
});
