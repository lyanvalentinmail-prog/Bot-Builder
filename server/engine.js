import { normalize, render, commandListMarkup } from './template.js';
import { buildMenuActions } from './menu.js';
import { escapeRegExp, randomOf } from './util.js';

/** ¿El mensaje corresponde al trigger del comando? Devuelve verdadero/falso. */
export function matchesCommand(command, rawText, settings = {}, ctx = {}) {
  if (!command || command.enabled === false) return false;
  if (command.scope === 'group' && !ctx.isGroup) return false;

  const prefix = settings.prefix || '!';
  const prefixRequired = settings.prefixRequired !== false;
  const caseSensitive = Boolean(settings.caseSensitive || command.caseSensitive);
  const trigger = (command.trigger || '').trim();
  if (!trigger) return false;

  const raw = String(rawText || '');
  const text = caseSensitive ? raw.trim() : normalize(raw);
  const target = caseSensitive ? trigger : normalize(trigger);

  switch (command.matchType) {
    case 'command': {
      const candidates = [target, ...(command.aliases || []).map((a) => (caseSensitive ? a : normalize(a)))];
      const prefixText = caseSensitive ? prefix : normalize(prefix);
      return candidates.some((candidate) => {
        if (!candidate) return false;
        if (prefixRequired) {
          const full = `${prefixText}${candidate}`;
          if (!text.startsWith(full)) return false;
          const rest = text.slice(full.length);
          // Evita que "!menux" dispare "!menu" pero permite "!menu args".
          return rest === '' || !/^[\p{L}\p{N}_]/u.test(rest);
        }
        return text === candidate || text.startsWith(`${candidate} `);
      });
    }
    case 'exact': {
      // Las frases naturales no requieren prefijo, pero también lo aceptan.
      const trimmed = raw.trim();
      const candidates = [trimmed];
      if (trimmed.startsWith(prefix) && trimmed.length > prefix.length) {
        candidates.push(trimmed.slice(prefix.length));
      }
      return candidates.some(
        (candidate) => (caseSensitive ? candidate : normalize(candidate)).trim() === target.trim(),
      );
    }
    case 'startsWith': {
      const trimmed = raw.trim();
      const candidates = [trimmed];
      if (trimmed.startsWith(prefix) && trimmed.length > prefix.length) {
        candidates.push(trimmed.slice(prefix.length));
      }
      return candidates.some((candidate) =>
        (caseSensitive ? candidate : normalize(candidate)).trim().startsWith(target),
      );
    }
    case 'contains':
      return (caseSensitive ? raw : normalize(raw)).includes(target);
    case 'regex': {
      try {
        const re = new RegExp(trigger, command.caseSensitive ? '' : 'i');
        return re.test(raw);
      } catch {
        return false;
      }
    }
    case 'any':
      return true;
    default:
      return false;
  }
}

/** Comandos que coinciden, ordenados por especificidad. */
export function findCommand(bot, rawText, ctx = {}) {
  const commands = (bot.commands || []).filter((c) => c.enabled !== false);
  const matched = commands.filter((c) => matchesCommand(c, rawText, bot.settings, ctx));
  matched.sort((a, b) => {
    const rank = (c) => (c.matchType === 'command' ? 0 : c.matchType === 'exact' ? 1 : 2);
    return rank(a) - rank(b) || (b.trigger?.length || 0) - (a.trigger?.length || 0);
  });
  return matched[0] || null;
}

/** Extrae el comando ingresado (sin prefijo) para mostrarlo en plantillas. */
export function extractCommandName(rawText = '', settings = {}) {
  let text = String(rawText).trim();
  const prefix = settings.prefix || '!';
  if (settings.prefixRequired !== false && text.startsWith(prefix)) {
    text = text.slice(prefix.length);
  }
  return text.split(/\s+/)[0] || '';
}

const hasKeyword = (pattern, text) => {
  if (!pattern) return false;
  return pattern
    .split(',')
    .map((p) => normalize(p))
    .filter(Boolean)
    .some((keyword) => normalize(text).includes(keyword));
};

/** Decide si el mensaje recibe una reacción automática y con qué emoji. */
export function chooseAutoReaction(bot, message = {}, isGroup = false) {
  const config = bot.autoReact || {};
  if (!config.enabled) return null;
  if (config.scope === 'group' && !isGroup) return null;

  const text = message.text || '';
  const isCommand = text.startsWith(bot.settings?.prefix || '!');
  if (isCommand && !config.onCommands) return null;

  const emojis = (config.emojis || []).filter(Boolean);
  if (!emojis.length) return null;

  const chance = Math.max(0, Math.min(100, Number(config.chance ?? 100)));
  if (chance <= 0) return null;
  if (Math.random() * 100 > chance) return null;

  return {
    emoji: randomOf(emojis),
    removeAfterSeconds: Math.max(0, Number(config.removeAfterSeconds) || 0),
  };
}

