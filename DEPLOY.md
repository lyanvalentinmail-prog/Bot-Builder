# 🚀 Desplegar BotForge

BotForge incluye **blueprints listos** para Render y Vercel. Elegí según lo que necesites:

| Opción | Qué obtenés | WhatsApp / Teams reales | Persistencia | Costo |
| --- | --- | --- | --- | --- |
| **A1. Render Free (blueprint por defecto)** | App completa en un servicio | ⚠️ Mientras está despierto | Efímera | Gratis, sin tarjeta |
| **A2. Render con disco** | App completa 24/7 | ✅ Sí, estable | Disco de 1 GB | ~US$ 7/mes |
| **B. Vercel (serverless)** | Editor + simulador | ❌ No | Efímera (`/tmp`) | Gratis |
| **C. Vercel + Render (proxy)** | UI en Vercel, backend persistente | ✅ Sí (QR por sondeo) | Disco de Render | Ambos |
| **D. Docker / VPS** | Todo, control total | ✅ Sí | Volumen propio | Tu servidor |

> **El blueprint incluido usa `plan: free`** para que Render lo acepte sin pedir tarjeta. Si Render rechazaba el deploy con *«disks are not supported for free tier services»*, esa era la causa: un `disk:` junto a `plan: free` invalida **todo** el blueprint. El bloque con disco quedó comentado dentro de `render.yaml` y se activa en dos pasos (ver A2).

> **Por qué WhatsApp no funciona en Vercel:** la vinculación necesita una conexión WebSocket abierta permanentemente y un disco donde guardar la sesión. Las funciones serverless se apagan y su disco es temporal.

---

## Opción A · Render (blueprint)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/lyanvalentinmail-prog/Bot-Builder)

> `render.yaml` debe estar en la **rama por defecto** del repositorio: si todavía no mergeaste los cambios a `main`, Render leerá la versión vieja del archivo.

### A1 · Plan Free (funciona sin tarjeta)

