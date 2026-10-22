/**
 * Información de despliegue que consume la interfaz.
 * Función pura para poder testearla sin variables de entorno.
 */
export function deployInfo({
  serverless = false,
  ephemeralData = false,
  authToken = '',
  corsOrigins = [],
  publicUrl = '',
  dataDir = '',
} = {}) {
  const ephemeral = Boolean(serverless || ephemeralData);

  let mode = 'server';
  if (serverless) mode = 'serverless';
  else if (ephemeralData) mode = 'ephemeral';

  const hints = {
    server:
      'Servidor persistente con disco: podés vincular WhatsApp por QR o código y activar el canal de Teams.',
    ephemeral:
      'Estás en un plan sin disco persistente (por ejemplo, Render Free): el editor, el simulador y WhatsApp funcionan mientras el servicio está despierto, pero los bots y la sesión de WhatsApp se borran al reiniciar o redeployar. Para producción agregá un disco persistente y DATA_DIR (ver DEPLOY.md).',
    serverless:
      'Entorno serverless (Vercel): el editor y el simulador funcionan, pero WhatsApp y Teams reales necesitan un servidor persistente con disco (Render, Railway, Fly.io o un VPS).',
  };

  return {
    mode,
    serverless: Boolean(serverless),
    ephemeral,
    persistentChannels: !serverless,
    persistentData: !ephemeral,
    authRequired: Boolean(authToken),
    corsOrigins,
    publicUrl,
    dataDir,
    hint: hints[mode],
    warning: ephemeral
      ? serverless
        ? 'Serverless: los datos viven en /tmp y se pierden al reciclar la función.'
        : 'Sin disco persistente: los datos y la sesión de WhatsApp se pierden al reiniciar el servicio.'
      : null,
  };
}
