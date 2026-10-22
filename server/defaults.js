import { uid } from './util.js';

export const MATCH_TYPES = ['command', 'exact', 'contains', 'startsWith', 'regex', 'any'];
export const REPLY_TYPES = ['text', 'random', 'image', 'buttons', 'none'];
export const SCOPES = ['all', 'dm', 'group'];

export const defaultSettings = () => ({
  prefix: '!',
  prefixRequired: true,
  caseSensitive: false,
  ignoreGroups: true,
  readReceipts: true,
  unknownCommandEnabled: true,
  unknownCommandText:
    '🤔 No conozco ese comando, {{nombre}}. Escribí *{{prefix}}menu* para ver todo lo que puedo hacer.',
  fallbackEnabled: false,
  fallbackText: '',
  welcomeEnabled: false,
  welcomeText:
    '¡Hola {{nombre}}! 👋 Soy *{{bot}}*. Escribí *{{prefix}}menu* para ver mis comandos.',
  signature: '',
});

export const defaultAutoReact = () => ({
  enabled: true,
  emojis: ['👍', '🔥', '❤️'],
  chance: 30,
  onCommands: false,
  scope: 'all',
  removeAfterSeconds: 0,
});

export const defaultReply = (reply = {}) => ({
  type: REPLY_TYPES.includes(reply.type) ? reply.type : 'text',
  text: typeof reply.text === 'string' ? reply.text : '',
  variants: Array.isArray(reply.variants)
    ? reply.variants.filter((v) => typeof v === 'string' && v.trim()).slice(0, 20)
    : [],
  imageUrl: typeof reply.imageUrl === 'string' ? reply.imageUrl : '',
  caption: typeof reply.caption === 'string' ? reply.caption : '',
  buttons: Array.isArray(reply.buttons)
    ? reply.buttons
        .filter((b) => b && typeof b.label === 'string' && b.label.trim())
        .slice(0, 10)
        .map((b) => ({
          label: b.label.slice(0, 40),
          command: typeof b.command === 'string' ? b.command.slice(0, 120) : '',
        }))
    : [],
  footer: typeof reply.footer === 'string' ? reply.footer : '',
  delayMs: Number.isFinite(Number(reply.delayMs)) ? Math.max(0, Math.min(15000, Number(reply.delayMs))) : 600,
  editAfterMs: Number.isFinite(Number(reply.editAfterMs))
    ? Math.max(0, Math.min(120000, Number(reply.editAfterMs)))
    : 0,
  editText: typeof reply.editText === 'string' ? reply.editText : '',
});

export const makeCommand = (data = {}) => ({
  id: data.id || uid('cmd_'),
  name: typeof data.name === 'string' && data.name.trim() ? data.name.trim().slice(0, 80) : 'Comando',
  description: typeof data.description === 'string' ? data.description.slice(0, 240) : '',
  trigger:
    typeof data.trigger === 'string' && data.trigger.trim()
      ? data.trigger.trim().slice(0, 120)
      : 'comando',
  aliases: Array.isArray(data.aliases)
    ? data.aliases
        .filter((a) => typeof a === 'string' && a.trim())
        .slice(0, 10)
        .map((a) => a.trim().slice(0, 60))
    : [],
  matchType: MATCH_TYPES.includes(data.matchType) ? data.matchType : 'command',
  enabled: data.enabled !== false,
  scope: SCOPES.includes(data.scope) ? data.scope : 'all',
  caseSensitive: Boolean(data.caseSensitive),
  cooldownSeconds: Number.isFinite(Number(data.cooldownSeconds))
    ? Math.max(0, Math.min(86400, Number(data.cooldownSeconds)))
    : 0,
  showInMenu: data.showInMenu !== false,
  reaction: {
    enabled: Boolean(data.reaction?.enabled),
    emoji: typeof data.reaction?.emoji === 'string' ? data.reaction.emoji.slice(0, 12) : '👍',
    removeAfterSeconds: Number.isFinite(Number(data.reaction?.removeAfterSeconds))
      ? Math.max(0, Math.min(3600, Number(data.reaction.removeAfterSeconds)))
      : 0,
  },
  reply: defaultReply(data.reply || {}),
  usageCount: Number(data.usageCount) || 0,
});