1. En [Render](https://dashboard.render.com) → **New +** → **Blueprint**.
2. Conectá el repositorio y elegí la rama **main**. Render muestra el servicio `botforge` con `plan: free` y costo **US$ 0**.
3. **Apply**. El build ejecuta `npm ci --include=dev && npm run build` y arranca con `npm start`.
4. Abrí `https://TU-SERVICIO.onrender.com` directamente. **No pide clave**: el blueprint no define `AUTH_TOKEN`, así que el panel arranca abierto.
5. Listo: podés crear bots, probar el simulador y vincular WhatsApp mientras el servicio esté despierto.

> ¿Querés que pida una clave? Es opcional: en **Environment** agregá `AUTH_TOKEN` con tu clave y guardá. Después entrá una vez con `https://TU-SERVICIO.onrender.com/?token=TU_CLAVE` (queda una cookie) o mandá `x-auth-token` en la API.

**Qué incluye el blueprint**

```yaml
services:
  - type: web
    name: botforge
    runtime: node            # campo actual (env: está deprecado)
    plan: free               # sin tarjeta; Render acepta el blueprint tal cual
    region: oregon
    branch: main
    buildCommand: npm ci --include=dev && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - { key: NODE_ENV, value: production }
      - { key: NODE_VERSION, value: "22" }
      # sin AUTH_TOKEN: el panel queda abierto, sin clave
      - { key: CORS_ORIGINS, value: "*" }
      - { key: LOG_LEVEL, value: silent }
      - { key: EPHEMERAL_DATA, value: "true" }   # avisa en la UI que no hay disco
```

**Límites reales del plan Free** (la interfaz los muestra en un aviso):

| Límite | Consecuencia |
| --- | --- |
| Sin disco persistente | Los bots y la sesión de WhatsApp se pierden al reiniciar, redeployar o despertar |
| Se duerme a los ~15 min sin tráfico | WhatsApp se desconecta y tarda ~1 min en volver |
| 512 MB de RAM, 750 h/mes | Alcanza para un bot chico, no para mucho tráfico |

> El blueprint marca `EPHEMERAL_DATA=true`, así que BotForge lo detecta y muestra el aviso en el panel y en la pestaña WhatsApp en vez de fallar en silencio.

### A2 · Plan con disco (bot 24/7, ~US$ 7/mes)

Con disco persistente la sesión de WhatsApp sobrevive reinicios y redeploys. En `render.yaml`:

1. Cambiá `plan: free` por `plan: 0.5c-512mb` (el equivalente actual del antiguo `starter`).
2. Agregá la variable `DATA_DIR` con `/var/data` y quitá `EPHEMERAL_DATA` (o ponela en `"false"`).
3. Descomentá el bloque que ya está preparado en el archivo:

```yaml
    disk:
      name: botforge-data
      mountPath: /var/data
      sizeGB: 1
```

4. Commit + push. Render sincroniza el blueprint y pide confirmación del cambio de plan.

Si ya creaste el servicio en free y no querés tocar el YAML: **Settings → Instance Type → Starter**, **Disks → Add Disk** (`/var/data`, 1 GB) y en **Environment** `DATA_DIR=/var/data` + `EPHEMERAL_DATA=false`.

### A3 · Sin blueprint (todo a mano)

**New + → Web Service** y completá:

| Campo | Valor |
| --- | --- |
| Name | `botforge` |
| Language / Runtime | **Node** |
| Branch | `main` |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | `Free` (prueba) o `Starter` (disco) |

Variables: `NODE_ENV=production`, `NODE_VERSION=22`, `CORS_ORIGINS=*`, `LOG_LEVEL=silent` y, si no hay disco, `EPHEMERAL_DATA=true`. Con disco: `DATA_DIR=/var/data` y `EPHEMERAL_DATA=false`.

No hace falta `AUTH_TOKEN`: sin esa variable el panel y la API quedan **abiertos, sin clave**. Agregala solo si querés protegerlos.

### Detalles comunes

- **Un solo servicio hace todo:** interfaz, API, Socket.IO, WhatsApp y Teams. No configures variables `VITE_*`.
- **Dominio propio:** Settings → Custom Domains; usá ese dominio para el endpoint de Teams.
- **Webhooks de Teams:** `https://TU-SERVICIO.onrender.com/api/teams/<botId>/messages`.
- **Mantener despierto el plan free (opcional):** un monitor externo (cron-job.org, UptimeRobot) que haga `GET /api/health` cada 10 minutos evita el spin-down, pero consume las 750 h/mes y no reemplaza al disco: un redeploy igual borra los datos.
- **Auto-deploy:** activo por defecto; cada push a `main` redeploya.

---

## Opción B · Vercel (serverless)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lyanvalentinmail-prog/Bot-Builder)

1. En [Vercel](https://vercel.com/new) importá el repositorio.
2. Framework: **Vite** (se detecta solo). `vercel.json` ya define build, salida y el catch-all de la API.
3. Deploy. No hace falta configurar nada más.

**Qué funciona:** interfaz completa, crear/editar bots, comandos, reacciones, textos, exportar/importar y simulador (WhatsApp y Teams). Los datos se guardan en `/tmp/botforge`, por lo que **se reinician** cuando la función se recicla.

**Qué no funciona:** iniciar WhatsApp (QR o pairing) y activar Teams real. La API responde `501` con un mensaje explicativo y la interfaz muestra un aviso.

```json
// vercel.json (resumen)
{
  "framework": "vite",
  "outputDirectory": "dist",
  "functions": { "api/[...route].js": { "maxDuration": 30, "memory": 1024 } }
}
```

La función `api/[...route].js` monta la API de Express para el editor. Si definís `BACKEND_URL`, pasa a modo proxy (Opción C).

---

## Opción C · Vercel + Render (lo mejor de ambos)

La interfaz vive en Vercel (CDN global) y el backend persistente en Render (WhatsApp/Teams). El navegador **nunca** ve el token del backend: Vercel lo agrega del lado del servidor.

1. Desplegá primero la **Opción A** y anotá:
   - URL del servicio: `https://botforge-xxxx.onrender.com`
   - Valor de `AUTH_TOKEN`
2. En Vercel → tu proyecto → **Settings → Environment Variables** (Production y Preview):

   | Variable | Valor | Expuesta al navegador |
   | --- | --- | --- |
   | `BACKEND_URL` | `https://botforge-xxxx.onrender.com` | No (solo servidor) |
   | `BACKEND_TOKEN` | el `AUTH_TOKEN` de Render | No (solo servidor) |

3. **Redeploy** (Deployments → ⋯ → Redeploy) o hacé un push.
4. Verificá que `https://tu-app.vercel.app/api/health` devuelva `{"ok":true}`: eso confirma que el proxy llega a Render.
5. En Render, `CORS_ORIGINS` puede quedarse en `*` (el proxy usa el mismo origen, así que no hay CORS entre navegador y Vercel).

**Notas**

- El proxy reenvía método, encabezados, cuerpo y query string. El token se inyecta como `x-auth-token` del lado del servidor.
- **Socket.IO no atraviesa el proxy** (las funciones serverless no mantienen WebSockets). La pestaña WhatsApp sondea el estado cada 4 segundos, así que el QR, el pairing y la conexión funcionan igual; los logs en vivo solo se ven si usás Render directamente.
- Para Teams, configurá como messaging endpoint la URL de **Render** (`/api/teams/<botId>/messages`), no la de Vercel.
- Alternativa sin proxy (no recomendada): apuntar la interfaz directo a Render con `VITE_API_URL`, `VITE_SOCKET_URL` y `VITE_AUTH_TOKEN`. Funciona, pero **el token queda dentro del bundle público** de Vercel.

---

## Opción D · Docker o VPS

```bash
docker compose up -d --build
```

- Interfaz + API en `http://localhost:3001`.
- Datos persistentes en `./data` (volumen).
- Poné un reverse proxy con HTTPS (Caddy, Nginx, Traefik) y usá ese dominio para Teams.

También podés usar `railway up`, `fly launch` o cualquier host que ejecute un proceso Node 22 con volumen persistente y permita WebSockets salientes.

---

## Variables de entorno

### Servidor

| Variable | Por defecto | Para qué |
| --- | --- | --- |
| `PORT` | `3001` | Puerto HTTP (Render/Vercel lo inyectan) |
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `DATA_DIR` | `./data` (`/tmp/botforge` en serverless) | Base de datos y sesiones de WhatsApp |
| `AUTH_TOKEN` | *(vacío)* | **Opcional.** Si está vacío no se pide ninguna clave. Si lo definís, protege panel y API (`?token=`, cookie, `x-auth-token` o `Bearer`) |
| `CORS_ORIGINS` | `*` | Orígenes permitidos, separados por comas |
| `PUBLIC_URL` | *(vacío)* | URL pública mostrada en la documentación |
| `LOG_LEVEL` | `silent` | Logs de Baileys: `silent`, `info`, `debug` |
| `EPHEMERAL_DATA` | *(auto)* | `true` avisa en la UI que no hay disco persistente (Render Free). El blueprint lo activa |
| `NODE_ENV` | `development` | Usá `production` para servir la interfaz compilada |
| `SERVERLESS` | *(auto)* | `1` fuerza modo sin canales persistentes. En Vercel se detecta solo |
| `BACKEND_URL` | *(vacío)* | **Solo en Vercel**: backend al que proxear |
| `BACKEND_TOKEN` | *(vacío)* | **Solo en Vercel**: token del backend (nunca se expone) |

### Frontend (build de Vite)

| Variable | Cuándo usarla |
| --- | --- |
| `VITE_API_URL` | Solo si la interfaz se sirve separada del backend (ej. Vercel → Render sin proxy) |
| `VITE_SOCKET_URL` | URL del Socket.IO si difiere de la API |
| `VITE_AUTH_TOKEN` | Token para APIs protegidas — **queda visible en el bundle**, usar con cuidado |

En Render todo-en-uno o en Vercel con proxy **no hace falta ninguna variable `VITE_*`**.

---

## Checklist de producción

- [ ] ¿Panel público? Definí `AUTH_TOKEN` (opcional; por defecto va sin clave) y guardalo en un gestor de contraseñas.
- [ ] HTTPS activo (Render y Vercel lo dan por defecto).
- [ ] `DATA_DIR` apuntando a un disco persistente (Render) o volumen (Docker/VPS), con `EPHEMERAL_DATA` en `false`.
- [ ] `CORS_ORIGINS` restringido si usás la API desde otro dominio.
- [ ] Endpoint de Teams apuntando al backend persistente.
- [ ] Número de WhatsApp dedicado, sin envíos masivos.
- [ ] Copia de seguridad de `db.json` y `sessions/` (contienen las credenciales).

---

## Solución de problemas de despliegue

| Síntoma | Causa / solución |
| --- | --- |
| El build de Render falla con «vite: not found» | `NODE_ENV=production` hace que npm omita devDependencies. El blueprint ya usa `npm ci --include=dev`. |
| «disks are not supported for free tier services» | `disk:` junto a `plan: free` invalida todo el blueprint. Quitá el bloque (ya está comentado) o subí a `plan: 0.5c-512mb`. |
| «This service requires a payment method» | El plan pedido es pago. Usá `plan: free` (este repo ya lo hace) o agregá una tarjeta para tener disco. |
| «Invalid plan: starter» | Usá los IDs actuales: `free`, `0.5c-512mb`, `1c-2g`… (los legacy siguen existiendo, pero los IDs nuevos son los oficiales). |
| El blueprint no toma los cambios | Render lee `render.yaml` de la rama por defecto. Mergeá a `main` o seleccioná la rama correcta al crear el blueprint. |
| El panel avisa «Plan sin disco persistente» | Es el plan Free: los datos se borran al reiniciar. Pasá a A2 para persistencia real. |
| WhatsApp se desconecta cada rato en Render | El plan free duerme el servicio. Usá un plan always-on con disco. |
| El panel devuelve 401 | Definiste `AUTH_TOKEN`. Abrí `https://tu-url/?token=TU_CLAVE` o mandá `x-auth-token`. Para que no pida clave, borrá esa variable y redeployá. |
| En Vercel el inicio de WhatsApp devuelve 501 | Es esperado: usá Render o configurá `BACKEND_URL` + `BACKEND_TOKEN`. |
| Quiero que no pida clave | No definas `AUTH_TOKEN` (el blueprint ya no lo genera). Si lo habías agregado, borralo en Environment y redeployá. |
| En Vercel todo se reinicia solo | El disco es efímero (`/tmp`). Pasá al modo proxy con Render. |
| El proxy de Vercel devuelve 502 | `BACKEND_URL` mal escrita, backend dormido o token inválido. Probá `https://tu-backend.onrender.com/api/health`. |
| Teams no recibe mensajes en el modo C | Configurá el endpoint de Teams con la URL de Render, no la de Vercel. |
| El QR no se actualiza en el modo C | El sondeo es cada 4 s; esperá unos segundos o abrí directamente el panel de Render para ver los logs en vivo. |

---

## Estructura de despliegue

```
render.yaml            Blueprint de Render (web + disco + variables)
vercel.json            Blueprint de Vercel (Vite + función + rewrites)
api/[...route].js      Función serverless: API demo o proxy hacia BACKEND_URL
server/app.js          App Express reutilizable (API, webhooks, estáticos)
server/index.js        Runtime persistente (HTTP + Socket.IO + shutdown)
Dockerfile             Imagen multi-etapa
docker-compose.yml     Servicio con volumen ./data
```
