import { fold } from './util.js';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export const VARIABLES = [
  { key: 'nombre', label: 'Nombre de quien escribe', example: 'Ana' },
  { key: 'numero', label: 'Número o ID del chat', example: '+598 99 123 456' },
  { key: 'bot', label: 'Nombre del bot', example: 'Asistente de bienvenida' },
  { key: 'prefix', label: 'Prefijo de comandos', example: '!' },
  { key: 'comando', label: 'Comando recibido', example: 'menu' },
  { key: 'texto', label: 'Texto completo del mensaje', example: 'hola bot' },
  { key: 'hora', label: 'Hora actual', example: '14:32' },
  { key: 'fecha', label: 'Fecha de hoy', example: '22/10/2026' },
  { key: 'fecha_larga', label: 'Fecha en palabras', example: 'jueves 22 de octubre de 2026' },
  { key: 'grupo', label: 'Nombre del grupo (si aplica)', example: 'Equipo Ventas' },
  { key: 'canal', label: 'Canal por el que llegó', example: 'WhatsApp' },
  { key: 'lista_comandos', label: 'Lista de comandos del menú', example: '' },
  { key: 'texto:slug', label: 'Contenido de una plantilla de texto', example: '{{texto:horario}}' },
];

const pad = (n) => String(n).padStart(2, '0');

export function formatDate(date = new Date()) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatLongDate(date = new Date()) {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

/**
 * Construye las variables disponibles a partir del contexto de un mensaje.
 * `texts` permite resolver `{{texto:slug}}`.
 */
export function buildVariables(bot, ctx = {}, texts = []) {
  const date = ctx.date instanceof Date ? ctx.date : new Date();
  return {
    nombre: ctx.name || ctx.pushName || 'amigo/a',
    numero: ctx.number || ctx.from || '',
    bot: bot?.name || 'Bot',
    prefix: bot?.settings?.prefix || '!',
    comando: ctx.command || '',
    texto: ctx.text || '',
    hora: ctx.time || `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    fecha: ctx.dateString || formatDate(date),
    fecha_larga: ctx.longDate || formatLongDate(date),
    grupo: ctx.groupName || '',
    canal: ctx.channel || 'WhatsApp',
    lista_comandos: ctx.commandList || '',
    ...(ctx.extra || {}),
    __texts: texts,
  };
}

const VAR_REGEX = /\{\{\s*([a-zA-Z0-9_:.\-]+)\s*\}\}/g;

/**
 * Reemplaza variables `{{nombre}}` y plantillas `{{texto:slug}}`.
 * Es recursivo (una plantilla puede contener variables) con un límite de seguridad.
 */
export function render(template = '', vars = {}, depth = 0) {
  if (typeof template !== 'string' || !template) return '';
  if (depth > 4) return template;
  let output = template;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = output.replace(VAR_REGEX, (match, rawKey) => {
      const key = rawKey.toLowerCase();
      if (key.startsWith('texto:')) {
        const slug = key.slice(6).trim();
        const texts = vars.__texts || [];
        const found = texts.find(
          (t) => (t.slug || '').toLowerCase() === slug || (t.name || '').toLowerCase() === slug,
        );
        return found ? render(found.content, vars, depth + 1) : match;
      }
      if (Object.prototype.hasOwnProperty.call(vars, key)) {
        const value = vars[key];
        return value === undefined || value === null ? '' : String(value);
      }
      return match;
    });
    if (next === output) break;
    output = next;
  }
  return output;
}

/** Normaliza una frase para comparar (sin acentos ni mayúsculas). */
export const normalize = (text = '') => fold(String(text)).toLowerCase().trim();

export function commandListMarkup(commands = [], prefix = '!', channel = 'whatsapp') {
  return commands
    .filter((c) => c.enabled !== false && c.showInMenu !== false)
    .map((c) => {
      const trigger = c.matchType === 'command' ? `${prefix}${c.trigger}` : c.trigger;
      const aliases = c.aliases?.length ? ` _(${c.aliases.join(', ')})_` : '';
      const desc = c.description ? ` — ${c.description}` : '';
      return `• *${trigger}*${aliases}${desc}`;
    })
    .join('\n');
}
