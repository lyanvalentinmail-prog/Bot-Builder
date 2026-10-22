import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesCommand,
  findCommand,
  chooseAutoReaction,
  chooseCustomReaction,
  buildReplyActions,
  processMessage,
  extractCommandName,
} from '../server/engine.js';
import { render, buildVariables, commandListMarkup } from '../server/template.js';
import { makeCommand, newBot, defaultSettings } from '../server/defaults.js';

const settings = { ...defaultSettings(), prefix: '!' };

const cmd = (overrides = {}) => makeCommand({ name: 'Prueba', trigger: 'test', ...overrides });

test('coincide con el prefijo y alias', () => {
  const command = cmd({ trigger: 'menu', aliases: ['help'] });
  assert.equal(matchesCommand(command, '!menu', settings), true);
  assert.equal(matchesCommand(command, '!MENU', settings), true);
  assert.equal(matchesCommand(command, '!help ahora', settings), true);
  assert.equal(matchesCommand(command, '!menux', settings), false);
  assert.equal(matchesCommand(command, 'menu', settings), false);

  const withLongAlias = cmd({ trigger: 'menu', aliases: ['comandos'] });
  assert.equal(matchesCommand(withLongAlias, '!comandos', settings), true);
  assert.equal(matchesCommand(withLongAlias, '!comandos ya', settings), true);
  assert.equal(matchesCommand(withLongAlias, '!comandosx', settings), false);
});

test('funciona sin prefijo si prefixRequired es false', () => {
  const command = cmd({ trigger: 'menu' });
  assert.equal(matchesCommand(command, 'menu', { ...settings, prefixRequired: false }), true);
  assert.equal(matchesCommand(command, 'menu ya', { ...settings, prefixRequired: false }), true);
  assert.equal(matchesCommand(command, 'menú', { ...settings, prefixRequired: false }), true);
});

test('coincidencia exacta, contiene, empieza con y regex', () => {
  assert.equal(matchesCommand(cmd({ trigger: 'hola', matchType: 'exact' }), '!hola', settings), true);
  assert.equal(matchesCommand(cmd({ trigger: 'hola', matchType: 'exact' }), 'hola', settings), true);
  assert.equal(matchesCommand(cmd({ trigger: 'hola', matchType: 'exact' }), 'Hola', settings), true);
  assert.equal(matchesCommand(cmd({ trigger: 'hola', matchType: 'exact' }), '!hola que tal', settings), false);
  assert.equal(matchesCommand(cmd({ trigger: 'pedido', matchType: 'startsWith' }), 'pedido 123', settings), true);
  assert.equal(matchesCommand(cmd({ trigger: 'precio', matchType: 'contains' }), 'cual es el precio?', settings), true);
  assert.equal(matchesCommand(cmd({ trigger: 'pedido', matchType: 'startsWith' }), '!pedido 123', settings), true);
  assert.equal(matchesCommand(cmd({ trigger: '^pedido \\d+$', matchType: 'regex' }), 'pedido 55', settings), true);
  assert.equal(matchesCommand(cmd({ trigger: '[', matchType: 'regex' }), 'algo', settings), false);
  assert.equal(matchesCommand(cmd({ trigger: 'x', matchType: 'any' }), 'lo que sea', settings), true);
});

test('respeta el alcance de grupo y el estado del comando', () => {
  const groupOnly = cmd({ trigger: 'menu', scope: 'group' });
  assert.equal(matchesCommand(groupOnly, '!menu', settings, { isGroup: true }), true);
  assert.equal(matchesCommand(groupOnly, '!menu', settings, { isGroup: false }), false);
  // «dm» ya no es un alcance válido: se normaliza a «all».
  assert.equal(cmd({ trigger: 'menu', scope: 'dm' }).scope, 'all');
  assert.equal(matchesCommand(cmd({ trigger: 'menu', enabled: false }), '!menu', settings), false);
});

