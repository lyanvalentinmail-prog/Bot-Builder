/**
 * Catálogo de comandos y automatizaciones listas para instalar en un bot.
 *
 * Cada plugin es una definición de comando real: al instalarlo se llama a
 * `makeCommand(build())` y se guarda en el bot. No hay mocks: si el comando
 * aparece en el catálogo, se puede instalar y probar en el simulador o en el
 * grupo de WhatsApp vinculado.
 */

export const CATALOG_CATEGORIES = [
  { id: 'moderacion', name: 'Moderación', emoji: '🛡️' },
  { id: 'atencion', name: 'Atención', emoji: '🎧' },
  { id: 'ventas', name: 'Ventas', emoji: '🛍️' },
  { id: 'comunidad', name: 'Comunidad', emoji: '👥' },
  { id: 'utilidades', name: 'Utilidades', emoji: '🧰' },
  { id: 'dinamica', name: 'Dinámica', emoji: '🎲' },
];

const define = (plugin) => ({ ...plugin, build: () => ({ ...plugin.command }) });

export const CATALOG = [
  /* ------------------------------- moderación ------------------------------ */
  define({
    id: 'reglas',
    name: 'Reglas del grupo',
    emoji: '📜',
    category: 'moderacion',
    description: 'Publica las reglas del grupo cuando alguien las pide o cuando se suma gente nueva.',
    tags: ['reglamento', 'convivencia'],
    installs: 0,
    command: {
      name: 'Reglas',
      description: 'Muestra las reglas de convivencia del grupo.',
      trigger: 'reglas',
      aliases: ['normas', 'convivencia'],
      matchType: 'command',
      reaction: { enabled: true, emoji: '📜' },
      reply: {
        type: 'text',
        text:
          '📜 *Reglas del grupo*\n\n' +
          '1. Respeto siempre: sin insultos ni discriminación.\n' +
          '2. Nada de spam, cadenas ni publicidad sin permiso.\n' +
          '3. Consultas al grupo, no por privado a los administradores.\n' +
          '4. Un tema por conversación para que todos puedan seguirla.\n\n' +
          '¿Querés sumar algo? Escribile a un administrador.',
        delayMs: 500,
      },
    },
  }),
  define({
    id: 'antispam',
    name: 'Aviso antispam',
    emoji: '🚫',
    category: 'moderacion',
    description: 'Detecta cadenas y links repetidos y recuerda las normas del grupo.',
    tags: ['spam', 'enlaces'],
    command: {
      name: 'Antispam',
      description: 'Aviso cuando se comparten cadenas o enlaces masivos.',
      trigger: 'http',
      matchType: 'contains',
      showInMenu: false,
      reaction: { enabled: true, emoji: '🚫' },
      reply: {
        type: 'text',
        text:
          '🚫 *Aviso automático*\n\n' +
          'En este grupo no se comparten cadenas ni enlaces masivos. ' +
          'Si es información útil, contala en un mensaje y listo.',
        delayMs: 300,
      },
    },
  }),
  define({
    id: 'bienvenida-grupo',
    name: 'Bienvenida de grupo',
    emoji: '👋',
    category: 'moderacion',
    description: 'Saluda a cada persona la primera vez que escribe en el grupo.',
    tags: ['nuevos', 'onboarding'],
    command: {
      name: 'Bienvenida',
      description: 'Comando para presentar el grupo a quien recién llega.',
      trigger: 'bienvenida',
      aliases: ['presentate'],
      matchType: 'command',
      reaction: { enabled: true, emoji: '👋' },
      reply: {
        type: 'text',
        text:
          '👋 ¡Bienvenido/a, {{nombre}}!\n\n' +
          'Estás en *{{grupo}}*. Pasá, presentate y contanos qué buscás. ' +
          'Si es tu primera vez, escribí *{{prefix}}reglas* para ver cómo funcionamos.',
        delayMs: 600,
      },
    },
  }),

  /* -------------------------------- atención ------------------------------- */
  define({
    id: 'horarios',
    name: 'Horario de atención',
    emoji: '🕘',
    category: 'atencion',
    description: 'Responde el horario usando la plantilla de texto «horario».',
    tags: ['horarios'],
    command: {
      name: 'Horario',
      description: 'Comparte el horario de atención del equipo.',
      trigger: 'horario',
      aliases: ['horarios', 'atencion'],
      matchType: 'command',
      reaction: { enabled: true, emoji: '🕘' },
      reply: { type: 'text', text: '{{texto:horario}}', delayMs: 400 },
    },
  }),
  define({
    id: 'equipo',
    name: 'Quién está a cargo',
    emoji: '🧑‍💻',
    category: 'atencion',
    description: 'Lista a las personas del equipo y cómo escalar una consulta.',
    tags: ['escalado', 'staff'],
    command: {
      name: 'Equipo',
      description: 'Muestra quién atiende y cómo escalar un caso.',
      trigger: 'equipo',
      aliases: ['staff', 'quien-atiende'],
      matchType: 'command',
      reply: {
        type: 'text',
        text:
          '🧑‍💻 *Equipo de atención*\n\n' +
          '• Administración: lunes a viernes de 9 a 18 h\n' +
          '• Soporte técnico: respondemos en el grupo\n\n' +
          'Si tu caso es urgente, escribí *urgente* y mencioná a un administrador.',
        delayMs: 500,
      },
    },
  }),
  define({
    id: 'faq',
    name: 'Preguntas frecuentes',
    emoji: '❓',
    category: 'atencion',
    description: 'Un menú corto con las dudas que más se repiten en el grupo.',
    tags: ['faq', 'soporte'],
    command: {
      name: 'Preguntas frecuentes',
      description: 'Respuestas a las consultas más comunes.',
      trigger: 'faq',
      aliases: ['preguntas', 'dudas'],
      matchType: 'command',
      reaction: { enabled: true, emoji: '❓' },
      reply: {
        type: 'buttons',
        text:
          '❓ *Preguntas frecuentes*\n\n' +
          'Elegí el tema y te respondo al instante. También podés escribir ' +
          '*{{prefix}}horario* o *{{prefix}}equipo*.',
        footer: 'Asistente de {{bot}}',
        buttons: [
          { label: 'Horarios', command: '!horario' },
          { label: 'Pagos', command: '!pagos' },
          { label: 'Envíos', command: '!envios' },
        ],
        delayMs: 500,
      },
    },
  }),

  /* --------------------------------- ventas -------------------------------- */
  define({
    id: 'catalogo',
    name: 'Catálogo de productos',
    emoji: '🛍️',
    category: 'ventas',
    description: 'Comparte el catálogo vigente y cómo pedir por el grupo.',
    tags: ['productos', 'precios'],
    command: {
      name: 'Catálogo',
      description: 'Lista los productos o servicios disponibles.',
      trigger: 'catalogo',
      aliases: ['productos', 'menu-precios'],
      matchType: 'command',
      reaction: { enabled: true, emoji: '🛍️' },
      reply: {
        type: 'text',
        text:
          '🛍️ *Catálogo*\n\n' +
          '1. Plan básico — $ 500\n' +
          '2. Plan profesional — $ 900\n' +
          '3. Plan equipo — $ 1.500\n\n' +
          'Escribí *{{prefix}}pedir 2* para encargar el que quieras.',
        delayMs: 500,
      },
    },
  }),
  define({
    id: 'pedido',
    name: 'Tomar pedido',
    emoji: '🧾',
    category: 'ventas',
    description: 'Registra un pedido con el número de producto y confirma el siguiente paso.',
    tags: ['pedidos', 'ventas'],
    command: {
      name: 'Pedir',
      description: 'Inicia un pedido indicando el número de producto.',
      trigger: 'pedir',
      aliases: ['pedido', 'comprar'],
      matchType: 'startsWith',
      reaction: { enabled: true, emoji: '🧾' },
      reply: {
        type: 'text',
        text:
          '🧾 ¡Listo, {{nombre}}!\n\n' +
          'Tomé tu pedido: *{{texto}}*.\n' +
          'Un administrador lo confirma en el grupo y te pasa los datos de pago.',
        delayMs: 600,
      },
    },
  }),
  define({
    id: 'pagos',
    name: 'Medios de pago',
    emoji: '💳',
    category: 'ventas',
    description: 'Explica cómo pagar y qué comprobante enviar.',
    tags: ['pagos', 'transferencia'],
    command: {
      name: 'Pagos',
      description: 'Medios de pago aceptados.',
      trigger: 'pagos',
      aliases: ['pago', 'transferencia'],
      matchType: 'command',
      reply: {
        type: 'text',
        text:
          '💳 *Medios de pago*\n\n' +
          '• Transferencia bancaria\n' +
          '• Depósito\n' +
          '• Efectivo en el local\n\n' +
          'Después de pagar, mandá el comprobante al grupo con tu nombre.',
        delayMs: 400,
      },
    },
  }),
  define({
    id: 'envios',
    name: 'Envíos y entregas',
    emoji: '📦',
    category: 'ventas',
    description: 'Consulta de tiempos, costos y zonas de entrega.',
    tags: ['envios', 'logistica'],
    command: {
      name: 'Envíos',
      description: 'Tiempos y costos de envío.',
      trigger: 'envios',
      aliases: ['envio', 'entrega'],
      matchType: 'command',
      reply: {
        type: 'text',
        text:
          '📦 *Envíos*\n\n' +
          '• Montevideo: 24 a 48 h\n' +
          '• Interior: 2 a 4 días hábiles\n' +
          '• Retiro sin costo en el local\n\n' +
          'Pasá tu dirección al grupo y coordinamos.',
        delayMs: 400,
      },
    },
  }),
  define({
    id: 'promos',
    name: 'Promociones',
    emoji: '🎉',
    category: 'ventas',
    description: 'Publica las promociones vigentes y su fecha de vencimiento.',
    tags: ['descuentos', 'promos'],
    command: {
      name: 'Promos',
      description: 'Descuentos vigentes del mes.',
      trigger: 'promos',
      aliases: ['promociones', 'descuentos'],
      matchType: 'command',
      reaction: { enabled: true, emoji: '🎉' },
      reply: {
        type: 'text',
        text:
          '🎉 *Promociones vigentes*\n\n' +
          '• 2x1 en el plan básico\n' +
          '• 15 % de descuento pagando en efectivo\n' +
          '• Envío gratis en pedidos de más de $ 2.000\n\n' +
          'Válido hasta fin de mes o hasta agotar stock.',
        delayMs: 500,
      },
    },
  }),

  /* ------------------------------- comunidad ------------------------------- */
  define({
    id: 'menu',
    name: 'Menú de comandos',
    emoji: '📋',
    category: 'comunidad',
    description: 'La lista completa de comandos activos, generada desde el bot.',
    tags: ['menu', 'ayuda'],
    command: {
      name: 'Menú',
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
        delayMs: 400,
      },
    },
  }),
  define({
    id: 'sorteo',
    name: 'Sorteo del grupo',
    emoji: '🎁',
    category: 'comunidad',
    description: 'Explica cómo participar del sorteo y cuándo se anuncia el ganador.',
    tags: ['sorteo', 'participacion'],
    command: {
      name: 'Sorteo',
      description: 'Instrucciones para participar del sorteo vigente.',
      trigger: 'sorteo',
      aliases: ['sorteos'],
      matchType: 'command',
      reaction: { enabled: true, emoji: '🎁' },
      reply: {
        type: 'text',
        text:
          '🎁 *Sorteo del grupo*\n\n' +
          '1. Escribí *{{prefix}}participar* en este grupo.\n' +
          '2. El ganador se anuncia el viernes a las 18 h.\n' +
          '3. Una participación por persona.\n\n' +
          '¡Suerte, {{nombre}}!',
        delayMs: 500,
      },
    },
  }),
  define({
    id: 'participar',
    name: 'Participar',
    emoji: '🙋',
    category: 'comunidad',
    description: 'Suma al usuario al sorteo y confirma su participación.',
    tags: ['sorteo', 'registro'],
    command: {
      name: 'Participar',
      description: 'Anota la participación en el sorteo.',
      trigger: 'participar',
      aliases: ['anotarme'],
      matchType: 'command',
      reaction: { enabled: true, emoji: '🙋' },
      reply: {
        type: 'text',
        text: '🙋 ¡Anotado, {{nombre}}! Ya estás participando del sorteo. Te aviso por acá si ganas.',
        delayMs: 300,
      },
    },
  }),

  /* ------------------------------- utilidades ------------------------------ */
  define({
    id: 'ping',
    name: 'Estado del bot',
    emoji: '🟢',
    category: 'utilidades',
    description: 'Comprueba que el bot está en línea y muestra la hora del servidor.',
    tags: ['ping', 'estado'],
    command: {
      name: 'Ping',
      description: 'Comprueba que el bot está en línea.',
      trigger: 'ping',
      aliases: ['estado'],
      matchType: 'command',
      reaction: { enabled: true, emoji: '🟢' },
      reply: { type: 'text', text: '🟢 *Pong!* Estoy en línea.\n🕒 Hora del servidor: {{hora}}', delayMs: 200 },
    },
  }),
  define({
    id: 'fecha',
    name: 'Fecha y hora',
    emoji: '📅',
    category: 'utilidades',
    description: 'Devuelve la fecha actual con el formato del grupo.',
    tags: ['fecha', 'hora'],
    command: {
      name: 'Fecha',
      description: 'Muestra la fecha de hoy.',
      trigger: 'fecha',
      aliases: ['hoy', 'que-dia-es'],
      matchType: 'command',
      reply: { type: 'text', text: '📅 Hoy es *{{fecha_larga}}*.\n🕒 Hora del servidor: {{hora}}', delayMs: 200 },
    },
  }),
  define({
    id: 'datos-grupo',
    name: 'Datos del grupo',
    emoji: '👥',
    category: 'utilidades',
    description: 'Muestra el nombre del grupo y quién está escribiendo.',
    tags: ['grupo', 'contexto'],
    command: {
      name: 'Datos del grupo',
      description: 'Comparte el nombre del grupo y del participante.',
      trigger: 'grupo',
      aliases: ['datos-grupo'],
      matchType: 'command',
      reply: {
        type: 'text',
        text:
          '👥 *Datos del grupo*\n\n' +
          '• Grupo: {{grupo}}\n' +
          '• Canal: {{canal}}\n' +
          '• Te estoy leyendo, {{nombre}}',
        delayMs: 300,
      },
    },
  }),
  define({
    id: 'recordatorio',
    name: 'Recordatorio',
    emoji: '⏰',
    category: 'utilidades',
    description: 'Responde con un recordatorio de las tareas pendientes del grupo.',
    tags: ['recordatorio', 'organizacion'],
    command: {
      name: 'Recordatorio',
      description: 'Recuerda las tareas pendientes del grupo.',
      trigger: 'recordatorio',
      aliases: ['pendientes'],
      matchType: 'command',
      reaction: { enabled: true, emoji: '⏰' },
      reply: {
        type: 'text',
        text:
          '⏰ *Recordatorios del grupo*\n\n' +
          '• Revisar los pedidos del día\n' +
          '• Confirmar los pagos pendientes\n' +
          '• Cerrar el grupo a las 20 h\n\n' +
          'Editá este comando para dejar tus propias tareas.',
        delayMs: 400,
      },
    },
  }),

  /* -------------------------------- dinámica ------------------------------- */
  define({
    id: 'saludo',
    name: 'Saludo con variantes',
    emoji: '❤️',
    category: 'dinamica',
    description: 'Tres formas distintas de saludar, elegidas al azar.',
    tags: ['saludo', 'variantes'],
    command: {
      name: 'Saludo',
      description: 'Responde a un saludo con una frase al azar.',
      trigger: 'hola',
      aliases: ['buenas', 'hey'],
      matchType: 'startsWith',
      reaction: { enabled: true, emoji: '❤️' },
      reply: {
        type: 'random',
        variants: [
          '¡Hola {{nombre}}! 👋 ¿En qué te podemos ayudar?',
          '¡Buenas {{nombre}}! 😄 Escribí *{{prefix}}menu* para ver lo que sé hacer.',
          '¡Hey! Qué bueno verte por acá, {{nombre}} ✨',
        ],
        delayMs: 500,
      },
    },
  }),
  define({
    id: 'chiste',
    name: 'Chiste del día',
    emoji: '😂',
    category: 'dinamica',
    description: 'Un chiste corto para romper el hielo en el grupo.',
    tags: ['chistes', 'humor'],
    command: {
      name: 'Chiste',
      description: 'Cuenta un chiste al azar.',
      trigger: 'chiste',
      aliases: ['broma', 'humor'],
      matchType: 'command',
      reaction: { enabled: true, emoji: '😂' },
      reply: {
        type: 'random',
        variants: [
          '😂 ¿Sabés qué le dijo un bot a otro? «Nos vemos en la nube».',
          '😂 Mi grupo favorito es el que tiene buenos comandos.',
          '😂 Descargué una app para ordenar mi vida. Ahora tengo dos apps sin abrir.',
        ],
        delayMs: 400,
      },
    },
  }),
  define({
    id: 'encuesta',
    name: 'Encuesta rápida',
    emoji: '📊',
    category: 'dinamica',
    description: 'Publica una encuesta simple con opciones numeradas.',
    tags: ['encuesta', 'votacion'],
    command: {
      name: 'Encuesta',
      description: 'Lanza una encuesta rápida en el grupo.',
      trigger: 'encuesta',
      matchType: 'command',
      reaction: { enabled: true, emoji: '📊' },
      reply: {
        type: 'text',
        text:
          '📊 *Encuesta del grupo*\n\n' +
          '¿Qué tema querés para la próxima reunión?\n\n' +
          '1️⃣ Productos nuevos\n' +
          '2️⃣ Atención al cliente\n' +
          '3️⃣ Ideas para la comunidad\n\n' +
          'Respondé con el número y tu comentario.',
        delayMs: 400,
      },
    },
  }),
];

export const CATALOG_BY_ID = new Map(CATALOG.map((plugin) => [plugin.id, plugin]));

export const publicCatalog = () =>
  CATALOG.map(({ build, command, ...rest }) => ({
    ...rest,
    trigger: command.trigger,
    aliasList: command.aliases || [],
    replyType: command.reply?.type || 'text',
  }));
