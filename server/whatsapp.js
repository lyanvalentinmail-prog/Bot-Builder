import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import QRCode from 'qrcode';
import pino from 'pino';
import { SESSIONS_DIR } from './config.js';
import { store } from './storage.js';
import { processMessage } from './engine.js';
import {
  buildVariables,
  commandListMarkup,
  formatDate,
  formatLongDate,
  render,
} from './template.js';
import { delay, digitsOnly, sleep } from './util.js';
import { optionalImport } from './optional.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });

const DISCONNECT = {
  loggedOut: 401,
  connectionClosed: 428,
  restartRequired: 515,
};

const sessionDir = (botId) => path.join(SESSIONS_DIR, botId);

function extractText(msg) {
  const m = msg.message || {};
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.templateButtonReplyMessage?.selectedId ||
    m.templateButtonReplyMessage?.selectedDisplayText ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.listResponseMessage?.title ||
    m.ephemeralMessage?.message?.extendedTextMessage?.text ||
    ''
  );
}

function unwrap(msg) {
  let current = msg;
  let guard = 0;
  while (current?.message && guard < 5) {
    const m = current.message;
    const inner =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.documentWithCaptionMessage?.message;
    if (!inner) break;
    current = { ...current, message: inner };
    guard += 1;
  }
  return current;
}

const instanceOf = (manager, botId) => manager.instances.get(botId) || null;

export class WhatsAppManager extends EventEmitter {
  constructor() {
    super();
    this.instances = new Map();
    this.groupCache = new Map();
    this.io = null;
  }

  attachIo(io) {
    this.io = io;
  }

  emitToRoom(botId, event, payload) {
    this.io?.to(`bot:${botId}`).emit(event, payload);
  }

  status(botId) {
    const instance = this.instances.get(botId);
    if (!instance) return { status: 'disconnected' };
    return {
      status: instance.status,
      qr: instance.qrDataUrl,
      pairingCode: instance.pairingCode,
      phone: instance.phone,
      lastError: instance.lastError,
    };
  }

  list() {
    return [...this.instances.entries()].map(([botId, i]) => ({
      botId,
      status: i.status,
      phone: i.phone,
    }));
  }

  setStatus(instance, status, extra = {}) {
    instance.status = status;
    const bot = store.getBot(instance.botId);
    if (bot) {
      bot.channels.whatsapp.status = status;
      if (extra.phone !== undefined) bot.channels.whatsapp.phone = extra.phone;
      if (extra.lastError !== undefined) bot.channels.whatsapp.lastError = extra.lastError;
      if (status === 'connected') bot.channels.whatsapp.connectedAt = new Date().toISOString();
      store.saveBot(bot);
    }
    this.emitToRoom(instance.botId, 'whatsapp:status', {
      botId: instance.botId,
      status,
      phone: instance.phone,
      lastError: instance.lastError,
      ...extra,
    });
  }

  async start(botId, options = {}) {
    const bot = store.getBot(botId);
    if (!bot) throw new Error('Bot inexistente');

    const existing = this.instances.get(botId);
    if (existing && ['connected', 'connecting', 'pairing'].includes(existing.status)) {
      return this.status(botId);
    }
    if (existing) await this.stop(botId);

    const method = options.method === 'pairing' ? 'pairing' : 'qr';
    const phone = digitsOnly(options.phone || bot.channels.whatsapp.phone || '');
    if (method === 'pairing' && phone.length < 8) {
      throw new Error('Ingresá el número de WhatsApp con código de país (ej: 59899123456)');
    }

    let baileys;
    try {
      baileys = await optionalImport('@whiskeysockets/baileys');
    } catch (error) {
      this.setStatus({ botId, status: 'error', phone, lastError: null }, 'error', {
        lastError: `No se pudo cargar el motor de WhatsApp: ${error.message}`,
      });
      throw error;
    }

    const {
      default: makeWASocket,
      useMultiFileAuthState,
      DisconnectReason,
      Browsers,
      fetchLatestBaileysVersion,
    } = baileys;

    const dir = sessionDir(botId);
    fs.mkdirSync(dir, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(dir);

    let version;
    try {
      version = (await fetchLatestBaileysVersion()).version;
    } catch {
      version = undefined;
    }

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
    });

