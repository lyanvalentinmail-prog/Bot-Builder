import { EventEmitter } from 'node:events';
import { optionalImport } from './optional.js';
import { store } from './storage.js';
import { processMessage, findCommand } from './engine.js';
import {
  buildVariables,
  commandListMarkup,
  formatDate,
  formatLongDate,
} from './template.js';

/**
 * Adaptador de Microsoft Teams.
 *
 * No hace falta túnel: Teams llama a nuestro endpoint HTTPS (`/api/teams/:botId/messages`)
 * usando el Bot Framework. El bot recibe el mensaje y responde con `context.sendActivity`.
 */
export class TeamsManager extends EventEmitter {
  constructor() {
    super();
    this.adapters = new Map();
    this.io = null;
    this.connections = new Map();
  }

  attachIo(io) {
    this.io = io;
  }

  log(botId, text, level = 'info') {
    this.io?.to(`bot:${botId}`).emit('teams:log', { botId, text, level, at: new Date().toISOString() });
  }

  async getAdapter(botId) {
    if (this.adapters.has(botId)) return this.adapters.get(botId);
    const bot = store.getBot(botId);
    if (!bot) throw new Error('Bot inexistente');
    const { appId, appPassword, tenantId } = bot.channels.teams || {};
    if (!appId || !appPassword) {
      throw new Error('Faltan App ID y App Password de Azure');
    }
    const botbuilder = await optionalImport('botbuilder');
    const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = botbuilder;
    const adapter = new BotFrameworkAdapter({
      appId,
      appPassword,
      channelAuthTenant: tenantId || undefined,
    });
    adapter.onTurnError = async (context, error) => {
      console.error('[teams] turn error:', error);
      this.log(botId, `Error en el turno: ${error.message}`, 'error');
      try {
        await context.sendActivity('😵 Ups, algo salió mal procesando tu mensaje.');
      } catch {
        /* noop */
      }
    };
    const memory = new MemoryStorage();
    const state = {
      adapter,
      conversationState: new ConversationState(memory),
      userState: new UserState(memory),
    };
    this.adapters.set(botId, state);
    return state;
  }

  async start(botId) {
    const bot = store.getBot(botId);
    if (!bot) throw new Error('Bot inexistente');
    const teams = bot.channels.teams || {};
    if (!teams.appId || !teams.appPassword) {
      throw new Error('Completá App ID y App Password de Azure antes de activar Teams');
    }
    const state = await this.getAdapter(botId);

    // Validación opcional: pedir un token a Azure confirma que las credenciales sirven.
    try {
      const token = await Promise.race([
        state.adapter.credentials.getToken(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado con Azure')), 10000),
        ),
      ]);
      if (!token) throw new Error('Azure no devolvió un token válido');
    } catch (error) {
      teams.status = 'error';
      teams.lastError = `No se pudieron validar las credenciales: ${error.message}`;
      store.saveBot(bot);
      this.log(botId, teams.lastError, 'error');
      throw new Error(teams.lastError);
    }

    teams.enabled = true;
    teams.status = 'ready';
    teams.lastError = null;
    store.saveBot(bot);
    this.emit('status', { botId, status: 'ready' });
    this.log(
      botId,
      'Canal Teams activado. El endpoint está listo para recibir mensajes del Bot Framework.',
      'success',
    );
    return this.status(botId);
  }

  async stop(botId) {
    this.adapters.delete(botId);
    const bot = store.getBot(botId);
    if (!bot) return { status: 'not_configured' };
    bot.channels.teams.enabled = false;
    bot.channels.teams.status = 'not_configured';
    store.saveBot(bot);
    return this.status(botId);
  }

  status(botId) {
    const bot = store.getBot(botId);
    const teams = bot?.channels.teams;
    return {
      status: teams?.enabled ? teams.status : 'not_configured',
      enabled: Boolean(teams?.enabled),
      appId: teams?.appId || '',
      tenantId: teams?.tenantId || '',
      hasPassword: Boolean(teams?.appPassword),
      conversations: teams?.conversations || [],
      lastError: teams?.lastError || null,
      endpoint: `/api/teams/${botId}/messages`,
    };
  }