export const defaultCommands = () => [
  makeCommand({
    name: 'Menú de ayuda',
    description: 'Lista todos los comandos disponibles.',
    trigger: 'menu',
    aliases: ['help', 'ayuda', 'comandos'],
    matchType: 'command',
    reaction: { enabled: true, emoji: '👋' },
    reply: {
      type: 'text',
      text:
        '👋 ¡Hola *{{nombre}}*! Soy *{{bot}}*.\n\n' +
        'Estos son los comandos que tengo disponibles:\n' +
        '{{lista_comandos}}\n\n' +
        'Escribí *{{prefix}}menu* cuando quieras volver a verme.',
      delayMs: 500,
    },
  }),
  makeCommand({
    name: 'Ping',
    description: 'Comprueba que el bot está en línea.',
    trigger: 'ping',
    aliases: ['estado'],
    reaction: { enabled: true, emoji: '🟢' },
    reply: {
      type: 'text',
      text: '🟢 *Pong!* Estoy en línea.\n🕒 Hora del servidor: {{hora}}',
      delayMs: 250,
    },
  }),
  makeCommand({
    name: 'Saludo',
    description: 'Responde a un saludo con una frase al azar.',
    trigger: 'hola',
    aliases: ['buenas', 'hey'],
    matchType: 'startsWith',
    reaction: { enabled: true, emoji: '❤️' },
    reply: {
      type: 'random',
      variants: [
        '¡Hola {{nombre}}! 👋 ¿En qué te puedo ayudar?',
        '¡Buenas {{nombre}}! 😄 Escribí *{{prefix}}menu* para ver mis comandos.',
        '¡Hey! Qué bueno verte por acá, {{nombre}} ✨',
      ],
      delayMs: 600,
    },
  }),
  makeCommand({
    name: 'Horario de atención',
    description: 'Comparte los horarios usando una plantilla reutilizable.',
    trigger: 'horario',
    aliases: ['horarios', 'atencion'],
    reply: {
      type: 'text',
      text: '{{texto:horario}}',
      delayMs: 400,
    },
  }),
  makeCommand({
    name: 'Información',
    description: 'Cuenta quién es el bot y qué puede hacer.',
    trigger: 'info',
    aliases: ['bot'],
    reply: {
      type: 'text',
      text:
        '🤖 *{{bot}}*\n\n' +
        'Un asistente automático creado con *BotForge*.\n' +
        'Podés hablarme por WhatsApp o Microsoft Teams y respondo al instante.\n\n' +
        '👉 Escribí *{{prefix}}menu* para ver todo lo que sé hacer.',
      delayMs: 500,
    },
  }),
];

export const defaultTexts = () => [
  {
    id: uid('txt_'),
    name: 'Horario',
    slug: 'horario',
    content:
      '🕘 *Horario de atención*\n\nLunes a viernes: 9:00 a 18:00\nSábados: 9:00 a 13:00\nDomingos y feriados: cerrado.\n\n¡Te esperamos, {{nombre}}!',
    description: 'Se usa en el comando !horario.',
  },
  {
    id: uid('txt_'),
    name: 'Bienvenida',
    slug: 'bienvenida',
    content:
      '¡Hola {{nombre}}! 👋 Gracias por escribir a *{{bot}}*.\nEn breve te respondemos. Mientras tanto, escribí *{{prefix}}menu* para ver lo que puedo hacer.',
    description: 'Mensaje de bienvenida reutilizable.',
  },
  {
    id: uid('txt_'),
    name: 'Despedida',
    slug: 'despedida',
    content: '¡Gracias por escribir, {{nombre}}! Que tengas un gran día 🌟',
    description: 'Cierre cálido para tus conversaciones.',
  },
  {
    id: uid('txt_'),
    name: 'Fuera de horario',
    slug: 'fuera_de_horario',
    content:
      '⏰ Estamos fuera del horario de atención.\nDejanos tu mensaje y te respondemos el próximo día hábil.',
    description: 'Respuesta para horarios no laborales.',
  },
];

export const defaultReactions = () => [
  {
    id: uid('rx_'),
    name: 'Saludos',
    enabled: true,
    emoji: '👋',
    on: 'keyword',
    pattern: 'hola, buenas, buen dia, hey',
    scope: 'all',
    chance: 100,
    removeAfterSeconds: 0,
  },
  {
    id: uid('rx_'),
    name: 'Agradecimientos',
    enabled: true,
    emoji: '❤️',
    on: 'keyword',
    pattern: 'gracias, genial, perfecto, buenísimo',
    scope: 'all',
    chance: 100,
    removeAfterSeconds: 0,
  },
];

export const newBot = (data = {}) => {
  const stamp = new Date().toISOString();
  return {
    id: uid('bot_'),
    name: (data.name || 'Mi bot').toString().slice(0, 60),
    emoji: typeof data.emoji === 'string' ? data.emoji.slice(0, 8) : '🤖',
    description:
      typeof data.description === 'string'
        ? data.description.slice(0, 240)
        : 'Asistente automático para WhatsApp y Microsoft Teams.',
    template: data.template || 'custom',
    createdAt: stamp,
    updatedAt: stamp,
    settings: { ...defaultSettings(), ...(data.settings || {}) },
    autoReact: { ...defaultAutoReact(), ...(data.autoReact || {}) },
    commands: Array.isArray(data.commands) ? data.commands.map(makeCommand) : defaultCommands(),
    reactions: Array.isArray(data.reactions) ? data.reactions : defaultReactions(),
    texts: Array.isArray(data.texts) ? data.texts : defaultTexts(),
    channels: {
      whatsapp: {
        enabled: false,
        status: 'disconnected',
        phone: '',
        me: null,
        connectedAt: null,
        lastError: null,
      },
      teams: {
        enabled: false,
        appId: '',
        appPassword: '',
        tenantId: '',
        status: 'not_configured',
        lastError: null,
        conversations: [],
      },
    },
    stats: { messages: 0, replies: 0, reactions: 0 },
  };
};

export const seedBot = () => {
  const bot = newBot({
    name: 'Asistente de bienvenida',
    emoji: '💬',
    description:
      'Bot de ejemplo con comandos, reacciones y plantillas listas para personalizar.',
    template: 'starter',
  });
  return bot;
};
