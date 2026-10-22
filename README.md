# ⚡ BotForge

**Creador de bots personalizados para WhatsApp y Microsoft Teams, sin escribir código.**

BotForge es una aplicación web completa (frontend + backend + motores de mensajería) donde podés:

- 🤖 Crear bots desde plantillas: atención al cliente, tienda, comunidad, eventos o desde cero.
- 💬 Definir comandos con prefijo, frases exactas, palabras clave, expresiones regulares o «cualquier mensaje».
- 😀 Editar **reacciones**: emojis automáticos, reacciones por palabra clave, comando, grupo, privado o mención, con probabilidad, alcance y borrado automático.
- ✍️ Crear y reutilizar **plantillas de texto** (`{{texto:horario}}`) con variables dinámicas (`{{nombre}}`, `{{hora}}`, `{{lista_comandos}}`…).
- 🎛️ Configurar respuestas de texto, frases al azar, imágenes con texto, **botones**, retardo de escritura y edición del mensaje después de enviarlo.
- 📱 **Vincular WhatsApp real por código QR o por código de vinculación de 8 dígitos.**
- 👥 **Publicar el mismo bot en Microsoft Teams** con credenciales de Azure Bot.
- 🧪 Probar todo en un simulador de teléfono antes de conectar nada.
- 💾 Exportar/importar la configuración y duplicar bots.
- ☁️ **Blueprints de Render y Vercel** incluidos (`render.yaml` / `vercel.json`), además de Docker.

---

## Tabla de contenidos

