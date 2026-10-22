export const EXAMPLE_VARS = {
  nombre: 'Ana',
  numero: '+598 99 123 456',
  bot: 'Asistente de bienvenida',
  prefix: '!',
  comando: 'menu',
  texto: 'hola bot',
  hora: '14:32',
  fecha: '22/10/2026',
  fecha_larga: 'jueves 22 de octubre de 2026',
  grupo: 'Equipo Ventas',
  canal: 'WhatsApp',
  lista_comandos: '• *!menu* — Lista de ayuda\n• *!ping* — Comprueba que el bot está en línea',
};

const VAR_REGEX = /\{\{\s*([a-zA-Z0-9_:.\-]+)\s*\}\}/g;

/** Vista previa local de una plantilla con datos de ejemplo. */
export function previewText(template = '', { texts = [], vars = {} } = {}) {
  let output = template;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = output.replace(VAR_REGEX, (match, rawKey) => {
      const key = rawKey.toLowerCase();
      if (key.startsWith('texto:')) {
        const slug = key.slice(6).trim();
        const found = texts.find(
          (t) => (t.slug || '').toLowerCase() === slug || (t.name || '').toLowerCase() === slug,
        );
        return found ? previewText(found.content, { texts, vars }) : match;
      }
      if (Object.prototype.hasOwnProperty.call(vars, key)) return String(vars[key] ?? '');
      if (Object.prototype.hasOwnProperty.call(EXAMPLE_VARS, key)) return EXAMPLE_VARS[key];
      return match;
    });
    if (next === output) break;
    output = next;
  }
  return output;
}

/** Convierte el marcado de WhatsApp (negrita, itálica) en HTML seguro. */
export function waMarkupToHtml(text = '') {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/~([^~\n]+)~/g, '<del>$1</del>')
    .replace(/```([^`]+)```/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}
