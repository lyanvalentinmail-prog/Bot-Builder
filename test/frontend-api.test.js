import test from 'node:test';
import assert from 'node:assert/strict';

import { api } from '../src/lib/api.js';

/**
 * Regresión: `fetch` no serializa objetos. Si la capa de API envía el objeto
 * tal cual, el navegador lo convierte en "[object Object]" y el backend
 * responde 400 al parsear el JSON.
 */
function stubFetch() {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    };
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

test('api.post serializa el cuerpo como JSON', async () => {
  const stub = stubFetch();
  try {
    await api.post('/bots', { name: 'Equipo Ventas', emoji: '💬' });
    const [{ url, options }] = stub.calls;
    assert.equal(url, '/api/bots');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), { name: 'Equipo Ventas', emoji: '💬' });
  } finally {
    stub.restore();
  }
});

test('api.put serializa el cuerpo y api.get no envía body', async () => {
  const stub = stubFetch();
  try {
    await api.put('/bots/bot_1', { name: 'Nuevo' });
    await api.get('/bots');
    assert.ok(stub.calls[0].options.body, 'PUT debe llevar body');
    assert.deepEqual(JSON.parse(stub.calls[0].options.body), { name: 'Nuevo' });
    assert.equal(stub.calls[1].options.body, undefined);
    assert.equal(stub.calls[1].options.headers['Content-Type'], undefined);
  } finally {
    stub.restore();
  }
});

test('api.post sin body no envía Content-Type ni body', async () => {
  const stub = stubFetch();
  try {
    await api.post('/bots/bot_1/duplicate');
    const [{ options }] = stub.calls;
    assert.equal(options.body, undefined);
    assert.equal(options.headers['Content-Type'], undefined);
  } finally {
    stub.restore();
  }
});

test('api.del usa el método DELETE', async () => {
  const stub = stubFetch();
  try {
    await api.del('/bots/bot_1');
    assert.equal(stub.calls[0].options.method, 'DELETE');
  } finally {
    stub.restore();
  }
});