/** Reacciones creadas por el usuario (por palabra clave, comando, regex, etc.). */
export function chooseCustomReaction(bot, message = {}, ctx = {}) {
  const text = message.text || '';
  const prefix = bot.settings?.prefix || '!';
  const isCommand = text.startsWith(prefix);
  for (const reaction of bot.reactions || []) {
    if (reaction.enabled === false || !reaction.emoji) continue;
    if (reaction.scope === 'group' && !ctx.isGroup) continue;
    const chance = Math.max(0, Math.min(100, Number(reaction.chance ?? 100)));
    if (chance <= 0 || Math.random() * 100 > chance) continue;

    let hit = false;
    switch (reaction.on) {
      case 'every':
        hit = true;
        break;
      case 'keyword':
        hit = hasKeyword(reaction.pattern, text);
        break;
      case 'command':
        hit = isCommand && hasKeyword(reaction.pattern, extractCommandName(text, bot.settings));
        break;
      case 'regex':
        try {
          hit = new RegExp(reaction.pattern, 'i').test(text);
        } catch {
          hit = false;
        }
        break;
      case 'group':
        hit = Boolean(ctx.isGroup);
        break;
      case 'mention':
        hit = Boolean(ctx.mentionedMe);
        break;
      default:
        hit = false;
    }
    if (hit) return { emoji: reaction.emoji, removeAfterSeconds: reaction.removeAfterSeconds || 0 };
  }
  return null;
}

/** Acciones de respuesta a partir de la configuración del comando. */
export function buildReplyActions(bot, command, vars) {
  const reply = command.reply || {};
  const text = render(reply.text || '', vars);
  const actions = [];
  const type = reply.type || 'text';

  if (type === 'menu') {
    // El menú se genera con los comandos actuales del bot (y su banner).
    return buildMenuActions(
      bot,
      {
        name: vars.nombre,
        groupName: vars.grupo,
        time: vars.hora,
        dateString: vars.fecha,
        command: vars.comando,
        channel: vars.canal,
      },
      command,
    );
  }

  if (type === 'image') {
    const caption = render(reply.caption || reply.text || '', vars);
    if (reply.imageUrl) {
      actions.push({ kind: 'image', url: reply.imageUrl, caption, delayMs: reply.delayMs });
    } else if (caption) {
      actions.push({ kind: 'text', text: caption, delayMs: reply.delayMs });
    }
  } else if (type === 'random') {
    const variants = (reply.variants || []).map((v) => render(v, vars)).filter(Boolean);
    const chosen = variants.length ? randomOf(variants) : text;
    if (chosen) actions.push({ kind: 'text', text: chosen, delayMs: reply.delayMs });
  } else if (type === 'buttons') {
    const body = text || render(reply.caption || '', vars);
    if (body) {
      actions.push({
        kind: 'buttons',
        text: body,
        footer: render(reply.footer || bot.settings?.signature || '', vars),
        buttons: (reply.buttons || [])
          .filter((b) => b.label)
          .map((b) => ({ label: render(b.label, vars), command: b.command || '' })),
        delayMs: reply.delayMs,
      });
    }
  } else if (type !== 'none') {
    if (text) actions.push({ kind: 'text', text, delayMs: reply.delayMs });
  }

  if (reply.editAfterMs > 0 && reply.editText && actions.length) {
    const last = actions[actions.length - 1];
    if (last.kind === 'text') {
      last.editAfterMs = reply.editAfterMs;
      last.editText = render(reply.editText, vars);
    }
  }

  if (bot.settings?.signature) {
    const signature = render(bot.settings.signature, vars);
    const last = actions[actions.length - 1];
    if (last && last.kind === 'text' && !last.text.includes(signature)) {
      last.text = `${last.text}\n\n${signature}`;
    }
  }
  return actions;
}

/** Resultado completo de "procesar" un mensaje entrante. Útil para simular y para canales. */
export function processMessage(bot, message = {}, ctx = {}) {
  const text = message.text || '';
  const isGroup = Boolean(ctx.isGroup);
  const command = findCommand(bot, text, { ...ctx, isGroup });
  const commandList = commandListMarkup(bot.commands, bot.settings?.prefix, ctx.channel);
  const vars = ctx.vars || {};

  const now = new Date();
  const baseVars = {
    nombre: ctx.name || ctx.pushName || 'amigo/a',
    numero: ctx.number || ctx.from || '',
    hora: ctx.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    fecha: ctx.dateString || `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
    canal: ctx.channel || 'WhatsApp',
    grupo: ctx.groupName || '',
    ...vars,
    prefix: bot.settings?.prefix || '!',
    bot: bot.name,
    comando: extractCommandName(text, bot.settings),
    texto: text,
    lista_comandos: commandList,
    __texts: bot.texts || [],
  };

  const reactions = [];
  // Prioridad: reacción del comando > reacción personalizada > reacción automática.
  if (command?.reaction?.enabled && command.reaction.emoji) {
    reactions.push({
      emoji: command.reaction.emoji,
      removeAfterSeconds: command.reaction.removeAfterSeconds || 0,
      source: 'command',
    });
  }
  const custom = chooseCustomReaction(bot, message, { ...ctx, isGroup });
  if (custom) reactions.push({ ...custom, source: 'custom' });
  const auto = chooseAutoReaction(bot, message, isGroup);
  if (auto) reactions.push({ ...auto, source: 'auto' });

  let actions = [];
  if (command) {
    actions = buildReplyActions(bot, command, baseVars);
  } else if (bot.settings?.fallbackEnabled && bot.settings.fallbackText) {
    actions = [
      {
        kind: 'text',
        text: render(bot.settings.fallbackText, baseVars),
        delayMs: 600,
      },
    ];
  } else if (bot.settings?.unknownCommandEnabled && text.startsWith(bot.settings?.prefix || '!')) {
    const looksLikeCommand = text.trim().length > 1;
    if (looksLikeCommand) {
      actions = [
        {
          kind: 'text',
          text: render(bot.settings.unknownCommandText || '', baseVars),
          delayMs: 600,
        },
      ];
    }
  }

  return {
    command,
    matched: Boolean(command),
    reactions,
    actions,
  };
}

export { escapeRegExp };
