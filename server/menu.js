import { escapeRegExp, uid } from './util.js';

/**
 * Menú de comandos estilo panel de WhatsApp.
 *
 * Se genera a partir de los comandos del bot (agrupados por categoría) o, en
 * modo manual, a partir del texto que escribe el usuario. En ambos casos se
 * pueden usar parámetros con llaves simples: {usuario}, {bot}, {prefijo}…
 */

export const MENU_VERSION = '1.0.0';

const BOX = 20;
const RULE = '━'.repeat(BOX);
const TOP = `╭${'─'.repeat(BOX)}╮`;
const BOTTOM = `╰${'─'.repeat(BOX)}╯`;
const CENTERED = BOX + 2;

const pad = (value) => String(value).padStart(2, '0');

const center = (text = '', width = CENTERED) => {
  const value = String(text ?? '');
  const length = [...value].length;
  if (length >= width) return value;
  return `${' '.repeat(Math.floor((width - length) / 2))}${value}`;
};

/** Parámetros que se pueden escribir entre llaves dentro del menú. */
export const MENU_PARAMS = [
  { key: 'usuario', label: 'Usuario', hint: 'Nombre de quien escribe', example: 'Ana' },
  { key: 'bot', label: 'Nombre del bot', hint: 'Nombre configurado en el bot', example: 'Multimedia' },
  { key: 'equipo', label: 'Equipo', hint: 'Texto libre del menú', example: 'BotForge' },
  { key: 'prefijo', label: 'Prefijo', hint: 'Prefijo de los comandos', example: '.' },
  { key: 'estado', label: 'Estado', hint: 'En línea o activo', example: 'activo' },
  { key: 'version', label: 'Versión', hint: 'Versión de BotForge', example: '1.0.0' },
  { key: 'grupo', label: 'Grupo', hint: 'Nombre del grupo donde escriben', example: 'Equipo Ventas' },
  { key: 'hora', label: 'Hora', hint: 'Hora del mensaje', example: '14:32' },
  { key: 'fecha', label: 'Fecha', hint: 'Fecha del mensaje', example: '22/10/2026' },
  { key: 'comando', label: 'Comando usado', hint: 'Comando que disparó el menú', example: 'menu' },
  { key: 'total', label: 'Total de comandos', hint: 'Cantidad visible en el menú', example: '30' },
  { key: 'ayuda', label: 'Ayuda', hint: 'Atajo al comando de ayuda', example: '.help' },
  { key: 'comandos', label: 'Bloque de comandos', hint: 'Se reemplaza por la lista agrupada', example: '' },
];

const MENU_INFO_KEYS = new Set(MENU_PARAMS.map((param) => param.key));

/** Menú por defecto: replica la estructura de las capturas de referencia. */
export const defaultMenu = () => ({
  enabled: true,
  mode: 'auto',
  title: 'MENÚ DE COMANDOS',
  team: 'BotForge',
  footer: 'FIN DEL MENÚ',
  banner: '',
  showHeader: true,
  showCategories: true,
  showDescriptions: true,
  info: [
    { id: uid('mi_'), label: 'Nombre', value: '{bot}' },
    { id: uid('mi_'), label: 'Equipo', value: '{equipo}' },
    { id: uid('mi_'), label: 'Prefijo', value: '{prefijo}' },
    { id: uid('mi_'), label: 'Estado', value: '{estado}' },
    { id: uid('mi_'), label: 'Versión', value: '{version}' },
    { id: uid('mi_'), label: 'Usuario', value: '{usuario}' },
    { id: uid('mi_'), label: 'Ayuda', value: '{ayuda}' },
  ],
  custom: '',
});

const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : undefined);

