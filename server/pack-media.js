import { defaultSettings, makeCommand } from './defaults.js';
import { defaultMenu } from './menu.js';

/**
 * Paquete de 30 comandos de ejemplo para el bot de grupos.
 * Todo es editable desde el panel (comandos, descripciones y menú).
 */

export const MEDIA_CATEGORIES = [
  'Descargas',
  'Stickers',
  'Conversión',
  'Packs',
  'Inteligencia artificial',
  'Información',
];

const text = (body) => ({ type: 'text', text: body, delayMs: 500 });

const command = ({ trigger, name, description, category, emoji, body, aliases = [] }) =>
  makeCommand({
    name,
    description,
    trigger,
    aliases,
    category,
    reaction: { enabled: true, emoji },
    reply: text(body),
  });

export const mediaCommands = () => [
  /* --------------------------- 01 · Descargas --------------------------- */
  command({
    trigger: 'tiktok',
    name: 'TikTok',
    description: 'Descarga videos de TikTok sin marca de agua.',
    category: 'Descargas',
    emoji: '🎬',
    body:
      '🎬 *TikTok*\nEnviá el enlace del video y te lo devuelvo sin marca de agua.\n\n' +
      '*{{prefix}}tiktok https://www.tiktok.com/@usuario/video/12345*\n\n> Solo videos públicos.',
  }),
  command({
    trigger: 'instagram',
    name: 'Instagram',
    description: 'Descarga fotos y videos de Instagram.',
    category: 'Descargas',
    emoji: '📸',
    body:
      '📸 *Instagram*\nEnviá el enlace de la foto, el reel o el video.\n\n' +
      '*{{prefix}}instagram https://www.instagram.com/p/abc123/*',
  }),
  command({
    trigger: 'pinterest',
    name: 'Pinterest',
    description: 'Descarga imágenes de Pinterest.',
    category: 'Descargas',
    emoji: '📌',
    body:
      '📌 *Pinterest*\nEnviá el pin y te devuelvo la imagen en tamaño completo.\n\n' +
      '*{{prefix}}pinterest https://pin.it/abc123*',
  }),
  command({
    trigger: 'ytmp3',
    name: 'YouTube MP3',
    description: 'Descarga audios de YouTube en MP3.',
    category: 'Descargas',
    emoji: '🎵',
    body:
      '🎵 *YouTube → MP3*\nEnviá el enlace del video y te paso solo el audio.\n\n' +
      '*{{prefix}}ytmp3 https://youtu.be/abc123*',
  }),
  command({
    trigger: 'ytmp4',
    name: 'YouTube MP4',
    description: 'Descarga videos de YouTube en MP4.',
    category: 'Descargas',
    emoji: '🎞️',
    body:
      '🎞️ *YouTube → MP4*\nEnviá el enlace y, si querés, la calidad.\n\n' +
      '*{{prefix}}ytmp4 https://youtu.be/abc123 720p*\n\n> Calidades: 360p, 480p, 720p y 1080p.',
  }),
  command({
    trigger: 'facebook',
    name: 'Facebook',
    description: 'Descarga videos de Facebook.',
    category: 'Descargas',
    emoji: '📘',
    body:
      '📘 *Facebook*\nEnviá el enlace del video o del reel.\n\n' +
      '*{{prefix}}facebook https://www.facebook.com/watch?v=123456*',
  }),
  command({
    trigger: 'twitter',
    name: 'Twitter / X',
    description: 'Descarga videos de Twitter/X.',
    category: 'Descargas',
    emoji: '🐦',
    body:
      '🐦 *Twitter / X*\nEnviá el enlace del video o del GIF.\n\n' +
      '*{{prefix}}twitter https://x.com/usuario/status/123456*',
  }),
  command({
    trigger: 'spotify',
    name: 'Spotify',
    description: 'Descarga canciones de Spotify.',
    category: 'Descargas',
    emoji: '🎧',
    body:
      '🎧 *Spotify*\nEnviá el enlace de la canción y te paso el audio.\n\n' +
      '*{{prefix}}spotify https://open.spotify.com/track/abc123*',
  }),
  command({
    trigger: 'mediafire',
    name: 'MediaFire',
    description: 'Descarga archivos de MediaFire.',
    category: 'Descargas',
    emoji: '📦',
    body:
      '📦 *MediaFire*\nEnviá el enlace del archivo.\n\n' +
      '*{{prefix}}mediafire https://www.mediafire.com/file/abc123/archivo.zip*',
  }),
  command({
    trigger: 'play',
    name: 'Buscar música',
    description: 'Busca y descarga música por nombre.',
    category: 'Descargas',
    emoji: '🎶',
    body:
      '🎶 *Buscar música*\nEscribí el nombre de la canción y te muestro las coincidencias.\n\n' +
      '*{{prefix}}play nombre de la canción*',
  }),

  /* ---------------------------- 02 · Stickers --------------------------- */
  command({
    trigger: 'sticker',
    name: 'Sticker',
    description: 'Convierte una imagen en sticker.',
    category: 'Stickers',
    emoji: '🧩',
    body:
      '🧩 *Sticker*\nRespondé a una imagen con *{{prefix}}sticker* y la convierto en sticker.\n\n' +
      '> También sirve con imágenes enviadas junto al comando.',
  }),
  command({
    trigger: 'brat',
    name: 'Brat',
    description: 'Crea stickers con estilo Brat.',
    category: 'Stickers',
    emoji: '🟩',
    body: '🟩 *Brat*\nEscribí el texto y armo el sticker con ese estilo.\n\n*{{prefix}}brat hola mundo*',
  }),
  command({
    trigger: 'attp',
    name: 'Sticker animado',
    description: 'Convierte texto en sticker animado.',
    category: 'Stickers',
    emoji: '✨',
    body: '✨ *Sticker animado*\nEscribí el texto y te devuelvo el sticker en movimiento.\n\n*{{prefix}}attp hola mundo*',
  }),
  command({
    trigger: 'ttp',
    name: 'Sticker de texto',
    description: 'Convierte texto en sticker.',
    category: 'Stickers',
    emoji: '🖼️',
    body: '🖼️ *Sticker de texto*\nEscribí el texto y te devuelvo el sticker.\n\n*{{prefix}}ttp hola mundo*',
  }),
  command({
    trigger: 'gif',
    name: 'GIF a sticker',
    description: 'Convierte un GIF en sticker animado.',
    category: 'Stickers',
    emoji: '🎞️',
    body:
      '🎞️ *GIF → Sticker*\nEnviá o respondé a un GIF con *{{prefix}}gif* y lo convierto en sticker animado.',
  }),
  command({
    trigger: 'emojimix',
    name: 'Emojimix',
    description: 'Combina dos emojis en un sticker.',
    category: 'Stickers',
    emoji: '🎭',
    body: '🎭 *Emojimix*\nCombiná dos emojis y te devuelvo el sticker.\n\n*{{prefix}}emojimix 😀 🔥*',
  }),
  command({
    trigger: 'search',
    name: 'Buscar stickers',
    description: 'Busca stickers por nombre.',
    category: 'Stickers',
    emoji: '🔍',
    body: '🔍 *Buscar stickers*\nEscribí qué buscás y te muestro opciones.\n\n*{{prefix}}search gatitos*',
  }),
  command({
    trigger: 'searchpack',
    name: 'Buscar packs',
    description: 'Busca paquetes de stickers.',
    category: 'Stickers',
    emoji: '📚',
    body:
      '📚 *Buscar packs*\nEscribí el nombre y te muestro paquetes completos.\n\n*{{prefix}}searchpack anime*',
  }),
  command({
    trigger: 'take',
    name: 'Renombrar sticker',
    description: 'Cambia el nombre y autor de un sticker.',
    category: 'Stickers',
    emoji: '✏️',
    body:
      '✏️ *Renombrar sticker*\nRespondé al sticker con:\n\n' +
      '*{{prefix}}take nombre | autor*',
  }),

  /* --------------------------- 03 · Conversión -------------------------- */
  command({
    trigger: 'toimg',
    name: 'Sticker a imagen',
    description: 'Convierte un sticker en imagen.',
    category: 'Conversión',
    emoji: '🖼️',
    body: '🖼️ *Sticker → Imagen*\nRespondé a un sticker con *{{prefix}}toimg* y te lo envío como imagen.',
  }),
  command({
    trigger: 'tovideo',
    name: 'Sticker a video',
    description: 'Convierte un sticker animado en video.',
    category: 'Conversión',
    emoji: '🎬',
    body:
      '🎬 *Sticker animado → Video*\nRespondé al sticker con *{{prefix}}tovideo* y te lo envío como video.',
  }),
  command({
    trigger: 'tomp3',
    name: 'Video a MP3',
    description: 'Convierte un video en audio MP3.',
    category: 'Conversión',
    emoji: '🎵',
    body:
      '🎵 *Video → MP3*\nRespondé a un video con *{{prefix}}tomp3* y te devuelvo solo el audio.',
  }),
  command({
    trigger: 'toaudio',
    name: 'Video a audio',
    description: 'Convierte un video en audio.',
    category: 'Conversión',
    emoji: '🎧',
    body:
      '🎧 *Video → Audio*\nRespondé a un video con *{{prefix}}toaudio* y te lo envío como nota de voz.',
  }),
  command({
    trigger: 'togif',
    name: 'Video a GIF',
    description: 'Convierte un video en GIF.',
    category: 'Conversión',
    emoji: '🌀',
    body:
      '🌀 *Video → GIF*\nRespondé a un video corto con *{{prefix}}togif* y te devuelvo el GIF.',
  }),

  /* ----------------------------- 04 · Packs ----------------------------- */
  command({
    trigger: 'pack',
    name: 'Crear pack',
    description: 'Crea paquetes de stickers personalizados.',
    category: 'Packs',
    emoji: '🗂️',
    body:
      '🗂️ *Crear pack*\nRespondé a un sticker con:\n\n' +
      '*{{prefix}}pack nombre del pack*\n\n' +
      '> Después sumá más stickers con *{{prefix}}take* y el mismo nombre de pack.',
  }),

  /* ------------------------ 05 · Inteligencia artificial ----------------- */
  command({
    trigger: 'gemini',
    name: 'Gemini',
    description: 'Consulta a la inteligencia artificial Gemini.',
    category: 'Inteligencia artificial',
    emoji: '🤖',
    body:
      '🤖 *Gemini*\nEscribí tu consulta después del comando.\n\n' +
      '*{{prefix}}gemini ¿qué es un agujero negro?*',
  }),
  command({
    trigger: 'chatgpt',
    name: 'ChatGPT',
    description: 'Conversa con ChatGPT.',
    category: 'Inteligencia artificial',
    emoji: '💬',
    body:
      '💬 *ChatGPT*\nEscribí tu consulta después del comando.\n\n' +
      '*{{prefix}}chatgpt escribime un mensaje de bienvenida*',
  }),
  command({
    trigger: 'deepseek',
    name: 'DeepSeek',
    description: 'Consulta a la inteligencia artificial DeepSeek.',
    category: 'Inteligencia artificial',
    emoji: '🧠',
    body:
      '🧠 *DeepSeek*\nEscribí tu consulta después del comando.\n\n' +
      '*{{prefix}}deepseek explicá los pasos para crear un grupo*',
  }),

  /* --------------------------- 06 · Información ------------------------- */
  command({
    trigger: 'help',
    name: 'Ayuda',
    description: 'Muestra información sobre un comando.',
    category: 'Información',
    emoji: '❓',
    body:
      '❓ *Ayuda*\nEscribí *{{prefix}}menu* para ver todos los comandos.\n' +
      'Para usar uno, mandalo con sus datos:\n\n*{{prefix}}tiktok https://…*',
  }),
  command({
    trigger: 'debug',
    name: 'Debug',
    description: 'Muestra información para detectar errores.',
    category: 'Información',
    emoji: '🛠️',
    body:
      '🛠️ *Debug*\n\n' +
      '• Bot: *{{bot}}*\n' +
      '• Grupo: {{grupo}}\n' +
      '• Usuario: {{nombre}}\n' +
      '• Prefijo: *{{prefix}}*\n' +
      '• Hora: {{hora}}',
  }),
];

/** Comando que envía el menú (tipo de respuesta `menu`). */
export const menuCommand = () =>
  makeCommand({
    name: 'Menú',
    description: 'Muestra todos los comandos disponibles.',
    trigger: 'menu',
    category: 'Información',
    showInMenu: false,
    reaction: { enabled: true, emoji: '👋' },
    reply: { type: 'menu', text: '', delayMs: 400 },
  });

export const mediaSettings = () => ({
  ...defaultSettings(),
  prefix: '.',
  unknownCommandText:
    '🤔 No conozco ese comando, {{nombre}}.\nEscribí *{{prefix}}menu* para ver los 30 comandos disponibles.',
});

/** Bot completo del paquete (30 comandos + menú). */
export const mediaBot = () => ({
  name: 'Multimedia del grupo',
  emoji: '🎬',
  description: '30 comandos de descargas, stickers, conversión, IA e información para el grupo.',
  settings: mediaSettings(),
  commands: [...mediaCommands(), menuCommand()],
  texts: [],
  reactions: [],
  menu: defaultMenu(),
});