    const instance = {
      botId,
      sock,
      status: 'connecting',
      qrDataUrl: null,
      pairingCode: null,
      phone,
      lastError: null,
      stopped: false,
      reconnectAttempts: 0,
      method,
      startedAt: Date.now(),
      seenContacts: new Set(),
      seenGroups: new Map(),
      groupsCache: null,
      groupsAt: 0,
      failures: 0,
    };
    this.instances.set(botId, instance);
    bot.channels.whatsapp.enabled = true;
    bot.channels.whatsapp.status = 'connecting';
    bot.channels.whatsapp.lastError = null;
    if (phone) bot.channels.whatsapp.phone = phone;
    store.saveBot(bot);
    this.setStatus(instance, 'connecting');

    sock.ev.on('creds.update', saveCreds);

    if (method === 'pairing' && !state.creds.registered) {
      instance.status = 'pairing';
      this.setStatus(instance, 'pairing');
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phone);
          instance.pairingCode = code;
          this.emitToRoom(botId, 'whatsapp:pairing', { botId, code, phone });
          this.emitToRoom(botId, 'whatsapp:log', {
            botId,
            text: `Código de vinculación generado: ${code}`,
            level: 'info',
          });
        } catch (error) {
          instance.lastError = `No se pudo generar el código de vinculación: ${error.message}`;
          this.setStatus(instance, 'error', { lastError: instance.lastError });
          this.emitToRoom(botId, 'whatsapp:log', {
            botId,
            text: instance.lastError,
            level: 'error',
          });
        }
      }, 2500);
    }

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        try {
          instance.qrDataUrl = await QRCode.toDataURL(qr, {
            margin: 1,
            width: 320,
            color: { dark: '#0b1020', light: '#ffffff' },
          });
        } catch {
          instance.qrDataUrl = null;
        }
        instance.status = 'qr';
        this.setStatus(instance, 'qr');
        this.emitToRoom(botId, 'whatsapp:qr', {
          botId,
          qr: instance.qrDataUrl,
          raw: qr,
        });
        this.emitToRoom(botId, 'whatsapp:log', {
          botId,
          text: 'QR generado. Escanealo desde WhatsApp → Dispositivos vinculados.',
          level: 'info',
        });
      }

      if (connection === 'open') {
        instance.reconnectAttempts = 0;
        instance.failures = 0;
        instance.qrDataUrl = null;
        instance.pairingCode = null;
        const me = sock.user?.id || '';
        const number = digitsOnly(me.split('@')[0].split(':')[0]);
        instance.phone = number;
        const saved = store.getBot(botId);
        if (saved) {
          saved.channels.whatsapp.me = {
            id: me,
            name: sock.user?.name || '',
            number,
          };
          saved.channels.whatsapp.enabled = true;
          saved.channels.whatsapp.lastError = null;
          store.saveBot(saved);
        }
        this.setStatus(instance, 'connected', {
          phone: number,
          me: saved?.channels.whatsapp.me,
        });
        this.emitToRoom(botId, 'whatsapp:connected', {
          botId,
          number,
          name: sock.user?.name || '',
        });
        this.emitToRoom(botId, 'whatsapp:log', {
          botId,
          text: `Conectado como ${sock.user?.name || number}.`,
          level: 'success',
        });
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || 'Conexión cerrada';
        instance.lastError = reason;
        this.emitToRoom(botId, 'whatsapp:log', {
          botId,
          text: `Conexión cerrada (${code ?? 's/código'}): ${reason}`,
          level: 'warn',
        });
        if (instance.stopped) return;

        if (code === DISCONNECT.loggedOut) {
          this.clearSession(botId);
          instance.status = 'disconnected';
          this.setStatus(instance, 'disconnected', {
            lastError: 'Sesión cerrada desde el teléfono. Vinculá de nuevo.',
          });
          return;
        }
        if (code === DISCONNECT.restartRequired) {
          this.emitToRoom(botId, 'whatsapp:log', {
            botId,
            text: 'WhatsApp pidió reiniciar la conexión. Reconectando…',
            level: 'info',
          });
          await sleep(500);
          this.restart(botId, options);
          return;
        }
        // Cualquier otro corte: reconectar con backoff.
        instance.reconnectAttempts += 1;
        instance.failures += 1;
        const wait = Math.min(30000, 1500 * instance.reconnectAttempts);
        if (instance.failures >= 3) {
          this.setStatus(instance, 'error', {
            lastError: `${reason}. Verificá la conexión del servidor con WhatsApp.`,
          });
        } else {
          instance.status = 'connecting';
          this.setStatus(instance, 'connecting', { lastError: reason });
        }
        setTimeout(() => {
          if (!this.instances.get(botId)?.stopped) this.restart(botId, options);
        }, wait);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const raw of messages) {
        try {
          await this.handleIncoming(botId, raw);
        } catch (error) {
          console.error('[whatsapp] error procesando mensaje:', error.message);
        }
      }
    });

    sock.ev.on('call', async (calls) => {
      for (const call of calls || []) {
        if (call.status === 'offer') {
          try {
            await sock.rejectCall(call.id, call.from);
          } catch {
            /* el rechazo de llamadas puede no estar disponible */
          }
        }
      }
    });

    return this.status(botId);
  }

  async restart(botId, options = {}) {
    const instance = this.instances.get(botId);
    if (!instance || instance.stopped) return;
    const phone = instance.phone;
    const method = instance.method;
    try {
      instance.sock?.ev?.removeAllListeners?.();
      instance.sock?.end?.(undefined);
    } catch {
      /* noop */
    }
    this.instances.delete(botId);
    await this.start(botId, { ...options, method, phone });
  }

  clearSession(botId) {
    try {
      fs.rmSync(sessionDir(botId), { recursive: true, force: true });
    } catch (error) {
      console.error('[whatsapp] no se pudo borrar la sesión:', error.message);
    }
  }

  async stop(botId, { logout = false } = {}) {
    const instance = this.instances.get(botId);
    if (instance) {
      instance.stopped = true;
      try {
        if (logout) await instance.sock?.logout?.();
      } catch {
        /* noop */
      }
      try {
        instance.sock?.ev?.removeAllListeners?.();
        instance.sock?.end?.(undefined);
      } catch {
        /* noop */
      }
      this.instances.delete(botId);
    }
    if (logout) this.clearSession(botId);
    const bot = store.getBot(botId);
    if (bot) {
      bot.channels.whatsapp.status = 'disconnected';
      bot.channels.whatsapp.enabled = false;
      if (logout) bot.channels.whatsapp.me = null;
      store.saveBot(bot);
    }
    this.emitToRoom(botId, 'whatsapp:status', {
      botId,
      status: 'disconnected',
      loggedOut: logout,
    });
  }

  /** Guarda el grupo en la caché de la instancia (nombre + última actividad). */
  trackGroup(instance, jid, name = '', actor = '') {
    if (!instance || !jid) return;
    const previous = instance.seenGroups.get(jid) || {};
    instance.seenGroups.set(jid, {
      id: jid,
      name: name || previous.name || 'Grupo sin nombre',
      lastActivityAt: new Date().toISOString(),
      lastActor: actor || previous.lastActor || '',
      messages: (previous.messages || 0) + 1,
    });
    instance.groupsCache = null;
  }

  /**
   * Grupos donde está la sesión de WhatsApp del bot. Con `refresh` se consulta
   * a WhatsApp; sin él se usa la caché para no golpear el socket.
   */
  async groups(botId, { refresh = false } = {}) {
    const instance = this.instances.get(botId);
    if (!instance || instance.status !== 'connected' || !instance.sock) {
      return { connected: false, status: instance?.status || 'disconnected', groups: [] };
    }
    const fresh = Date.now() - instance.groupsAt < 60_000;
    if (!refresh && fresh && instance.groupsCache) {
      return { connected: true, status: instance.status, groups: instance.groupsCache };
    }
    let groups = [];
    try {
      const all = await instance.sock.groupFetchAllParticipating();
      groups = Object.entries(all || {}).map(([id, meta]) => ({
        id,
        name: meta?.subject || 'Grupo sin nombre',
        participants: Array.isArray(meta?.participants) ? meta.participants.length : 0,
        announce: Boolean(meta?.announce),
        lastActivityAt: instance.seenGroups.get(id)?.lastActivityAt || null,
        messages: instance.seenGroups.get(id)?.messages || 0,
      }));
    } catch (error) {
      this.emitToRoom(botId, 'whatsapp:log', {
        botId,
        text: `No se pudo leer la lista de grupos: ${error.message}`,
        level: 'warn',
      });
      groups = [...instance.seenGroups.values()].map((group) => ({
        id: group.id,
        name: group.name,
        participants: 0,
        announce: false,
        lastActivityAt: group.lastActivityAt,
        messages: group.messages || 0,
      }));
    }
    groups.sort((a, b) => (b.messages || 0) - (a.messages || 0));
    instance.groupsCache = groups;
    instance.groupsAt = Date.now();
    return { connected: true, status: instance.status, groups };
  }

  async groupName(sock, jid) {
    if (!jid || !jid.endsWith('@g.us')) return '';
    const cached = this.groupCache.get(jid);
    if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.name;
    try {
      const meta = await sock.groupMetadata(jid);
      this.groupCache.set(jid, { name: meta.subject, at: Date.now() });
      return meta.subject;
    } catch {
      return '';
    }
  }

  async handleIncoming(botId, rawMessage) {
    const message = unwrap(rawMessage);
    if (!message?.message || message.key?.fromMe) return;
    const sock = this.instances.get(botId)?.sock;
    if (!sock) return;

    const bot = store.getBot(botId);
    if (!bot) return;

    const jid = message.key.remoteJid || '';
    if (!jid || jid === 'status@broadcast' || jid.endsWith('@newsletter')) return;

    const isGroup = jid.endsWith('@g.us');
    // BotForge es un producto para grupos: los chats privados se ignoran por completo.
    if (!isGroup) return;
    const senderJid = message.key.participant || jid;
    const senderNumber = digitsOnly(senderJid.split('@')[0].split(':')[0]);
    const text = String(extractText(message) || '').trim();
    if (!text) return;

    const myId = sock.user?.id || '';
    const myNumber = digitsOnly(myId.split('@')[0].split(':')[0]);
    const mentionedMe = Boolean(
      message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.some((m) =>
        m.includes(myNumber),
      ),
    );

    // Opcional: responder solo cuando mencionan al bot.
    if (bot.settings.requireMention && !mentionedMe) return;

    if (bot.settings.readReceipts) {
      try {
        await sock.readMessages([message.key]);
      } catch {
        /* algunos tipos de mensaje no admiten acuse */
      }
    }

    const groupName = await this.groupName(sock, jid);
    this.trackGroup(instanceOf(this, botId), jid, groupName, message.pushName || senderNumber);
    const nowDate = new Date();
    const ctx = {
      isGroup,
      channel: 'WhatsApp',
      groupName,
      mentionedMe,
      from: jid,
      name: message.pushName || senderNumber,
      number: `+${senderNumber}`,
    };
    const vars = buildVariables(bot, {
      ...ctx,
      date: nowDate,
      time: `${String(nowDate.getHours()).padStart(2, '0')}:${String(
        nowDate.getMinutes(),
      ).padStart(2, '0')}`,
      dateString: formatDate(nowDate),
      longDate: formatLongDate(nowDate),
      commandList: commandListMarkup(bot.commands, bot.settings.prefix, 'WhatsApp'),
    }, bot.texts);

    const result = processMessage(bot, { text }, { ...ctx, vars });
    const mentions = isGroup ? [senderJid] : undefined;

    // Bienvenida la primera vez que alguien escribe en esta sesión.
    const instance = this.instances.get(botId);
    if (
      bot.settings.welcomeEnabled &&
      bot.settings.welcomeText &&
      instance &&
      !instance.seenContacts.has(senderJid)
    ) {
      instance.seenContacts.add(senderJid);
      try {
        await delay(300);
        await sock.sendMessage(jid, {
          text: render(bot.settings.welcomeText, vars),
          mentions,
        });
        bot.stats.replies += 1;
        this.emitToRoom(botId, 'whatsapp:log', {
          botId,
          text: `Mensaje de bienvenida enviado a ${ctx.name}.`,
          level: 'success',
        });
      } catch (error) {
        this.emitToRoom(botId, 'whatsapp:log', {
          botId,
          text: `No se pudo enviar la bienvenida: ${error.message}`,
          level: 'warn',
        });
      }
    }

    // Reacciones (automáticas, personalizadas y del comando)
    let reacted = false;
    for (const reaction of result.reactions) {
      if (reacted && reaction.source !== 'command') continue;
      try {
        await sock.sendMessage(jid, { react: { text: reaction.emoji, key: message.key } });
        reacted = true;
        bot.stats.reactions += 1;
        this.emitToRoom(botId, 'whatsapp:log', {
          botId,
          text: `Reacción ${reaction.emoji} enviada a ${ctx.name}.`,
          level: 'success',
        });
        if (reaction.removeAfterSeconds > 0) {
          setTimeout(async () => {
            try {
              await sock.sendMessage(jid, { react: { text: '', key: message.key } });
            } catch {
              /* noop */
            }
          }, reaction.removeAfterSeconds * 1000);
        }
      } catch (error) {
        this.emitToRoom(botId, 'whatsapp:log', {
          botId,
          text: `No se pudo reaccionar: ${error.message}`,
          level: 'warn',
        });
      }
      // Una sola reacción por mensaje (WhatsApp reemplaza la anterior).
      break;
    }

    if (!result.actions.length) {
      bot.stats.messages += 1;
      store.saveBot(bot);
      return;
    }

    for (const action of result.actions) {
      const wait = Math.max(0, Number(action.delayMs) || 0);
      if (wait) await delay(Math.min(wait, 8000));
      try {
        if (action.kind === 'text') {
          const sent = await sock.sendMessage(jid, { text: action.text, mentions });
          if (action.editAfterMs > 0 && action.editText) {
            setTimeout(async () => {
              try {
                await sock.sendMessage(jid, {
                  text: action.editText,
                  edit: sent.key,
                  mentions,
                });
              } catch {
                /* noop */
              }
            }, action.editAfterMs);
          }
          bot.stats.replies += 1;
        } else if (action.kind === 'image') {
          await sock.sendMessage(jid, {
            image: { url: action.url },
            caption: action.caption || undefined,
            mentions,
          });
          bot.stats.replies += 1;
        } else if (action.kind === 'buttons') {
          const buttons = action.buttons || [];
          let sentNative = false;
          if (buttons.length && buttons.length <= 3) {
            try {
              await sock.sendMessage(jid, {
                text: action.text,
                footer: action.footer || undefined,
                templateButtons: buttons.map((b, i) => ({
                  index: i + 1,
                  quickReplyButton: { displayText: b.label, id: b.command || b.label },
                })),
                mentions,
              });
              sentNative = true;
            } catch {
              sentNative = false;
            }
          }
          if (!sentNative) {
            const lines = buttons.map((b, i) => `${i + 1}. ${b.label}`).join('\n');
            const fallback = [action.text, lines, action.footer].filter(Boolean).join('\n\n');
            await sock.sendMessage(jid, { text: fallback, mentions });
          }
          bot.stats.replies += 1;
        }
      } catch (error) {
        this.emitToRoom(botId, 'whatsapp:log', {
          botId,
          text: `Error al enviar respuesta: ${error.message}`,
          level: 'error',
        });
      }
    }

    bot.stats.messages += 1;
    bot.stats.lastActiveAt = new Date().toISOString();
    store.saveBot(bot);
    if (result.matched) {
      const cmd = result.command;
      const target = bot.commands.find((c) => c.id === cmd.id);
      if (target) {
        target.usageCount = (target.usageCount || 0) + 1;
        store.saveBot(bot);
      }
    }
    this.emitToRoom(botId, 'whatsapp:message', {
      botId,
      from: ctx.name,
      number: ctx.number,
      text: text.slice(0, 500),
      matched: Boolean(result.matched),
      command: result.command?.name || null,
      at: new Date().toISOString(),
    });
    this.emitToRoom(botId, 'stats:update', { botId, stats: bot.stats });
  }

  async sendTestMessage(botId, jid, text) {
    const instance = this.instances.get(botId);
    if (!instance || instance.status !== 'connected') {
      throw new Error('El bot no está conectado a WhatsApp');
    }
    const target = jid.includes('@') ? jid : `${digitsOnly(jid)}@s.whatsapp.net`;
    return instance.sock.sendMessage(target, { text });
  }
}

export const whatsapp = new WhatsAppManager();
