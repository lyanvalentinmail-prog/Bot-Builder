import express from 'express';
import { store } from './storage.js';
import { whatsapp } from './whatsapp.js';
import { teams } from './teams.js';
import { TEMPLATES, getTemplate } from './templates.js';
import { processMessage, extractCommandName, findCommand } from './engine.js';
import {
  buildVariables,
  commandListMarkup,
  formatDate,
  formatLongDate,
  VARIABLES,
} from './template.js';
import {
  makeCommand,
  MATCH_TYPES,
  REPLY_TYPES,
  SCOPES,
  defaultSettings,
  defaultAutoReact,
} from './defaults.js';
import { asString, digitsOnly, uid, clamp } from './util.js';
import {
  AUTH_TOKEN,
  CORS_ORIGINS,
  DATA_DIR,
  EPHEMERAL_DATA,
  IS_SERVERLESS,
  PUBLIC_URL,
} from './config.js';
import { deployInfo } from './deploy.js';

export const api = express.Router();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const botSummary = (bot) => ({
  id: bot.id,
  name: bot.name,
  emoji: bot.emoji,
  description: bot.description,
  template: bot.template,
  updatedAt: bot.updatedAt,
  commands: bot.commands.filter((c) => c.enabled !== false).length,
  reactions: bot.reactions.filter((r) => r.enabled !== false).length,
  texts: bot.texts.length,
  stats: bot.stats,
  whatsapp: {
    status: whatsapp.status(bot.id).status,
    connected: whatsapp.status(bot.id).status === 'connected',
    phone: bot.channels.whatsapp.phone,
  },
  teams: {
    status: bot.channels.teams.enabled ? bot.channels.teams.status : 'not_configured',
    configured: Boolean(bot.channels.teams.appId && bot.channels.teams.appPassword),
  },
});

const publicBot = (bot) => ({
  ...bot,
  channels: {
    whatsapp: {
      ...bot.channels.whatsapp,
      ...whatsapp.status(bot.id),
    },
    teams: {
      ...bot.channels.teams,
      appPassword: bot.channels.teams.appPassword ? '********' : '',
      status: bot.channels.teams.enabled ? bot.channels.teams.status : 'not_configured',
      endpoint: `/api/teams/${bot.id}/messages`,
    },
  },
});

const requireBot = (req, res, next) => {
  const bot = store.getBot(req.params.id);
  if (!bot) return res.status(404).json({ error: 'Bot no encontrado' });
  req.bot = bot;
  return next();
};

function cleanSettings(input = {}, previous = defaultSettings()) {
  const s = { ...previous };
  if (typeof input !== 'object' || input === null) return s;
  if (typeof input.prefix === 'string') s.prefix = input.prefix.slice(0, 3) || '!';
  for (const key of [
    'prefixRequired',
    'caseSensitive',
    'ignoreGroups',
    'readReceipts',
    'unknownCommandEnabled',
    'fallbackEnabled',
    'welcomeEnabled',
  ]) {
    if (typeof input[key] === 'boolean') s[key] = input[key];
  }
  for (const key of [
    'unknownCommandText',
    'fallbackText',
    'welcomeText',
    'signature',
  ]) {
    if (typeof input[key] === 'string') s[key] = input[key].slice(0, 2000);
  }
  return s;
}

function cleanAutoReact(input = {}, previous = defaultAutoReact()) {
  const r = { ...previous };
  if (typeof input !== 'object' || input === null) return r;
  if (typeof input.enabled === 'boolean') r.enabled = input.enabled;
  if (typeof input.onCommands === 'boolean') r.onCommands = input.onCommands;
  if (Array.isArray(input.emojis)) {
    r.emojis = input.emojis
      .filter((e) => typeof e === 'string' && e.trim())
      .slice(0, 12)
      .map((e) => e.slice(0, 12));
  }
  if (Number.isFinite(Number(input.chance))) r.chance = clamp(Number(input.chance), 0, 100);
  if (Number.isFinite(Number(input.removeAfterSeconds))) {
    r.removeAfterSeconds = clamp(Number(input.removeAfterSeconds), 0, 3600);
  }
  if (SCOPES.includes(input.scope)) r.scope = input.scope;
  return r;
}

function cleanText(input = {}, previous = {}) {
  const name = asString(input.name ?? previous.name, 80).trim() || 'Plantilla';
  const rawSlug = asString(input.slug ?? previous.slug, 60).toLowerCase().trim();
  const slug =
    rawSlug
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || `texto_${uid()}`;
  return {
    id: previous.id || uid('txt_'),
    name,
    slug,
    content: asString(input.content ?? previous.content, 8000),
    description: asString(input.description ?? previous.description, 200),
  };
}