  /** Convierte el texto de entrada en algo que el motor entienda. */
  normalizeIncomingText(bot, text = '') {
    const trimmed = String(text || '').trim();
    if (!trimmed) return '';
    const prefix = bot.settings?.prefix || '!';
    if (trimmed.startsWith('/')) {
      return `${prefix}${trimmed.slice(1)}`;
    }
    // En Teams también se acepta el comando sin prefijo.
    const bare = trimmed.split(/\s+/)[0];
    const isKnown = (bot.commands || []).some(
      (c) =>
        c.enabled !== false &&
        (c.trigger || '').toLowerCase() === bare.toLowerCase() ||
        (c.aliases || []).some((a) => a.toLowerCase() === bare.toLowerCase()),
    );
    if (isKnown) return `${prefix}${trimmed}`;
    return trimmed;
  }

  buildContext(bot, activity) {
    const nowDate = new Date();
    const userName =
      activity.from?.name ||
      activity.from?.aadObjectId ||
      activity.from?.id ||
      'equipo';
    const isGroup = activity.conversation?.conversationType !== 'personal';
    return {
      isGroup,
      channel: 'Microsoft Teams',
      groupName: activity.conversation?.name || '',
      from: activity.conversation?.id || '',
      name: userName,
      number: activity.from?.id || '',
      text: activity.text || '',
      mentionedMe: Array.isArray(activity.entities)
        ? activity.entities.some((e) => e.type === 'mention' && e.mentioned?.id === activity.recipient?.id)
        : false,
      date: nowDate,
      time: `${String(nowDate.getHours()).padStart(2, '0')}:${String(
        nowDate.getMinutes(),
      ).padStart(2, '0')}`,
      dateString: formatDate(nowDate),
      longDate: formatLongDate(nowDate),
      commandList: commandListMarkup(bot.commands, bot.settings?.prefix, 'Microsoft Teams'),
    };
  }

  /** Procesa una actividad entrante y devuelve las acciones a enviar. */
  handleActivity(bot, activity) {
    if (activity.type === 'messageReaction') {
      return { actions: [], reactions: [], matched: false, note: 'reaction-received' };
    }
    const ctx = this.buildContext(bot, activity);
    const text = this.normalizeIncomingText(bot, activity.text);
    const vars = buildVariables(bot, ctx, bot.texts);
    const result = processMessage(
      bot,
      { text },
      { ...ctx, vars, mentionedMe: ctx.mentionedMe },
    );
    result.normalizedText = text;
    return result;
  }

  async storeConversation(bot, activity) {
    const teams = bot.channels.teams;
    const id = activity.conversation?.id;
    if (!id) return;
    const exists = teams.conversations.find((c) => c.id === id);
    const entry = {
      id,
      name: activity.conversation?.name || 'Chat personal',
      type: activity.conversation?.conversationType || 'personal',
      userId: activity.from?.id || '',
      userName: activity.from?.name || '',
      serviceUrl: activity.serviceUrl || '',
      lastSeen: new Date().toISOString(),
    };
    if (exists) {
      Object.assign(exists, entry);
    } else {
      teams.conversations.unshift(entry);
      teams.conversations = teams.conversations.slice(0, 25);
    }
    store.saveBot(bot);
  }