1. [Cómo funciona](#cómo-funciona)
2. [Instalación rápida](#instalación-rápida)
3. [Guía de uso](#guía-de-uso)
4. [WhatsApp: QR y código de vinculación](#whatsapp-qr-y-código-de-vinculación)
5. [Microsoft Teams paso a paso](#microsoft-teams-paso-a-paso)
6. [Variables disponibles](#variables-disponibles)
7. [Configuración (.env)](#configuración-env)
8. [Despliegue (Render / Vercel / Docker)](#despliegue-render--vercel--docker)
9. [API HTTP](#api-http)
10. [Estructura del proyecto](#estructura-del-proyecto)
11. [Tests](#tests)
12. [Límites, seguridad y buenas prácticas](#límites-seguridad-y-buenas-prácticas)
13. [Solución de problemas](#solución-de-problemas)

---

## Cómo funciona

```
┌────────────────────────┐
│  Interfaz web (React)  │  editor de comandos, reacciones, textos, simulador
└──────────┬─────────────┘
           │ REST + Socket.IO
┌──────────▼─────────────┐
│  API Express + motores │
│  • Baileys (WhatsApp)  │──▶  WhatsApp Web multidispositivo (QR / pairing)
│  • Bot Framework v4    │◀──  Microsoft Teams (webhook HTTPS)
│  • Motor de reglas     │  comandos, reacciones, variables, respuestas
└──────────┬─────────────┘
           │
      data/db.json  +  data/sessions/<bot>/ (credenciales de WhatsApp)
```

- **WhatsApp:** el servidor abre una sesión de WhatsApp Web (Baileys) y la mantiene viva. La sesión queda guardada en disco, así que no hay que escanear el QR cada vez.
- **Teams:** BotForge expone un endpoint (`/api/teams/:botId/messages`) que Microsoft llama mediante el Bot Framework. No requiere túneles si el servidor tiene HTTPS público.
- **Motor de reglas:** cada mensaje entrante se evalúa contra los comandos y reacciones del bot. Las respuestas se envían con retardos configurables y se reemplazan variables por datos reales.

---

## Instalación rápida

Requisitos: **Node.js ≥ 20** (probado en Node 22).

```bash
git clone <este-repositorio>
cd Bot-Builder
npm install
npm run dev
```

Abrí **http://localhost:5173**.

- `npm run dev` levanta la interfaz (Vite, puerto 5173) y la API (puerto 3001) con recarga automática.
- Los datos se guardan en `data/db.json` (se crea solo, junto a un bot de ejemplo).

### Producción en un solo proceso

```bash
npm run build      # compila la interfaz en dist/
npm start          # sirve interfaz + API en http://localhost:3001
```

---

## Despliegue (Render / Vercel / Docker)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/lyanvalentinmail-prog/Bot-Builder)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lyanvalentinmail-prog/Bot-Builder)

| Opción | Incluye | WhatsApp / Teams reales | Persistencia |
| --- | --- | --- | --- |
| **Render Free** (`render.yaml`) | App completa, sin tarjeta | ⚠️ Mientras está despierto | Efímera |
| **Render + disco** (2 pasos) | App completa 24/7 | ✅ | ✅ 1 GB |
| **Vercel** (`vercel.json`) | Editor + simulador (API serverless) | ❌ (501 explicativo) | Efímera |
| **Vercel + Render** | UI en Vercel y proxy al backend | ✅ (QR por sondeo) | ✅ en Render |
| **Docker / VPS** | Todo, con volumen propio | ✅ | ✅ |

**Render:** New → Blueprint → conectá el repo (rama `main`) → Apply. El blueprint usa `plan: free`, así que Render lo acepta **sin pedir tarjeta** y levanta todo en un servicio. Entrá directo a `https://tu-servicio.onrender.com`: **no pide clave** (el blueprint no define `AUTH_TOKEN`). Si querés protegerlo, agregá `AUTH_TOKEN` en Environment — es opcional.

- El plan Free no permite discos: el panel avisa y los datos se pierden al reiniciar (el archivo trae `EPHEMERAL_DATA=true`).
- Para un bot 24/7 hay que pasar a `plan: 0.5c-512mb` y descomentar el bloque `disk:` — está preparado en `render.yaml` y explicado en [DEPLOY.md](./DEPLOY.md#a2--plan-con-disco-bot-247-us-7mes).
- ¿Preferís crearlo a mano? Los pasos están en [A3 · Sin blueprint](./DEPLOY.md#a3--sin-blueprint-todo-a-mano).

**Vercel (demo/editor):** importá el repo y desplegá. La función `api/[...route].js` atiende la API (datos en `/tmp`, sin persistencia) y la interfaz avisa que WhatsApp/Teams reales necesitan un servidor persistente.

**Vercel + Render (backend real, token oculto):** desplegá primero Render y en Vercel definí `BACKEND_URL` y `BACKEND_TOKEN` (variables de servidor). Vercel proxea `/api` a Render y agrega el token del lado servidor, sin exponerlo al navegador.

📘 **Guía completa con pasos, variables y solución de problemas: [DEPLOY.md](./DEPLOY.md).**

---

## Guía de uso

### 1. Crear un bot

En **Mis bots → Nuevo bot** elegí una plantilla:

| Plantilla | Incluye |
| --- | --- |
| Asistente general | Menú, ping, saludos, info y plantillas base |
| Atención al cliente | Horarios, precios, envíos, derivación a humano y respaldo |
| Tienda y catálogo | Catálogo, promos, cómo comprar, toma de pedidos y botones |
| Comunidad y grupos | Reglas, bienvenida, links y advertencias (acepta grupos) |
| Eventos | Programa, ubicación e inscripción con botones |
| Desde cero | Un menú mínimo para armar todo a medida |

### 2. Comandos

Cada comando tiene:

- **Disparador** y **alias** (`menu`, `help`, `ayuda`).
- **Tipo de coincidencia:** comando con prefijo, frase exacta, empieza con, contiene, regex o cualquier mensaje.
  - El **prefijo** solo se exige en los comandos de tipo «comando». Las frases naturales («exacto», «empieza con», «contiene») funcionan con o sin prefijo.
- **Alcance:** todos los chats, solo privados o solo grupos.
- **Enfriamiento:** evita respuestas repetidas en segundos.
- **Reacción:** emoji opcional que se aplica al mensaje recibido (se puede quitar después de N segundos).
- **Respuesta:** texto, frase al azar, imagen con texto, botones o solo reacción.
- **Retardo** de escritura y **edición** posterior del mensaje.

El botón **Probar** ejecuta el motor real contra el comando que estás editando y muestra el resultado (coincidencia, reacciones, respuestas).

### 3. Reacciones

- **Reacción automática:** elegís varios emojis, la probabilidad (0–100 %), el alcance (todos / privados / grupos), si también reacciona a comandos y si se quita luego de N segundos.
- **Reacciones personalizadas:** reglas con nombre, emoji y condición:
  - contiene palabras clave (`gracias, genial`)
  - cuando se usa un comando (`menu, ping`)
  - todos los mensajes
  - expresión regular
  - solo privados / solo grupos
  - cuando mencionan al bot

WhatsApp reemplaza la reacción anterior: el bot envía **una** reacción por mensaje (se prioriza la del comando).

### 4. Textos

Guardá fragmentos reutilizables (horarios, dirección, medios de pago…) y usalos en cualquier respuesta con `{{texto:slug}}`. Se pueden anidar con variables y otras plantillas.

### 5. Ajustes

Prefijo, exigir prefijo, distinguir mayúsculas, ignorar grupos, acuses de lectura, aviso de comando desconocido, respuesta de respaldo, bienvenida al primer contacto y firma. También podés exportar/importar y eliminar el bot.

---

## WhatsApp: QR y código de vinculación

1. Abrí el bot → pestaña **WhatsApp**.
2. Elegí el método:
   - **Código QR:** tocá *Generar QR* y escanealo desde **WhatsApp → ⋮ → Dispositivos vinculados → Vincular un dispositivo**.
   - **Código de vinculación:** escribí tu número con código de país (solo dígitos, ej. `59899123456`), tocá *Obtener código* e ingresá los 8 dígitos en **WhatsApp → Dispositivos vinculados → Vincular con número de teléfono**.
3. Cuando la sesión abre, la tarjeta muestra el número vinculado y podés:
   - enviar un mensaje de prueba a cualquier número,
   - detener la conexión (mantiene la sesión),
   - cerrar sesión (borra las credenciales guardadas).

**Detalles importantes**

- La sesión se guarda en `data/sessions/<id-del-bot>/`. Mientras el servidor esté encendido, el bot responde.
- Podés seguir usando WhatsApp normalmente en el teléfono: es un dispositivo vinculado más.
- Si el teléfono cierra la sesión o cambia de dispositivo, el estado pasa a «Sesión cerrada» y hay que vincular de nuevo.
- Si el servidor pierde la conexión, se reconecta automáticamente con espera progresiva; si falla varias veces, muestra el error y permite reintentar.
- **Baileys es una integración no oficial de WhatsApp Web.** Usalo para atención y automatización moderada. Evitá envíos masivos/spam: pueden suspender el número.

---

## Microsoft Teams paso a paso

Teams no usa QR: se conecta mediante **Azure Bot Service**.

1. En [Azure Portal](https://portal.azure.com) creá un recurso **Azure Bot** (tipo *Single Tenant* o *Multi Tenant*).
2. En **Configuración**, poné como *Messaging endpoint* la URL que muestra BotForge:
   `https://TU-DOMINIO/api/teams/<botId>/messages`
   (también existe el endpoint global `https://TU-DOMINIO/api/messages`).
3. En el **App Registration** asociado copiá el **Microsoft App ID** y creá un **Client Secret** (App Password).
4. En BotForge → pestaña **Teams**, pegá *App ID*, *App Password* y (opcional) *Tenant ID*, y tocá **Activar canal**.
   - BotForge valida las credenciales pidiendo un token a Azure. Si falla, muestra el motivo.
5. En Azure → **Canales**, agregá **Microsoft Teams** y publicá la app (podés usar el manifest que BotForge genera y copia desde la pestaña Teams).

**Comandos en Teams:** se aceptan las tres formas: `/menu`, `menu` y `!menu`. El bot responde con las mismas respuestas configuradas; los botones se envían como tarjetas con acciones.

**Sobre reacciones:** la API de Bot Framework no permite agregar reacciones a mensajes. Por eso las reacciones (automáticas, personalizadas y por comando) se aplican **solo en WhatsApp**; en Teams el simulador lo aclara.

**¿Servidor local?** Teams necesita HTTPS público. Podés exponer el puerto 3001 con `cloudflared tunnel --url http://localhost:3001` o `ngrok http 3001` y usar esa URL como messaging endpoint.

---

## Variables disponibles

Se escriben entre llaves dobles y se reemplazan al momento de responder:

| Variable | Contenido |
| --- | --- |
| `{{nombre}}` | Nombre de quien escribe (o su número) |
| `{{numero}}` | Número / ID del chat |
| `{{bot}}` | Nombre del bot |
| `{{prefix}}` | Prefijo configurado (`!` por defecto) |
| `{{comando}}` | Comando recibido, sin prefijo |
| `{{texto}}` | Texto completo del mensaje |
| `{{hora}}` / `{{fecha}}` / `{{fecha_larga}}` | Hora y fecha actuales |
| `{{grupo}}` | Nombre del grupo (si aplica) |
| `{{canal}}` | WhatsApp o Microsoft Teams |
| `{{lista_comandos}}` | Menú generado con los comandos visibles |
| `{{texto:slug}}` | Contenido de una plantilla de texto |

Formato de WhatsApp: `*negrita*`, `_itálica_`, `~tachado~`, ` ```mono``` `.

---

## Configuración (.env)

Copiá `.env.example` a `.env` (o definí las variables en el entorno):

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3001` | Puerto de la API / servidor de producción |
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `DATA_DIR` | `./data` | Carpeta de datos y sesiones |
| `AUTH_TOKEN` | *(vacío)* | **Opcional**: si está vacío no se pide clave. Si se define, protege panel y API (`?token=…` o cabecera `x-auth-token`) |
| `PUBLIC_URL` | *(vacío)* | URL pública usada en enlaces/documentación |
| `CORS_ORIGINS` | `*` | Orígenes permitidos para CORS (`*` o lista separada por comas) |
| `LOG_LEVEL` | `silent` | Nivel de logs de Baileys (`info`, `debug`, `silent`) |
| `BACKEND_URL` | *(vacío)* | Solo en Vercel: backend persistente al que proxear `/api` |
| `BACKEND_TOKEN` | *(vacío)* | Solo en Vercel: token del backend inyectado del lado servidor |

Variables del **build** del frontend (solo si la interfaz se sirve separada del backend, ej. Vercel → Render sin proxy): `VITE_API_URL`, `VITE_SOCKET_URL` y `VITE_AUTH_TOKEN` (esta última queda visible en el bundle: usala solo para demos).

> ⚠️ Por defecto BotForge **no pide clave**. Si el panel queda expuesto en internet, es recomendable definir `AUTH_TOKEN` y usar HTTPS.

---

## Producción y Docker (servidor propio)

> Guía detallada de Render y Vercel en **[DEPLOY.md](./DEPLOY.md)**.

### Servidor propio

```bash
npm ci
npm run build
AUTH_TOKEN=un-token-largo NODE_ENV=production npm start
```

Serví el puerto 3001 detrás de un reverse proxy con HTTPS (Caddy, Nginx, Traefik). Los webhooks de Teams requieren HTTPS y un endpoint público.

### Docker

```bash
docker compose up -d --build
```

La app queda en `http://localhost:3001` y los datos persisten en `./data`.

```bash
# o sin compose
docker build -t botforge .
docker run -d -p 3001:3001 -v $(pwd)/data:/app/data --env-file .env --name botforge botforge
```

---

## API HTTP

Todas las rutas cuelgan de `/api`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado del servidor |
| GET | `/meta` | Variables, plantillas, tipos y límites |
| GET | `/bots` | Lista de bots con estado de canales |
| POST | `/bots` | Crea un bot (`{ template, name?, emoji? }`) |
| GET | `/bots/:id` | Bot completo |
| PUT | `/bots/:id` | Actualiza nombre, emoji, descripción, settings, autoReact |
| DELETE | `/bots/:id` | Elimina el bot y su sesión |
| POST | `/bots/:id/duplicate` | Duplica el bot |
| GET | `/bots/:id/export` | Descarga la configuración (JSON) |
| POST | `/bots/import` | Importa una configuración exportada |
| POST/PUT/DELETE | `/bots/:id/commands[/:commandId]` | CRUD de comandos |
| POST | `/bots/:id/commands/:commandId/duplicate` | Duplica un comando |
| POST | `/bots/:id/commands/reorder` | Reordena (`{ order: [ids] }`) |
| POST/PUT/DELETE | `/bots/:id/texts[/:textId]` | CRUD de plantillas de texto |
| POST/PUT/DELETE | `/bots/:id/reactions[/:reactionId]` | CRUD de reacciones |
| POST | `/bots/:id/simulate` | Simula un mensaje (`{ text, channel, name, isGroup }`) |
| GET | `/bots/:id/whatsapp` | Estado de la conexión |
| POST | `/bots/:id/whatsapp/start` | Inicia vinculación (`{ method: 'qr'\|'pairing', phone }`) |
| POST | `/bots/:id/whatsapp/stop` | Detiene o cierra sesión (`{ logout }`) |
| POST | `/bots/:id/whatsapp/test` | Envía un mensaje (`{ jid, text }`) |
| GET | `/bots/:id/teams` | Estado del canal Teams |
| PUT | `/bots/:id/teams/credentials` | Guarda App ID / Password / Tenant |
| POST | `/bots/:id/teams/start` \| `/stop` | Activa o desactiva el canal |
| POST | `/bots/:id/teams/simulate` | Simula un mensaje de Teams |
| POST | `/api/teams/:id/messages` | Webhook del Bot Framework |
| POST | `/api/messages` | Webhook global (detecta el bot por App ID) |

**Socket.IO:** el cliente entra a la sala con `bot:join` y recibe `whatsapp:status`, `whatsapp:qr`, `whatsapp:pairing`, `whatsapp:connected`, `whatsapp:log`, `whatsapp:message`, `teams:log`, `teams:message` y `stats:update`.

---

## Estructura del proyecto

```
server/
  app.js         App Express reutilizable (API, webhooks, estáticos, seguridad)
  index.js       Runtime persistente: HTTP + Socket.IO + apagado ordenado
  api.js         Rutas REST y validaciones
  engine.js      Motor de reglas (coincidencias, reacciones, respuestas)
  template.js    Variables, plantillas y fechas
  defaults.js    Comandos, reacciones y textos por defecto
  templates.js   Plantillas de bots listas para usar
  storage.js     Persistencia en data/db.json
  whatsapp.js    Motor Baileys: QR, pairing, mensajes, reacciones
  teams.js       Bot Framework: credenciales, webhook, simulación
src/
  App.jsx        Layout y rutas
  pages/         Dashboard, espacio de trabajo y pestañas del editor
  components/    UI (botones, modales, toasts) y previsualización de teléfono
  lib/           Cliente API, socket, variables y formato WhatsApp
api/
  [...route].js  Función serverless de Vercel (API demo o proxy a BACKEND_URL)
render.yaml      Blueprint de Render (disco persistente + variables)
vercel.json      Blueprint de Vercel (Vite + función + rewrites)
DEPLOY.md        Guía de despliegue paso a paso
test/
  engine.test.js, storage.test.js, api.test.js
```

---

## Tests

```bash
npm test
```

Cubren coincidencias de comandos (prefijo, alias, regex, alcances), variables y plantillas anidadas, construcción de respuestas (texto, botones, frases al azar, edición, firma), reacciones automáticas y personalizadas, respaldo/comando desconocido, persistencia del almacenamiento y la capa HTTP (health, CORS, creación/simulación de bots, bloqueo de canales en serverless y 404 en JSON).

---

## Límites, seguridad y buenas prácticas

- **Serverless (Vercel):** el editor y el simulador funcionan, pero WhatsApp/Teams reales requieren un servidor persistente con disco (Render o VPS). En Vercel los datos se guardan en `/tmp` y se reinician.
- **No hay autenticación por defecto** (el blueprint de Render tampoco la activa). Pensado para uso local o detrás de una red privada. En internet, definí `AUTH_TOKEN` y HTTPS.
- **WhatsApp no oficial:** Baileys usa el protocolo de WhatsApp Web. No está afiliado a Meta. Un uso abusivo (spam, envíos masivos, suplantación) puede provocar la suspensión del número.
- **Un dispositivo por sesión:** cada bot mantiene su propia sesión. No vincules el mismo número en dos bots al mismo tiempo.
- **Reacciones en Teams:** no soportadas por la API.
- **Límites del editor:** 60 comandos, 40 reacciones, 40 plantillas, 10 alias y 10 botones por comando.
- **Mensajes de voz, archivos y catálogos:** el bot responde a texto (incluye pies de foto y respuestas de botones). No procesa audios ni adjuntos.
- **Respaldo:** `data/` contiene las credenciales de WhatsApp y la base. Guardalo en un volumen seguro y no lo subas a Git (ya está en `.gitignore`).

---

## Solución de problemas

| Síntoma | Causa / solución |
| --- | --- |
| El QR no aparece y el estado queda en «Error de conexión» | El servidor no llega a `web.whatsapp.com`. Revisá firewall/proxy/salida a internet (puertos 443 y WebSocket). |
| «Conexión cerrada (401)» | La sesión se cerró desde el teléfono. Tocá *Limpiar sesión* y vinculá de nuevo. |
| «Conexión cerrada (515)» | WhatsApp pidió reiniciar; BotForge reconecta automáticamente. |
| Escaneé el QR y no pasa nada | Esperá unos segundos; el QR se renueva. Si expiró, generá uno nuevo. |
| No responde en grupos | «Ignorar grupos» está activo en Ajustes, o el comando tiene alcance «solo privados». |
| No responde a comandos sin prefijo | Activá «Exigir prefijo» en Ajustes si querés ambos modos, o quitá el prefijo a los comandos (`prefixRequired`). |
| Teams dice «No se pudieron validar las credenciales» | Revisá App ID/Password, que el App Registration exista y que el servidor tenga salida a `login.microsoftonline.com`. |
| Teams no recibe mensajes | El messaging endpoint debe ser HTTPS público y terminar en `/api/teams/<botId>/messages`. |
| La previsualización del teléfono no responde | Usá **Probar** o el simulador; el teléfono del editor no envía mensajes reales. |

---

## Ideas para seguir

- Roles y permisos por usuario.
- Respuestas con listas interactivas y catálogos.
- Programación de mensajes y recordatorios.
- Webhooks salientes hacia otras apps (CRM, Sheets, n8n).
- Panel de métricas históricas por comando.

Hecho con ❤️ usando **React + Vite**, **Express**, **Socket.IO**, **Baileys** y **Bot Framework SDK v4**.