function cleanReaction(input = {}, previous = {}) {
  return {
    id: previous.id || uid('rx_'),
    name: asString(input.name ?? previous.name, 60).trim() || 'Reacción',
    enabled: typeof input.enabled === 'boolean' ? input.enabled : previous.enabled !== false,
    emoji: asString(input.emoji ?? previous.emoji, 12) || '👍',
    on: ['every', 'keyword', 'command', 'regex', 'dm', 'group', 'mention'].includes(input.on)
      ? input.on
      : previous.on || 'keyword',
    pattern: asString(input.pattern ?? previous.pattern, 300),
    scope: SCOPES.includes(input.scope) ? input.scope : previous.scope || 'all',
    chance: Number.isFinite(Number(input.chance))
      ? clamp(Number(input.chance), 0, 100)
      : previous.chance ?? 100,
    removeAfterSeconds: Number.isFinite(Number(input.removeAfterSeconds))
      ? clamp(Number(input.removeAfterSeconds), 0, 3600)
      : previous.removeAfterSeconds ?? 0,
  };
}

/* ----------------------------- meta ----------------------------- */

api.get('/health', (req, res) => res.json({ ok: true, at: new Date().toISOString() }));

api.get('/meta', (req, res) => {
  res.json({
    app: 'BotForge',
    version: '1.0.0',
    variables: VARIABLES,
    templates: TEMPLATES.map(({ build, ...rest }) => rest),
    matchTypes: MATCH_TYPES,
    replyTypes: REPLY_TYPES,
    scopes: SCOPES,
    limits: { commands: 60, reactions: 40, texts: 40, aliases: 10 },
    whatsappEngine: 'Baileys (WhatsApp Web multi-dispositivo)',
    teamsEngine: 'Bot Framework SDK v4',
    deploy: deployInfo({
      serverless: IS_SERVERLESS,
      ephemeralData: EPHEMERAL_DATA,
      authToken: AUTH_TOKEN,
      corsOrigins: CORS_ORIGINS,
      publicUrl: PUBLIC_URL,
      dataDir: DATA_DIR,
    }),
  });
});

/* ----------------------------- bots ----------------------------- */

api.get('/bots', (req, res) => {
  res.json({ bots: store.listBots().map(botSummary) });
});

api.post('/bots', (req, res) => {
  const template = getTemplate(req.body?.template) || getTemplate('starter');
  const data = template.build();
  if (typeof req.body?.name === 'string' && req.body.name.trim()) {
    data.name = req.body.name.trim().slice(0, 60);
  }
  if (typeof req.body?.emoji === 'string' && req.body.emoji.trim()) {
    data.emoji = req.body.emoji.slice(0, 8);
  }
  if (typeof req.body?.description === 'string' && req.body.description.trim()) {
    data.description = req.body.description.trim().slice(0, 240);
  }
  data.template = template.id;
  const bot = store.createBot(data);
  res.status(201).json({ bot: publicBot(bot) });
});

api.get('/bots/:id', requireBot, (req, res) => {
  res.json({ bot: publicBot(req.bot) });
});

api.put('/bots/:id', requireBot, (req, res) => {
  const body = req.body || {};
  if (typeof body.name === 'string' && body.name.trim()) req.bot.name = body.name.trim().slice(0, 60);
  if (typeof body.emoji === 'string' && body.emoji.trim()) req.bot.emoji = body.emoji.slice(0, 8);
  if (typeof body.description === 'string') req.bot.description = body.description.slice(0, 240);
  if (body.settings) req.bot.settings = cleanSettings(body.settings, req.bot.settings);
  if (body.autoReact) req.bot.autoReact = cleanAutoReact(body.autoReact, req.bot.autoReact);
  store.saveBot(req.bot);
  res.json({ bot: publicBot(req.bot) });
});

api.delete('/bots/:id', requireBot, async (req, res) => {
  await whatsapp.stop(req.bot.id, { logout: true });
  await teams.stop(req.bot.id);
  store.deleteBot(req.bot.id);
  res.json({ ok: true });
});

api.post('/bots/:id/duplicate', requireBot, (req, res) => {
  const copy = store.duplicateBot(req.bot.id);
  res.status(201).json({ bot: publicBot(copy) });
});

api.get('/bots/:id/export', requireBot, (req, res) => {
  const { channels, stats, ...config } = req.bot;
  res.setHeader('Content-Disposition', `attachment; filename="${req.bot.id}.json"`);
  res.json({
    kind: 'botforge-bot',
    version: 1,
    exportedAt: new Date().toISOString(),
    bot: config,
  });
});

