import { makeCommand, defaultTexts, defaultSettings } from './defaults.js';
import { uid } from './util.js';

const textTemplate = (name, slug, content, description = '') => ({
  id: uid('txt_'),
  name,
  slug,
  content,
  description,
});

const starterCommands = () => [
  makeCommand({
    name: 'Menú de ayuda',
    description: 'Muestra todos los comandos disponibles.',
    trigger: 'menu',
    aliases: ['help', 'ayuda', 'comandos'],
    reaction: { enabled: true, emoji: '👋' },
    reply: {
      type: 'text',
      text:
        '👋 ¡Hola *{{nombre}}*! Soy *{{bot}}*.\n\n' +
        'Estos son mis comandos:\n{{lista_comandos}}\n\n' +
        'Escribí *{{prefix}}menu* cuando quieras volver a verme.',
    },
  }),
  makeCommand({
    name: 'Ping',
    description: 'Verifica que el bot esté en línea.',
    trigger: 'ping',
    aliases: ['estado'],
    reaction: { enabled: true, emoji: '🟢' },
    reply: { type: 'text', text: '🟢 *Pong!* Todo funcionando.\n🕒 {{hora}}' },
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
        '¡Hola {{nombre}}! 👋 ¿En qué te ayudo?',
        '¡Buenas {{nombre}}! 😄 Escribí *{{prefix}}menu* para ver mis comandos.',
        '¡Hey! Qué bueno verte por acá ✨',
      ],
    },
  }),
  makeCommand({
    name: 'Información',
    description: 'Presenta al bot y su propósito.',
    trigger: 'info',
    aliases: ['bot'],
    reply: {
      type: 'text',
      text:
        '🤖 *{{bot}}*\n\nSoy un asistente automático creado con BotForge.\n' +
        'Respondo en este grupo de WhatsApp al instante.',
    },
  }),
];