test('findCommand prioriza los comandos con prefijo más específicos', () => {
  const bot = {
    settings,
    commands: [
      cmd({ trigger: 'precio', matchType: 'contains' }),
      cmd({ trigger: 'precio', matchType: 'command' }),
    ],
  };
  const found = findCommand(bot, '!precio 20', {});
  assert.equal(found.matchType, 'command');
});

test('render reemplaza variables y plantillas anidadas', () => {
  const vars = {
    nombre: 'Ana',
    prefix: '!',
    __texts: [{ slug: 'horario', name: 'Horario', content: 'Abrimos a las 9, {{nombre}}' }],
  };
  assert.equal(render('Hola {{nombre}}', vars), 'Hola Ana');
  assert.equal(render('Usá {{ prefix }}menu', vars), 'Usá !menu');
  assert.equal(render('{{texto:horario}}', vars), 'Abrimos a las 9, Ana');
  assert.equal(render('{{desconocida}}', vars), '{{desconocida}}');
  assert.equal(
    render('{{texto:horario}}', { ...vars, __texts: [{ slug: 'horario', content: '{{texto:horario}}' }] }),
    '{{texto:horario}}',
  );
});

test('el bot nace configurado solo para grupos de WhatsApp', () => {
  const bot = newBot({ name: 'Grupos' });
  assert.equal(bot.channels.teams, undefined);
  assert.ok(bot.channels.whatsapp);
  assert.equal(bot.settings.requireMention, false);
  assert.equal(bot.settings.ignoreGroups, undefined);
  assert.equal('dm' in bot.settings, false);
});

test('buildVariables arma datos de ejemplo', () => {
  const vars = buildVariables({ name: 'Bot', settings: { prefix: '#' } }, { name: 'Ana', text: 'hola' });
  assert.equal(vars.nombre, 'Ana');
  assert.equal(vars.bot, 'Bot');
  assert.equal(vars.prefix, '#');
  assert.equal(vars.texto, 'hola');
  assert.match(vars.hora, /^\d{2}:\d{2}$/);
});

test('la reacción automática respeta probabilidad, alcance y comandos', () => {
  const bot = {
    autoReact: { enabled: true, emojis: ['🔥'], chance: 100, onCommands: false, scope: 'all' },
    settings,
  };
  assert.ok(chooseAutoReaction(bot, { text: 'hola' }, false));
  assert.equal(chooseAutoReaction(bot, { text: '!menu' }, false), null);
  assert.equal(
    chooseAutoReaction({ ...bot, autoReact: { ...bot.autoReact, chance: 0 } }, { text: 'hola' }, false),
    null,
  );
  assert.equal(
    chooseAutoReaction({ ...bot, autoReact: { ...bot.autoReact, scope: 'group' } }, { text: 'hola' }, false),
    null,
  );
  assert.ok(
    chooseAutoReaction({ ...bot, autoReact: { ...bot.autoReact, scope: 'group' } }, { text: 'hola' }, true),
  );
  assert.equal(chooseAutoReaction({ ...bot, autoReact: { enabled: false } }, { text: 'hola' }, false), null);
});

test('las reacciones personalizadas detectan palabras clave', () => {
  const bot = {
    settings,
    reactions: [
      {
        enabled: true,
        emoji: '❤️',
        on: 'keyword',
        pattern: 'gracias, genial',
        scope: 'all',
        chance: 100,
      },
    ],
  };
  const reaction = chooseCustomReaction(bot, { text: '¡Muchas GRACIAS!' }, {});
  assert.equal(reaction.emoji, '❤️');
  assert.equal(chooseCustomReaction(bot, { text: 'hola' }, {}), null);
});

