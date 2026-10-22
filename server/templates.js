import { defaultSettings } from './defaults.js';
import { mediaBot, menuCommand } from './pack-media.js';
import { defaultMenu } from './menu.js';

/**
 * Instancias disponibles al registrar un bot.
 * El paquete por defecto trae los 30 comandos de ejemplo y el menú editable.
 */
export const TEMPLATES = [
  {
    id: 'media',
    name: 'Multimedia y descargas',
    emoji: '🎬',
    description: '30 comandos: descargas, stickers, conversión, packs, IA e información.',
    tag: 'Completo',
    accent: 'violet',
    build: () => ({ ...mediaBot(), template: 'media' }),
  },
  {
    id: 'custom',
    name: 'Desde cero',
    emoji: '🤖',
    description: 'Empezá vacío y armá tus propios comandos y el menú a medida.',
    tag: 'Libre',
    accent: 'slate',
    build: () => ({
      name: 'Mi bot',
      emoji: '🤖',
      description: 'Bot personalizado para el grupo.',
      settings: { ...defaultSettings(), prefix: '.' },
      commands: [menuCommand()],
      texts: [],
      reactions: [],
      menu: defaultMenu(),
    }),
  },
];

export const DEFAULT_TEMPLATE = 'media';

export const getTemplate = (id) => TEMPLATES.find((template) => template.id === id) || null;

/** Construye los datos de un bot a partir de una instancia. */
export function buildTemplate(id) {
  const template = getTemplate(id) || getTemplate(DEFAULT_TEMPLATE);
  return { ...template.build(), template: template.id };
}

/** Bot de ejemplo que se crea cuando la base está vacía. */
export const seedBot = () => buildTemplate(DEFAULT_TEMPLATE);