api.post('/bots/import', (req, res) => {
  const payload = req.body?.bot || req.body;
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.commands)) {
    return res.status(400).json({ error: 'Archivo inválido: falta la lista de comandos' });
  }
  const bot = store.createBot({
    ...payload,
    id: undefined,
    name: `${(payload.name || 'Bot importado').slice(0, 50)}`,
    template: 'imported',
    channels: undefined,
    stats: undefined,
  });
  res.status(201).json({ bot: publicBot(bot) });
});

/* --------------------------- comandos --------------------------- */

api.post('/bots/:id/commands', requireBot, (req, res) => {
  if (req.bot.commands.length >= 60) {
    return res.status(400).json({ error: 'Máximo 60 comandos por bot' });
  }
  const command = makeCommand({ ...req.body, id: undefined });
  if (!command.trigger) return res.status(400).json({ error: 'El disparador es obligatorio' });
  req.bot.commands.push(command);
  store.saveBot(req.bot);
  return res.status(201).json({ command, bot: publicBot(req.bot) });
});

api.put('/bots/:id/commands/:commandId', requireBot, (req, res) => {
  const index = req.bot.commands.findIndex((c) => c.id === req.params.commandId);
  if (index === -1) return res.status(404).json({ error: 'Comando no encontrado' });
  const merged = makeCommand({ ...req.bot.commands[index], ...req.body, id: req.params.commandId });
  if (!merged.trigger) return res.status(400).json({ error: 'El disparador es obligatorio' });
  req.bot.commands[index] = merged;
  store.saveBot(req.bot);
  return res.json({ command: merged, bot: publicBot(req.bot) });
});

api.delete('/bots/:id/commands/:commandId', requireBot, (req, res) => {
  req.bot.commands = req.bot.commands.filter((c) => c.id !== req.params.commandId);
  store.saveBot(req.bot);
  res.json({ bot: publicBot(req.bot) });
});

api.post('/bots/:id/commands/:commandId/duplicate', requireBot, (req, res) => {
  const source = req.bot.commands.find((c) => c.id === req.params.commandId);
  if (!source) return res.status(404).json({ error: 'Comando no encontrado' });
  const copy = makeCommand({
    ...structuredClone(source),
    id: undefined,
    name: `${source.name} (copia)`,
    trigger: `${source.trigger}_copia`,
    aliases: [],
    usageCount: 0,
  });
  req.bot.commands.push(copy);
  store.saveBot(req.bot);
  res.status(201).json({ command: copy, bot: publicBot(req.bot) });
});

api.post('/bots/:id/commands/reorder', requireBot, (req, res) => {
  const order = Array.isArray(req.body?.order) ? req.body.order : [];
  const map = new Map(req.bot.commands.map((c) => [c.id, c]));
  const next = order.map((id) => map.get(id)).filter(Boolean);
  for (const c of req.bot.commands) if (!next.includes(c)) next.push(c);
  req.bot.commands = next;
  store.saveBot(req.bot);
  res.json({ bot: publicBot(req.bot) });
});

/* --------------------------- plantillas -------------------------- */

api.post('/bots/:id/texts', requireBot, (req, res) => {
  if (req.bot.texts.length >= 40) {
    return res.status(400).json({ error: 'Máximo 40 plantillas de texto' });
  }
  const text = cleanText(req.body);
  const duplicateSlug = req.bot.texts.some((t) => t.slug === text.slug);
  if (duplicateSlug) text.slug = `${text.slug}_${uid().slice(0, 4)}`;
  req.bot.texts.push(text);
  store.saveBot(req.bot);
  return res.status(201).json({ text, bot: publicBot(req.bot) });
});

api.put('/bots/:id/texts/:textId', requireBot, (req, res) => {
  const index = req.bot.texts.findIndex((t) => t.id === req.params.textId);
  if (index === -1) return res.status(404).json({ error: 'Plantilla no encontrada' });
  const updated = cleanText(req.body, req.bot.texts[index]);
  const collision = req.bot.texts.some((t) => t.id !== updated.id && t.slug === updated.slug);
  if (collision) return res.status(400).json({ error: 'Ya existe una plantilla con ese slug' });
  req.bot.texts[index] = updated;
  store.saveBot(req.bot);
  return res.json({ text: updated, bot: publicBot(req.bot) });
});

api.delete('/bots/:id/texts/:textId', requireBot, (req, res) => {
  req.bot.texts = req.bot.texts.filter((t) => t.id !== req.params.textId);
  store.saveBot(req.bot);
  res.json({ bot: publicBot(req.bot) });
});