test('buildReplyActions genera texto, botones y edición', () => {
  const bot = { name: 'Bot', settings: { prefix: '!', signature: '' }, texts: [] };
  const vars = { nombre: 'Ana', prefix: '!' };

  const text = buildReplyActions(
    bot,
    cmd({ reply: { type: 'text', text: 'Hola {{nombre}}', delayMs: 10, editAfterMs: 2000, editText: 'Editado' } }),
    vars,
  );
  assert.equal(text.length, 1);
  assert.equal(text[0].text, 'Hola Ana');
  assert.equal(text[0].editText, 'Editado');

  const buttons = buildReplyActions(
    bot,
    cmd({ reply: { type: 'buttons', text: 'Elegí', buttons: [{ label: 'Menú', command: '!menu' }] } }),
    vars,
  );
  assert.equal(buttons[0].buttons[0].label, 'Menú');

  const random = buildReplyActions(
    bot,
    cmd({ reply: { type: 'random', variants: ['Uno {{nombre}}', 'Dos'] } }),
    vars,
  );
  assert.ok(['Uno Ana', 'Dos'].includes(random[0].text));

  const none = buildReplyActions(bot, cmd({ reply: { type: 'none' } }), vars);
  assert.equal(none.length, 0);
});

test('la firma se agrega a la respuesta', () => {
  const bot = { name: 'Bot', settings: { prefix: '!', signature: '— Equipo' }, texts: [] };
  const actions = buildReplyActions(bot, cmd({ reply: { type: 'text', text: 'Hola' } }), {});
  assert.match(actions[0].text, /— Equipo/);
});

test('processMessage responde con menú y reacciones', () => {
  const bot = newBot({
    settings: { ...settings },
    commands: [
      cmd({
        trigger: 'menu',
        reaction: { enabled: true, emoji: '👋' },
        reply: { type: 'text', text: 'Comandos: {{lista_comandos}}' },
      }),
    ],
  });
  bot.autoReact.enabled = false;
  const result = processMessage(bot, { text: '!menu' }, { isGroup: false });
  assert.equal(result.matched, true);
  assert.equal(result.reactions[0].emoji, '👋');
  assert.match(result.actions[0].text, /!menu/);
});

test('la reacción del comando tiene prioridad sobre la automática', () => {
  const bot = newBot({
    commands: [
      cmd({
        trigger: 'hola',
        matchType: 'startsWith',
        reaction: { enabled: true, emoji: '❤️' },
        reply: { type: 'text', text: 'Hola' },
      }),
    ],
    reactions: [],
  });
  bot.autoReact = { enabled: true, emojis: ['🔥'], chance: 100, onCommands: true, scope: 'all' };
  const result = processMessage(bot, { text: 'hola' }, { isGroup: false });
  assert.equal(result.reactions[0].source, 'command');
  assert.equal(result.reactions[0].emoji, '❤️');
});

test('processMessage resuelve variables del contexto sin vars explícitas', () => {
  const bot = newBot({
    commands: [cmd({ trigger: 'hola', reply: { type: 'text', text: 'Hola {{nombre}} por {{canal}}' } })],
  });
  bot.autoReact.enabled = false;
  const result = processMessage(bot, { text: '!hola' }, { name: 'Ana', channel: 'WhatsApp' });
  assert.equal(result.actions[0].text, 'Hola Ana por WhatsApp');
});

test('processMessage usa respaldo y aviso de comando desconocido', () => {
  const bot = newBot({ commands: [], settings: { ...settings, fallbackEnabled: true, fallbackText: 'Nada' } });
  bot.autoReact.enabled = false;
  const withFallback = processMessage(bot, { text: 'hola' }, {});
  assert.equal(withFallback.actions[0].text, 'Nada');

  const noFallback = newBot({ commands: [] });
  noFallback.autoReact.enabled = false;
  const unknown = processMessage(noFallback, { text: '!nada' }, {});
  assert.match(unknown.actions[0].text, /No conozco ese comando/);
});

test('extractCommandName quita el prefijo', () => {
  assert.equal(extractCommandName('!menu algo', settings), 'menu');
  assert.equal(extractCommandName('menu', { ...settings, prefixRequired: false }), 'menu');
});

test('commandListMarkup genera el menú', () => {
  const commands = [makeCommand({ trigger: 'menu', description: 'Ayuda' })];
  const markup = commandListMarkup(commands, '!');
  assert.match(markup, /!menu/);
  assert.match(markup, /Ayuda/);
});
