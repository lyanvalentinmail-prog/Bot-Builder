import fs from 'node:fs';
import path from 'node:path';
import { DB_FILE, DATA_DIR } from './config.js';
import { newBot, makeCommand, defaultSettings, defaultAutoReact } from './defaults.js';
import { defaultMenu, normalizeMenu } from './menu.js';
import { seedBot } from './templates.js';
import { uid } from './util.js';

function normalizeTexts(texts, fallback) {
  if (!Array.isArray(texts)) return fallback;
  return texts.map((t) => ({
    id: t.id || uid('txt_'),
    name: String(t.name || 'Plantilla').slice(0, 80),
    slug: String(t.slug || String(t.name || 'plantilla').toLowerCase().replace(/\s+/g, '_'))
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 60),
    content: String(t.content || '').slice(0, 8000),
    description: String(t.description || '').slice(0, 200),
  }));
}

function normalizeReactions(reactions, fallback) {
  if (!Array.isArray(reactions)) return fallback;
  return reactions.map((r) => ({
    id: r.id || uid('rx_'),
    name: String(r.name || 'Reacción').slice(0, 60),
    enabled: r.enabled !== false,
    emoji: String(r.emoji || '👍').slice(0, 12),
    on: ['every', 'keyword', 'command', 'regex', 'group', 'mention'].includes(r.on)
      ? r.on
      : 'keyword',
    pattern: String(r.pattern || '').slice(0, 300),
    scope: ['all', 'group'].includes(r.scope) ? r.scope : 'all',
    chance: Math.max(0, Math.min(100, Number(r.chance) || 100)),
    removeAfterSeconds: Math.max(0, Math.min(3600, Number(r.removeAfterSeconds) || 0)),
  }));
}

function normalizeBot(raw) {
  const base = newBot({ ...raw, commands: [], reactions: [], texts: [] });
  const bot = {
    ...base,
    ...raw,
    id: raw.id || base.id,
    emoji: raw.emoji || '🤖',
    createdAt: raw.createdAt || base.createdAt,
    updatedAt: raw.updatedAt || base.updatedAt,
    settings: { ...defaultSettings(), ...(raw.settings || {}) },
    autoReact: { ...defaultAutoReact(), ...(raw.autoReact || {}) },
    menu: normalizeMenu(raw.menu, defaultMenu()),
    commands: Array.isArray(raw.commands) ? raw.commands.map(makeCommand) : [],
    reactions: normalizeReactions(raw.reactions, []),
    texts: normalizeTexts(raw.texts, []),
    channels: {
      whatsapp: {
        enabled: false,
        status: 'disconnected',
        phone: '',
        me: null,
        connectedAt: null,
        lastError: null,
        ...(raw.channels?.whatsapp || {}),
      },
    },
    stats: {
      messages: Number(raw.stats?.messages) || 0,
      replies: Number(raw.stats?.replies) || 0,
      reactions: Number(raw.stats?.reactions) || 0,
      lastActiveAt: raw.stats?.lastActiveAt || null,
    },
  };
  // Un bot nunca está "conectado" hasta que el socket levanta.
  bot.channels.whatsapp.status = 'disconnected';
  return bot;
}

export class Store {
  constructor(file = DB_FILE) {
    this.file = file;
    this.data = { version: 1, bots: [] };
    this.load();
  }

  load() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    try {
      if (fs.existsSync(this.file)) {
        const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        const bots = Array.isArray(parsed?.bots) ? parsed.bots.map(normalizeBot) : [];
        this.data = { version: 1, bots };
      } else {
        this.data = { version: 1, bots: [normalizeBot(seedBot())] };
        this.persist();
      }
    } catch (error) {
      console.error('[store] No se pudo leer la base, se crea una nueva:', error.message);
      this.data = { version: 1, bots: [normalizeBot(seedBot())] };
      this.persist();
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  persist() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, this.file);
    } catch (error) {
      console.error('[store] Error al guardar:', error.message);
    }
  }

  listBots() {
    return this.data.bots;
  }

  getBot(id) {
    return this.data.bots.find((b) => b.id === id) || null;
  }

  createBot(data = {}) {
    const bot = normalizeBot(newBot(data));
    this.data.bots.unshift(bot);
    this.persist();
    return bot;
  }

  duplicateBot(id) {
    const source = this.getBot(id);
    if (!source) return null;
    const copy = normalizeBot({
      ...structuredClone(source),
      id: uid('bot_'),
      name: `${source.name} (copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      channels: {
        whatsapp: { enabled: false, status: 'disconnected', me: null, connectedAt: null },
      },
      stats: { messages: 0, replies: 0, reactions: 0, lastActiveAt: null },
    });
    copy.commands = copy.commands.map((c) => ({ ...c, id: uid('cmd_'), usageCount: 0 }));
    copy.texts = copy.texts.map((t) => ({ ...t, id: uid('txt_') }));
    copy.reactions = copy.reactions.map((r) => ({ ...r, id: uid('rx_') }));
    this.data.bots.unshift(copy);
    this.persist();
    return copy;
  }

  deleteBot(id) {
    const index = this.data.bots.findIndex((b) => b.id === id);
    if (index === -1) return false;
    this.data.bots.splice(index, 1);
    this.persist();
    return true;
  }

  saveBot(bot) {
    bot.updatedAt = new Date().toISOString();
    const index = this.data.bots.findIndex((b) => b.id === bot.id);
    if (index === -1) {
      this.data.bots.unshift(bot);
    } else {
      this.data.bots[index] = bot;
    }
    this.persist();
    return bot;
  }

  updateBot(id, patch) {
    const bot = this.getBot(id);
    if (!bot) return null;
    Object.assign(bot, patch);
    return this.saveBot(bot);
  }
}

export const store = new Store();