export const TEMPLATES = [
  {
    id: 'starter',
    name: 'Asistente general',
    emoji: '💬',
    description: 'Menú, ping, saludos y una presentación. Ideal para empezar.',
    tag: 'Base',
    accent: 'indigo',
    build: () => ({
      name: 'Asistente de bienvenida',
      emoji: '💬',
      description: 'Bot de ejemplo con comandos, reacciones y plantillas listas para personalizar.',
      settings: { ...defaultSettings() },
      commands: starterCommands(),
      texts: defaultTexts(),
      reactions: [],
    }),
  },
  {
    id: 'support',
    name: 'Atención al cliente',
    emoji: '🎧',
    description: 'Horarios, precios, estado del pedido y derivación a una persona.',
    tag: 'Ventas',
    accent: 'emerald',
    build: () => ({
      name: 'Atención al cliente',
      emoji: '🎧',
      description: 'Responde consultas frecuentes y deriva a un humano cuando hace falta.',
      settings: {
        ...defaultSettings(),
        unknownCommandText:
          'No encontré una respuesta para *{{comando}}*.\nEscribí *{{prefix}}menu* para ver qué puedo hacer o *{{prefix}}humano* para hablar con una persona.',
        signature: '— Equipo de atención',
      },
      texts: [
        textTemplate(
          'Horario',
          'horario',
          '🕘 *Nuestro horario*\n\nLunes a viernes de 9:00 a 18:00\nSábados de 9:00 a 13:00\nDomingos y feriados cerrado.',
        ),
        textTemplate(
          'Envíos',
          'envios',
          '🚚 *Envíos*\n\n• Montevideo: 24 h\n• Interior: 2 a 4 días hábiles\n• Retiro en sucursal: sin costo',
        ),
        textTemplate(
          'Pagos',
          'pagos',
          '💳 *Medios de pago*\n\nTransferencia, tarjetas de crédito/débito y efectivo en sucursal.',
        ),
      ],
      commands: [
        makeCommand({
          name: 'Menú',
          description: 'Lista de ayuda.',
          trigger: 'menu',
          aliases: ['ayuda', 'opciones'],
          reaction: { enabled: true, emoji: '👋' },
          reply: {
            type: 'buttons',
            text: '👋 ¡Hola *{{nombre}}*! ¿Con qué te puedo ayudar hoy?',
            footer: 'Elegí una opción o escribí {{prefix}}menu',
            buttons: [
              { label: 'Ver horarios', command: '!horario' },
              { label: 'Precios y pagos', command: '!pagos' },
              { label: 'Hablar con persona', command: '!humano' },
            ],
          },
        }),
        makeCommand({
          name: 'Horarios',
          description: 'Horario de atención.',
          trigger: 'horario',
          aliases: ['horarios'],
          reaction: { enabled: true, emoji: '🕘' },
          reply: { type: 'text', text: '{{texto:horario}}' },
        }),
        makeCommand({
          name: 'Precios',
          description: 'Consulta de precios y medios de pago.',
          trigger: 'precio',
          aliases: ['precios', 'pagos', 'tarjeta'],
          reaction: { enabled: true, emoji: '💳' },
          reply: {
            type: 'text',
            text:
              '💬 *Precios*\n\nContanos qué producto te interesa y te pasamos la lista actualizada.\n\n{{texto:pagos}}',
          },
        }),
        makeCommand({
          name: 'Envíos',
          description: 'Tiempos y costos de envío.',
          trigger: 'envio',
          aliases: ['envios', 'entrega'],
          reply: { type: 'text', text: '{{texto:envios}}' },
        }),
        makeCommand({
          name: 'Derivar a humano',
          description: 'Avisa que una persona va a continuar la charla.',
          trigger: 'humano',
          aliases: ['persona', 'agente', 'soporte'],
          reaction: { enabled: true, emoji: '🧑‍💻' },
          reply: {
            type: 'text',
            text:
              '🧑‍💻 ¡Listo, {{nombre}}! Ya avisé a una persona del equipo.\n' +
              'Te respondemos dentro del horario de atención.\n\n{{texto:horario}}',
          },
        }),
        makeCommand({
          name: 'Estado del pedido',
          description: 'Explica cómo consultar el envío.',
          trigger: 'pedido',
          aliases: ['orden', 'seguimiento'],
          reply: {
            type: 'text',
            text:
              '📦 Para ver el estado de tu pedido enviame el número de orden con *{{prefix}}pedido* y el número, por ejemplo:\n\n*{{prefix}}pedido 12345*',
          },
        }),
      ],
    }),
  },
  {
    id: 'store',
    name: 'Tienda y catálogo',
    emoji: '🛍️',
    description: 'Catálogo, precios, promociones y toma de pedidos.',
    tag: 'E-commerce',
    accent: 'amber',
    build: () => ({
      name: 'Tienda',
      emoji: '🛍️',
      description: 'Catálogo, promociones y toma de pedidos por chat.',
      settings: {
        ...defaultSettings(),
        signature: '🛍️ Tienda — compras simples por chat',
        welcomeEnabled: true,
        welcomeText:
          '¡Hola {{nombre}}! 👋 Soy *{{bot}}*. Escribí *{{prefix}}menu* para ver el catálogo y las promos.',
      },
      texts: [
        textTemplate(
          'Catálogo',
          'catalogo',
          '🛍️ *Catálogo*\n\n1. Remera básica — $ 790\n2. Buzo oversize — $ 1.890\n3. Gorra — $ 590\n4. Mochila urbana — $ 2.400',
        ),
        textTemplate(
          'Promos',
          'promos',
          '🎉 *Promos del mes*\n\n• 2 remeras por $ 1.400\n• Envío gratis desde $ 2.000 en Montevideo\n• 10% off pagando por transferencia',
        ),
        textTemplate(
          'Cómo comprar',
          'comprar',
          '🧾 *Cómo comprar*\n\n1. Elegí el producto\n2. Enviá *{{prefix}}pedir* + producto + talle\n3. Te confirmamos stock y total\n4. Coordinamos pago y envío',
        ),
      ],
      commands: [
        makeCommand({
          name: 'Menú',
          description: 'Muestra catálogo y opciones.',
          trigger: 'menu',
          aliases: ['tienda', 'ayuda'],
          reaction: { enabled: true, emoji: '🛍️' },
          reply: {
            type: 'buttons',
            text: '🛍️ *{{bot}}*\n\n¿Qué querés ver?',
            footer: 'Escribí {{prefix}}menu cuando quieras',
            buttons: [
              { label: 'Ver catálogo', command: '!catalogo' },
              { label: 'Promos', command: '!promos' },
              { label: 'Cómo comprar', command: '!comprar' },
            ],
          },
        }),
        makeCommand({
          name: 'Catálogo',
          description: 'Lista de productos.',
          trigger: 'catalogo',
          aliases: ['productos', 'lista'],
          reply: { type: 'text', text: '{{texto:catalogo}}' },
        }),
        makeCommand({
          name: 'Promos',
          description: 'Descuentos vigentes.',
          trigger: 'promo',
          aliases: ['promos', 'descuento', 'oferta'],
          reaction: { enabled: true, emoji: '🎉' },
          reply: { type: 'text', text: '{{texto:promos}}' },
        }),
        makeCommand({
          name: 'Pedir',
          description: 'Inicia un pedido.',
          trigger: 'pedir',
          aliases: ['comprar', 'ordenar'],
          matchType: 'startsWith',
          reaction: { enabled: true, emoji: '🧾' },
          reply: {
            type: 'buttons',
            text:
              '🧾 ¡Perfecto, {{nombre}}! Para dejar tu pedido necesitamos:\n\n• Producto y talle\n• Ciudad de envío\n• Medio de pago\n\n{{texto:comprar}}',
            buttons: [
              { label: 'Ver catálogo', command: '!catalogo' },
              { label: 'Medios de pago', command: '!pagos' },
            ],
          },
        }),
        makeCommand({
          name: 'Pagos y envíos',
          description: 'Medios de pago y envíos.',
          trigger: 'pagos',
          aliases: ['envio', 'envios', 'pago'],
          reply: {
            type: 'text',
            text:
              '💳 Aceptamos transferencia, tarjetas y efectivo.\n🚚 Envíos en 24 h en Montevideo y 2 a 4 días al interior.\n📦 Envío gratis desde $ 2.000.',
          },
        }),
      ],
    }),
  },
  {
    id: 'community',
    name: 'Comunidad y grupos',
    emoji: '👥',
    description: 'Reglas, bienvenidas, advertencias y moderación básica.',
    tag: 'Comunidad',
    accent: 'violet',
    build: () => ({
      name: 'Moderador de comunidad',
      emoji: '👥',
      description: 'Da la bienvenida, comparte reglas y ayuda a ordenar el grupo.',
      settings: {
        ...defaultSettings(),
        ignoreGroups: false,
        welcomeEnabled: true,
        welcomeText:
          '¡Bienvenido/a {{nombre}}! 👋\nSoy *{{bot}}*. Antes de escribir, leé las reglas con *{{prefix}}reglas*.',
        prefix: '!',
        signature: '',
      },
      texts: [
        textTemplate(
          'Reglas',
          'reglas',
          '📋 *Reglas del grupo*\n\n1. Respeto ante todo: sin insultos ni discriminación.\n2. Nada de spam ni cadenas.\n3. Consultas laborales por privado.\n4. Si no es del tema, hay un grupo específico.\n5. Tres advertencias = expulsión.',
        ),
        textTemplate(
          'Links útiles',
          'links',
          '🔗 *Links útiles*\n\n• Formulario de ingreso: https://ejemplo.com/form\n• Reglamento: https://ejemplo.com/reglas\n• Contacto: https://ejemplo.com/contacto',
        ),
      ],
      commands: [
        makeCommand({
          name: 'Reglas',
          description: 'Muestra las reglas del grupo.',
          trigger: 'reglas',
          aliases: ['rules', 'normas'],
          reaction: { enabled: true, emoji: '📋' },
          reply: { type: 'text', text: '{{texto:reglas}}' },
        }),
        makeCommand({
          name: 'Bienvenida',
          description: 'Mensaje de bienvenida reutilizable.',
          trigger: 'bienvenida',
          aliases: ['bienvenido'],
          reply: { type: 'text', text: '{{texto:bienvenida}}' },
        }),
        makeCommand({
          name: 'Links',
          description: 'Links de la comunidad.',
          trigger: 'links',
          aliases: ['enlaces'],
          reply: { type: 'text', text: '{{texto:links}}' },
        }),
        makeCommand({
          name: 'Advertencia',
          description: 'Aviso formal para moderar.',
          trigger: 'warn',
          aliases: ['advertencia', 'aviso'],
          matchType: 'startsWith',
          reaction: { enabled: true, emoji: '⚠️' },
          reply: {
            type: 'text',
            text:
              '⚠️ *Aviso de moderación*\n\nSe registró una advertencia. Revisá las reglas con *{{prefix}}reglas*.\n\nTres advertencias implican la expulsión del grupo.',
          },
        }),
        makeCommand({
          name: 'Menú',
          description: 'Ayuda de la comunidad.',
          trigger: 'menu',
          aliases: ['ayuda'],
          reply: { type: 'text', text: '{{lista_comandos}}' },
        }),
      ],
    }),
  },
  {
    id: 'events',
    name: 'Eventos e inscripciones',
    emoji: '🎟️',
    description: 'Programa, ubicación, entradas e inscripciones.',
    tag: 'Eventos',
    accent: 'rose',
    build: () => ({
      name: 'Anuncios del evento',
      emoji: '🎟️',
      description: 'Info del evento, programa e inscripciones.',
      settings: {
        ...defaultSettings(),
        signature: '🎟️ Organización del evento',
        welcomeText:
          '¡Hola {{nombre}}! Soy *{{bot}}*. Escribí *{{prefix}}menu* para ver programa, ubicación e inscripciones.',
      },
      texts: [
        textTemplate(
          'Programa',
          'programa',
          '🗓️ *Programa*\n\n09:00 Acreditación\n10:00 Apertura y charla principal\n12:00 Almuerzo y networking\n14:00 Talleres simultáneos\n17:00 Cierre y sorteos',
        ),
        textTemplate(
          'Ubicación',
          'ubicacion',
          '📍 *Dónde es*\n\nCentro de Convenciones\nAv. Ejemplo 1234, Montevideo\n\n🚌 Líneas 121, 175 y 195\n🅿️ Estacionamiento gratuito hasta completar capacidad',
        ),
        textTemplate(
          'Inscripción',
          'inscripcion',
          '🎟️ *Inscripción*\n\nEnviá *{{prefix}}inscribirme* + nombre y email, por ejemplo:\n\n*{{prefix}}inscribirme Ana | ana@mail.com*\n\nTe confirmamos el cupo al instante.',
        ),
      ],
      commands: [
        makeCommand({
          name: 'Menú',
          description: 'Todo sobre el evento.',
          trigger: 'menu',
          aliases: ['info', 'evento'],
          reply: {
            type: 'buttons',
            text: '🎟️ *{{bot}}*\n\n¿Qué información necesitás?',
            footer: 'Elegí una opción',
            buttons: [
              { label: 'Programa', command: '!programa' },
              { label: 'Ubicación', command: '!ubicacion' },
              { label: 'Inscribirme', command: '!inscribirme' },
            ],
          },
        }),
        makeCommand({
          name: 'Programa',
          description: 'Cronograma del evento.',
          trigger: 'programa',
          aliases: ['agenda', 'cronograma'],
          reply: { type: 'text', text: '{{texto:programa}}' },
        }),
        makeCommand({
          name: 'Ubicación',
          description: 'Dirección y cómo llegar.',
          trigger: 'ubicacion',
          aliases: ['direccion', 'lugar', 'mapa'],
          reaction: { enabled: true, emoji: '📍' },
          reply: { type: 'text', text: '{{texto:ubicacion}}' },
        }),
        makeCommand({
          name: 'Inscripción',
          description: 'Instrucciones para inscribirse.',
          trigger: 'inscribirme',
          aliases: ['inscripcion', 'registro'],
          matchType: 'startsWith',
          reaction: { enabled: true, emoji: '🎟️' },
          reply: {
            type: 'text',
            text:
              '✅ ¡Gracias por inscribirte, {{nombre}}!\n\n{{texto:inscripcion}}\n\n' +
              'Si ya enviaste tus datos, en breve recibirás la confirmación.',
          },
        }),
      ],
    }),
  },
  {
    id: 'custom',
    name: 'Desde cero',
    emoji: '🤖',
    description: 'Un bot vacío para armar tus propios comandos y reacciones.',
    tag: 'Libre',
    accent: 'slate',
    build: () => ({
      name: 'Mi bot',
      emoji: '🤖',
      description: 'Bot personalizado.',
      settings: { ...defaultSettings() },
      commands: [
        makeCommand({
          name: 'Menú',
          description: 'Ayuda inicial.',
          trigger: 'menu',
          aliases: ['ayuda'],
          reply: { type: 'text', text: 'Hola {{nombre}} 👋\n\n{{lista_comandos}}' },
        }),
      ],
      texts: defaultTexts(),
    }),
  },
];

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id) || null;