/* --------------------------- reacciones -------------------------- */

api.post('/bots/:id/reactions', requireBot, (req, res) => {
  if (req.bot.reactions.length >= 40) {
    return res.status(400).json({ error: 'Máximo 40 reacciones' });
  }
  const reaction = cleanReaction(req.body);
  req.bot.reactions.push(reaction);
  store.saveBot(req.bot);
  return res.status(201).json({ reaction, bot: publicBot(req.bot) });
});

api.put('/bots/:id/reactions/:reactionId', requireBot, (req, res) => {
  const index = req.bot.reactions.findIndex((r) => r.id === req.params.reactionId);
  if (index === -1) return res.status(404).json({ error: 'Reacción no encontrada' });
  req.bot.reactions[index] = cleanReaction(req.body, req.bot.reactions[index]);
  store.saveBot(req.bot);
  return res.json({ reaction: req.bot.reactions[index], bot: publicBot(req.bot) });
});

api.delete('/bots/:id/reactions/:reactionId', requireBot, (req, res) => {
  req.bot.reactions = req.bot.reactions.filter((r) => r.id !== req.params.reactionId);
  store.saveBot(req.bot);
  res.json({ bot: publicBot(req.bot) });
});

/* ---------------------------- simular ---------------------------- */

function channelLabel(channel) {
  return channel === 'teams' ? 'Microsoft Teams' : 'WhatsApp';
}

api.post('/bots/:id/simulate', requireBot, async (req, res) => {
  const channel = req.body?.channel === 'teams' ? 'teams' : 'whatsapp';
  const rawText = asString(req.body?.text, 2000).trim();
  if (!rawText) return res.status(400).json({ error: 'Escribí un mensaje para probar' });

  const name = asString(req.body?.name, 60).trim() || 'Ana';
  const isGroup = Boolean(req.body?.isGroup);
  let text = rawText;
  if (channel === 'teams') text = teams.normalizeIncomingText(req.bot, rawText);

  const date = new Date();
  const groupName = isGroup ? asString(req.body?.groupName, 60) || 'Equipo Ventas' : '';
  const ctx = {
    isGroup,
    channel: channelLabel(channel),
    groupName,
    name,
    number: isGroup ? '+598 99 123 456' : '+598 99 123 456',
    mentionedMe: Boolean(req.body?.mentionedMe),
    date,
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    dateString: formatDate(date),
    longDate: formatLongDate(date),
    commandList: commandListMarkup(req.bot.commands, req.bot.settings.prefix, channel),
  };

  const result = processMessage(
    req.bot,
    { text },
    { ...ctx, vars: buildVariables(req.bot, ctx, req.bot.texts) },
  );

  const reactions = result.reactions.slice(0, 1);

  // Si el canal no soporta botones nativos, mostramos las opciones como texto.
  const normalizedActions = result.actions.map((a) => {
    if (a.kind !== 'buttons') return a;
    const lines = (a.buttons || []).map((b, i) => `${i + 1}️⃣ ${b.label}`).join('\n');
    return {
      kind: 'buttons',
      text: [a.text, lines].filter(Boolean).join('\n\n'),
      footer: a.footer,
      buttons: a.buttons,
      delayMs: a.delayMs,
    };
  });

  res.json({
    channel,
    input: { text: rawText, normalized: text, name, isGroup },
    matched: Boolean(result.matched),
    command: result.command
      ? {
          id: result.command.id,
          name: result.command.name,
          trigger: result.command.trigger,
          matchType: result.command.matchType,
        }
      : null,
    enteredCommand: extractCommandName(text, req.bot.settings),
    reactions,
    actions: normalizedActions,
    teamsNote:
      channel === 'teams'
        ? 'En Teams las reacciones nativas no se pueden enviar por API: se muestran solo en WhatsApp.'
        : null,
  });
});

/* --------------------------- whatsapp --------------------------- */

api.get('/bots/:id/whatsapp', requireBot, (req, res) => {
  res.json({ whatsapp: { ...whatsapp.status(req.bot.id), phone: req.bot.channels.whatsapp.phone } });
});

