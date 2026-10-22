import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { deployInfo } from '../server/deploy.js';

test('servidor persistente: canales y datos disponibles', () => {
  const info = deployInfo({ corsOrigins: ['*'], publicUrl: 'https://bot.example.com' });
  assert.equal(info.mode, 'server');
  assert.equal(info.serverless, false);
  assert.equal(info.ephemeral, false);
  assert.equal(info.persistentChannels, true);
  assert.equal(info.persistentData, true);
  assert.equal(info.warning, null);
  assert.match(info.hint, /vincular|vincular/i);
});

test('Render Free: canales sí, datos efímeros', () => {
  const info = deployInfo({ ephemeralData: true });
  assert.equal(info.mode, 'ephemeral');
  assert.equal(info.serverless, false);
  assert.equal(info.ephemeral, true);
  // WhatsApp funciona mientras el servicio está despierto…
  assert.equal(info.persistentChannels, true);
  // …pero los datos no sobreviven reinicios.
  assert.equal(info.persistentData, false);
  assert.match(info.warning, /disco persistente/);
  assert.match(info.hint, /DEPLOY\.md/);
});

test('serverless: canales reales bloqueados', () => {
  const info = deployInfo({ serverless: true, authToken: 'abc' });
  assert.equal(info.mode, 'serverless');
  assert.equal(info.ephemeral, true);
  assert.equal(info.persistentChannels, false);
  assert.equal(info.authRequired, true);
  assert.match(info.hint, /Render/);
  assert.match(info.warning, /\/tmp/);
});

test('el blueprint de Render no pide disco en el plan free', () => {
  const yaml = fs.readFileSync(path.join(process.cwd(), 'render.yaml'), 'utf8');
  // Render rechaza TODO el blueprint si hay un disk con plan free.
  assert.match(yaml, /plan: free/);
  const activeLines = yaml
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');
  assert.doesNotMatch(activeLines, /^\s*disk:/m);
  assert.doesNotMatch(activeLines, /^\s*mountPath:/m);
  // Campos requeridos por el spec actual.
  assert.match(activeLines, /runtime: node/);
  assert.match(activeLines, /buildCommand: npm ci --include=dev && npm run build/);
  assert.match(activeLines, /startCommand: npm start/);
  assert.match(activeLines, /healthCheckPath: \/api\/health/);
  assert.match(activeLines, /EPHEMERAL_DATA/);
  // El archivo debe estar en la raíz del repositorio.
  assert.ok(fs.existsSync(path.join(process.cwd(), 'render.yaml')));
});

test('el blueprint de Vercel apunta a la función correcta', () => {
  const json = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'));
  assert.equal(json.framework, 'vite');
  assert.equal(json.outputDirectory, 'dist');
  assert.ok(json.rewrites.some((rule) => rule.destination === '/index.html'));
  assert.ok(fs.existsSync(path.join(process.cwd(), 'api/[...route].js')));
});
