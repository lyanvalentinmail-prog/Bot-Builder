import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, CATALOG_BY_ID, publicCatalog } from '../server/catalog.js';
import { makeCommand } from '../server/defaults.js';

test('el catálogo tiene ids y disparadores únicos', () => {
  const ids = new Set();
  const triggers = new Set();
  for (const plugin of CATALOG) {
    assert.equal(ids.has(plugin.id), false, `id repetido: ${plugin.id}`);
    ids.add(plugin.id);
    const command = makeCommand(plugin.build());
    assert.ok(command.trigger);
    assert.equal(triggers.has(command.trigger), false, `trigger repetido: ${command.trigger}`);
    triggers.add(command.trigger);
    assert.ok(plugin.category);
    assert.ok(plugin.description);
  }
  assert.ok(CATALOG.length >= 20);
});

test('cada plugin se puede construir como comando válido', () => {
  for (const plugin of CATALOG) {
    const command = makeCommand(plugin.build());
    assert.equal(command.enabled, true);
    assert.ok(['text', 'random', 'buttons'].includes(command.reply.type));
    assert.ok(command.reply.text || command.reply.variants.length);
  }
  assert.equal(CATALOG_BY_ID.get('reglas').id, 'reglas');
  assert.equal(publicCatalog().some((plugin) => plugin.build), false);
});