api.post('/bots/:id/whatsapp/start', requireBot, async (req, res) => {
  if (IS_SERVERLESS) {
    return res.status(501).json({
      error:
        'La vinculación real de WhatsApp requiere un servidor persistente (Render, Railway o un VPS): las funciones serverless no mantienen la conexión WebSocket ni el disco de sesión. Podés probar todo el editor y el simulador acá.',
      code: 'SERVERLESS_WHATSAPP_UNSUPPORTED',
    });
  }
  const method = req.body?.method === 'pairing' ? 'pairing' : 'qr';
  const phone = digitsOnly(req.body?.phone || req.bot.channels.whatsapp.phone || '');
  if (method === 'pairing' && phone.length < 8) {
    return res.status(400).json({
      error: 'Escribí tu número con código de país (solo números), por ejemplo 59899123456',
    });
  }
  try {
    const status = await whatsapp.start(req.bot.id, { method, phone });
    return res.json({ ok: true, method, status });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

api.post('/bots/:id/whatsapp/stop', requireBot, async (req, res) => {
  await whatsapp.stop(req.bot.id, { logout: Boolean(req.body?.logout) });
  res.json({ ok: true, status: whatsapp.status(req.bot.id) });
});

api.get('/bots/:id/whatsapp/qr', requireBot, (req, res) => {
  const status = whatsapp.status(req.bot.id);
  if (!status.qr) return res.status(404).json({ error: 'No hay un QR disponible' });
  res.json({ qr: status.qr });
});

api.post('/bots/:id/whatsapp/test', requireBot, async (req, res) => {
  if (IS_SERVERLESS) {
    return res.status(501).json({
      error: 'El envío de mensajes de prueba necesita un servidor persistente con WhatsApp conectado.',
      code: 'SERVERLESS_WHATSAPP_UNSUPPORTED',
    });
  }
  const jid = asString(req.body?.jid, 40).trim();
  const text = asString(req.body?.text, 2000).trim();
  if (!jid || !text) return res.status(400).json({ error: 'Indicá número y mensaje' });
  try {
    await whatsapp.sendTestMessage(req.bot.id, jid, text);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* ----------------------------- teams ---------------------------- */

api.get('/bots/:id/teams', requireBot, (req, res) => {
  res.json({ teams: teams.status(req.bot.id) });
});

api.put('/bots/:id/teams/credentials', requireBot, async (req, res) => {
  const { appId, appPassword, tenantId } = req.body || {};
  const t = req.bot.channels.teams;
  if (typeof appId === 'string') t.appId = appId.trim().slice(0, 120);
  if (typeof appPassword === 'string' && appPassword && appPassword !== '********') {
    t.appPassword = appPassword.trim().slice(0, 200);
  }
  if (typeof tenantId === 'string') t.tenantId = tenantId.trim().slice(0, 120);
  if (appId === '' || appPassword === '') {
    t.enabled = false;
    t.status = 'not_configured';
  }
  store.saveBot(req.bot);
  teams.adapters.delete(req.bot.id);
  res.json({ teams: teams.status(req.bot.id) });
});

api.post('/bots/:id/teams/start', requireBot, async (req, res) => {
  if (IS_SERVERLESS) {
    return res.status(501).json({
      error:
        'El canal de Teams necesita un servidor persistente para mantener las credenciales y validar sesiones. En serverless podés guardar las credenciales y usar el simulador, pero no activar el canal.',
      code: 'SERVERLESS_TEAMS_UNSUPPORTED',
    });
  }
  try {
    const status = await teams.start(req.bot.id);
    res.json({ ok: true, teams: status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

api.post('/bots/:id/teams/stop', requireBot, async (req, res) => {
  const status = await teams.stop(req.bot.id);
  res.json({ ok: true, teams: status });
});

api.post('/bots/:id/teams/simulate', requireBot, async (req, res) => {
  const text = asString(req.body?.text, 2000).trim();
  if (!text) return res.status(400).json({ error: 'Escribí un mensaje' });
  const result = await teams.simulate(req.bot.id, {
    text,
    name: asString(req.body?.name, 60) || 'Ana (simulación)',
  });
  const normalizedActions = result.actions.map((a) =>
    a.kind === 'buttons'
      ? {
          ...a,
          text: [a.text, ...(a.buttons || []).map((b, i) => `${i + 1}️⃣ ${b.label}`)].join('\n\n'),
        }
      : a,
  );
  res.json({
    channel: 'teams',
    input: { text, normalized: result.normalizedText },
    matched: result.matched,
    command: result.command
      ? { id: result.command.id, name: result.command.name, trigger: result.command.trigger }
      : null,
    reactions: result.reactions,
    actions: normalizedActions,
  });
});

api.get('/bots/:id/logs', requireBot, (req, res) => {
  res.json({ logs: [] });
});

api.use((error, req, res, next) => {
  console.error('[api]', error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: error.message || 'Error interno' });
});

/* ------------------------ utilidades extra ---------------------- */

api.get('/bots/:id/lookup', requireBot, (req, res) => {
  const text = asString(req.query.text, 500);
  const command = findCommand(req.bot, text, { isGroup: false });
  res.json({ command });
});