/** Normaliza (y valida) la configuración del menú, conservando lo anterior. */
export function normalizeMenu(input = {}, previous = defaultMenu()) {
  const base = previous && typeof previous === 'object' ? previous : defaultMenu();
  const src = input && typeof input === 'object' ? input : {};
  const pick = (key, fallback) => (src[key] === undefined ? fallback : src[key]);

  const bannerRaw = text(pick('banner', base.banner), 1000) ?? '';
  const banner = /^https?:\/\/\S+$/i.test(bannerRaw.trim()) ? bannerRaw.trim() : '';

  const infoInput = Array.isArray(src.info) ? src.info : base.info;
  const info = (Array.isArray(infoInput) ? infoInput : [])
    .slice(0, 10)
    .map((item, index) => ({
      id: (typeof item?.id === 'string' && item.id) || base.info?.[index]?.id || uid('mi_'),
      label: (text(item?.label, 24) ?? '').trim(),
      value: text(item?.value, 400) ?? '',
    }))
    .filter((item) => item.label || item.value);

  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : base.enabled !== false,
    mode: ['auto', 'manual'].includes(src.mode) ? src.mode : base.mode || 'auto',
    title: (text(pick('title', base.title), 60) ?? 'MENÚ DE COMANDOS').trim() || 'MENÚ DE COMANDOS',
    team: (text(pick('team', base.team), 40) ?? 'BotForge').trim() || 'BotForge',
    footer: (text(pick('footer', base.footer), 60) ?? '').trim(),
    banner,
    showHeader: typeof src.showHeader === 'boolean' ? src.showHeader : base.showHeader !== false,
    showCategories:
      typeof src.showCategories === 'boolean' ? src.showCategories : base.showCategories !== false,
    showDescriptions:
      typeof src.showDescriptions === 'boolean'
        ? src.showDescriptions
        : base.showDescriptions !== false,
    info,
    custom: text(pick('custom', base.custom), 8000) ?? '',
  };
}

/** ¿Es el comando que envía el menú? */
export const isMenuCommand = (command) =>
  Boolean(command) && command.reply?.type === 'menu';

/** Comandos que aparecen listados dentro del menú. */
export function menuCommands(bot) {
  return (bot?.commands || []).filter(
    (command) =>
      command &&
      command.enabled !== false &&
      command.showInMenu !== false &&
      !isMenuCommand(command),
  );
}

/** Comandos agrupados por categoría, en el orden en que aparecen. */
export function menuGroups(bot) {
  const groups = [];
  for (const command of menuCommands(bot)) {
    const name = (command.category || 'General').trim() || 'General';
    let group = groups.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (!group) {
      group = { name, commands: [] };
      groups.push(group);
    }
    group.commands.push(command);
  }
  return groups.map((group, index) => ({ ...group, index: index + 1 }));
}

export const categoryTitle = (group) =>
  `「 ${String(group.index).padStart(2, '0')} | ${group.name.toUpperCase()} 」`;

const commandLine = (command, prefix) =>
  command.matchType === 'command' || !command.matchType
    ? `${prefix}${command.trigger}`
    : command.trigger;

export function commandBlock(command, prefix = '.', showDescriptions = true) {
  const head = commandLine(command, prefix);
  if (!showDescriptions || !command.description) return head;
  return `${head}\n> ${command.description}`;
}

/** Cuerpo del menú: categorías + comandos. */
export function menuBody(bot, menu = normalizeMenu(bot?.menu)) {
  const prefix = bot?.settings?.prefix || '.';
  if (!menu.showCategories) {
    return menuCommands(bot)
      .map((command) => commandBlock(command, prefix, menu.showDescriptions))
      .join('\n\n');
  }
  return menuGroups(bot)
    .map((group) => {
      const commands = group.commands
        .map((command) => commandBlock(command, prefix, menu.showDescriptions))
        .join('\n\n');
      return `${categoryTitle(group)}\n\n${commands}`;
    })
    .join(`\n\n${RULE}\n\n`);
}

/** Valores de los parámetros del menú para un mensaje concreto. */
export function menuVars(bot, ctx = {}) {
  const prefix = bot?.settings?.prefix || '.';
  const date = ctx.date instanceof Date ? ctx.date : new Date();
  const usuario = ctx.name || ctx.pushName || 'Ana';
  return {
    usuario,
    nombre: usuario,
    bot: bot?.name || 'BotForge',
    equipo: bot?.menu?.team || 'BotForge',
    prefijo: prefix,
    estado: bot?.channels?.whatsapp?.status === 'connected' ? 'en línea' : 'activo',
    version: MENU_VERSION,
    grupo: ctx.groupName || 'Grupo de WhatsApp',
    hora: ctx.time || `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    fecha:
      ctx.dateString || `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    comando: ctx.command || 'menu',
    total: String(menuCommands(bot).length),
    ayuda: `${prefix}${
      (bot?.commands || []).some((command) => command.trigger.toLowerCase() === 'help')
        ? 'help'
        : 'menu'
    }`,
  };
}

const TOKEN = /\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}/g;

