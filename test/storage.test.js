import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../server/storage.js';

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'botforge-')), 'db.json');

test('crea la base con un bot de ejemplo', () => {
  const store = new Store(tmpFile());
  const bots = store.listBots();
  assert.equal(bots.length, 1);
  assert.ok(bots[0].commands.length > 0);
  assert.equal(bots[0].channels.whatsapp.status, 'disconnected');
});

test('crea, edita, duplica y elimina bots', () => {
  const store = new Store(tmpFile());
  const bot = store.createBot({ name: 'Soporte', template: 'media' });
  assert.equal(bot.name, 'Soporte');
  assert.ok(bot.commands.some((c) => c.trigger === 'menu'));

  const updated = store.updateBot(bot.id, { name: 'Soporte 2' });
  assert.equal(updated.name, 'Soporte 2');

  const copy = store.duplicateBot(bot.id);
  assert.notEqual(copy.id, bot.id);
  assert.equal(copy.commands[0].id !== bot.commands[0].id, true);
  assert.equal(copy.channels.teams, undefined);

  assert.equal(store.deleteBot(bot.id), true);
  assert.equal(store.getBot(bot.id), null);
});

test('persiste y normaliza los datos al releer', () => {
  const file = tmpFile();
  const store = new Store(file);
  const bot = store.createBot({ name: 'Persistente', template: 'custom' });
  store.updateBot(bot.id, { settings: { ...bot.settings, prefix: '#' } });

  const reloaded = new Store(file);
  const found = reloaded.getBot(bot.id);
  assert.equal(found.name, 'Persistente');
  assert.equal(found.settings.prefix, '#');
  assert.equal(found.channels.whatsapp.status, 'disconnected');
});

test('normaliza bots importados incompletos', () => {
  const file = tmpFile();
  const store = new Store(file);
  const bot = store.createBot({
    name: 'Importado',
    commands: [{ name: 'X', trigger: 'x' }],
    reactions: undefined,
    texts: undefined,
  });
  assert.equal(bot.commands[0].reply.type, 'text');
  assert.ok(Array.isArray(bot.reactions));
  assert.ok(Array.isArray(bot.texts));
  assert.equal(bot.autoReact.enabled, true);
});