  /** Handler Express para el webhook de Teams. */
  webhookHandler(botId) {
    return async (req, res) => {
      const bot = store.getBot(botId);
      if (!bot) {
        res.status(404).json({ error: 'Bot inexistente' });
        return;
      }
      if (!bot.channels.teams.enabled) {
        res.status(409).json({ error: 'El canal Teams no está activado para este bot' });
        return;
      }
      let state;
      try {
        state = await this.getAdapter(botId);
      } catch (error) {
        bot.channels.teams.status = 'error';
        bot.channels.teams.lastError = error.message;
        store.saveBot(bot);
        res.status(500).json({ error: error.message });
        return;
      }

      const { adapter } = state;
      try {
        await adapter.processActivity(req, res, async (context) => {
          if (context.activity.type === 'conversationUpdate') {
            await context.sendActivity(
              `👋 ¡Hola! Soy *${bot.name}*. Escribí \`/${(bot.commands?.[0]?.trigger) || 'menu'}\` o \`${bot.settings?.prefix}menu\` para empezar.`,
            );
            return;
          }
          if (context.activity.type === 'messageReaction') {
            this.log(botId, 'Reacción recibida desde Teams (informativa).', 'info');
            return;
          }
          if (context.activity.type !== 'message') return;

          const fresh = store.getBot(botId);
          const result = this.handleActivity(fresh, context.activity);
          await this.storeConversation(fresh, context.activity);

          this.emit('incoming', {
            botId,
            from: context.activity.from?.name || 'Teams',
            text: String(context.activity.text || '').slice(0, 500),
            matched: Boolean(result.matched),
            command: result.command?.name || null,
          });
          this.io?.to(`bot:${botId}`).emit('teams:message', {
            botId,
            from: context.activity.from?.name || 'Teams',
            text: String(context.activity.text || '').slice(0, 500),
            matched: Boolean(result.matched),
            command: result.command?.name || null,
            at: new Date().toISOString(),
          });

          for (const action of result.actions) {
            if (action.kind === 'text') {
              await context.sendActivity(action.text);
            } else if (action.kind === 'image') {
              await context.sendActivity({
                text: action.caption || '',
                attachments: [
                  {
                    contentType: 'application/vnd.microsoft.card.hero',
                    content: { images: [{ url: action.url }], text: action.caption || '' },
                  },
                ],
              });
            } else if (action.kind === 'buttons') {
              const { CardFactory } = await optionalImport('botbuilder');
              try {
                await context.sendActivity({
                  text: action.text,
                  attachments: [
                    CardFactory.heroCard(
                      undefined,
                      action.text,
                      action.buttons.map((b) => ({
                        type: 'imBack',
                        title: b.label,
                        value: b.command || b.label,
                      })),
                    ),
                  ],
                });
              } catch {
                await context.sendActivity(action.text);
              }
            }
          }

          if (result.matched) {
            const target = fresh.commands.find((c) => c.id === result.command.id);
            if (target) {
              target.usageCount = (target.usageCount || 0) + 1;
              fresh.stats.replies += 1;
              fresh.stats.messages += 1;
              store.saveBot(fresh);
            }
          } else {
            fresh.stats.messages += 1;
            store.saveBot(fresh);
          }
        });
      } catch (error) {
        console.error('[teams] webhook error:', error);
        this.log(botId, `Error en el webhook: ${error.message}`, 'error');
        if (!res.headersSent) res.status(500).json({ error: error.message });
      }
    };
  }

  /** Busca el bot por el App ID del destinatario (para el endpoint global /api/messages). */
  findByRecipient(recipientId = '') {
    return (
      store
        .listBots()
        .find((b) => b.channels.teams?.appId && recipientId.includes(b.channels.teams.appId)) ||
      null
    );
  }

  /** Simula una conversación de Teams sin Azure (para probar en el editor). */
  async simulate(botId, activity = {}) {
    const bot = store.getBot(botId);
    if (!bot) throw new Error('Bot inexistente');
    const fake = {
      type: 'message',
      text: activity.text || '',
      from: { id: 'sim-user', name: activity.name || 'Ana (simulación)' },
      recipient: { id: bot.channels.teams?.appId || 'sim-bot', name: bot.name },
      conversation: { id: 'sim-conversation', name: 'Simulación', conversationType: 'personal' },
      channelId: 'msteams',
      entities: [],
    };
    return this.handleActivity(bot, fake);
  }
}

export const teams = new TeamsManager();
export { findCommand };