/** Reemplaza {usuario}, {bot}, {prefijo}… dejando intactas las llaves desconocidas. */
export function renderMenuVars(template = '', vars = {}) {
  let output = String(template ?? '');
  for (let pass = 0; pass < 3; pass += 1) {
    const next = output.replace(TOKEN, (match, rawKey) => {
      const key = rawKey.toLowerCase();
      if (!MENU_INFO_KEYS.has(key) || !Object.prototype.hasOwnProperty.call(vars, key)) return match;
      const value = vars[key];
      return value === undefined || value === null ? '' : String(value);
    });
    if (next === output) break;
    output = next;
  }
  return output;
}

/** Texto completo del menú, listo para enviar. */
export function buildMenuText(bot, ctx = {}) {
  const menu = normalizeMenu(bot?.menu, defaultMenu());
  const vars = menuVars(bot, ctx);
  const body = menuBody(bot, menu);
  const allVars = { ...vars, comandos: body, categorias: body, lista: body };

  if (menu.mode === 'manual' && menu.custom.trim()) {
    return renderMenuVars(menu.custom, allVars)
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const lines = [];
  if (menu.showHeader) {
    lines.push(TOP, center(menu.title), BOTTOM, '');
  }
  if (menu.info.length) {
    lines.push('「 INFORMACIÓN 」', '');
    for (const item of menu.info) {
      const value = renderMenuVars(item.value || '', allVars).trim();
      lines.push(`${item.label}:${value ? ` ${value}` : ''}`);
    }
    lines.push('', RULE, '');
  }
  if (body) lines.push(body, '', RULE, '');
  if (menu.footer) lines.push(center(menu.footer), '', RULE);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Texto + banner del menú. */
export function buildMenuReply(bot, ctx = {}) {
  const menu = normalizeMenu(bot?.menu, defaultMenu());
  return { text: buildMenuText(bot, ctx), banner: menu.banner || '', menu };
}

/** Acciones que el motor envía a WhatsApp (imagen con el menú si hay banner). */
export function buildMenuActions(bot, ctx = {}, command = null) {
  const { text: body, banner } = buildMenuReply(bot, ctx);
  const url = (command?.reply?.imageUrl || '').trim() || banner;
  const delayMs = Number.isFinite(Number(command?.reply?.delayMs))
    ? Number(command.reply.delayMs)
    : 500;
  if (url) return [{ kind: 'image', url, caption: body, delayMs }];
  return [{ kind: 'text', text: body, delayMs }];
}

/** Detecta qué comandos se escribieron dentro de un texto de menú. */
export function detectMenuCommands(bot, rawText = '') {
  const prefix = bot?.settings?.prefix || '.';
  const commands = bot?.commands || [];
  const byTrigger = new Map(commands.map((command) => [command.trigger.toLowerCase(), command]));
  // Solo cuenta el prefijo al inicio de línea o después de un separador:
  // así "Versión: 1.0.0" no se toma como el comando ".0".
  const pattern = new RegExp(`(?:^|[\\s(*_~])${escapeRegExp(prefix)}([\\p{L}\\p{N}_-]+)`, 'gmu');
  const seen = new Map();
  let match = pattern.exec(String(rawText ?? ''));
  while (match) {
    const name = match[1].toLowerCase();
    if (/^\d+$/.test(name)) {
      match = pattern.exec(String(rawText ?? ''));
      continue;
    }
    if (!seen.has(name)) {
      const command =
        byTrigger.get(name) ||
        commands.find((item) =>
          (item.aliases || []).some((alias) => alias.toLowerCase() === name),
        );
      seen.set(name, {
        trigger: match[1],
        found: Boolean(command),
        name: command?.name || '',
        category: command?.category || '',
      });
    }
    match = pattern.exec(String(rawText ?? ''));
  }
  return [...seen.values()];
}

/** Respuesta del endpoint de vista previa. */
export function menuPreview(bot, ctx = {}, menuInput) {
  const menu = normalizeMenu(menuInput ?? bot?.menu, bot?.menu);
  const draft = { ...bot, menu };
  const body = buildMenuText(draft, ctx);
  const commands = detectMenuCommands(draft, body);
  return {
    menu,
    text: body,
    banner: menu.banner,
    total: menuCommands(draft).length,
    commands,
    missing: commands.filter((item) => !item.found).map((item) => item.trigger),
  };
}
