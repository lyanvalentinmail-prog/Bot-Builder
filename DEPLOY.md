# 🚀 Desplegar BotForge

BotForge incluye **blueprints listos** para Render y Vercel. Elegí según lo que necesites:

| Opción | Qué obtenés | WhatsApp / Teams reales | Persistencia | Costo |
| --- | --- | --- | --- | --- |
| **A. Render (blueprint)** | App completa en un solo servicio | ✅ Sí | Disco de 1 GB | Plan pago (disk) |
| **B. Vercel (serverless)** | Editor + simulador | ❌ No | Efímera (`/tmp`) | Gratis |
| **C. Vercel + Render (proxy)** | UI en Vercel, backend persistente | ✅ Sí (QR por sondeo) | Disco de Render | Ambos |
| **D. Docker / VPS** | Todo, control total | ✅ Sí | Volumen propio | Tu servidor |

> **Por qué WhatsApp no funciona en Vercel:** la vinculación necesita una conexión WebSocket abierta permanentemente y un disco donde guardar la sesión. Las funciones serverless se apagan y su disco es temporal. Por eso el blueprint de Render (servicio persistente + disco) es el recomendado. Vercel sirve perfecto para la interfaz y para el editor.

---

## Opción A · Render (recomendada)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/lyanvalentinmail-prog/Bot-Builder)

1. Subí el repositorio a GitHub (rama principal con estos archivos).
2. En [Render](https://dashboard.render.com) → **New → Blueprint**.
3. Conectá el repositorio. Render detecta `render.yaml` y muestra el servicio `botforge`.
4. Tocá **Apply / Deploy**. El build corre `npm ci --include=dev && npm run build` y arranca con `npm start`.
5. Cuando termine:
   - Entrá al servicio → **Environment** y copiá el valor generado de `AUTH_TOKEN`.
   - Abrí `https://TU-SERVICIO.onrender.com/?token=ESE_TOKEN` (guarda una cookie y te deja pasar).
6. Listo: pestaña **WhatsApp** → QR o código de vinculación. La sesión queda en el disco persistente (`/var/data/sessions`).

### Qué crea el blueprint

```yaml
services:
  - type: web
    name: botforge
    plan: starter            # el disco persistente requiere plan pago
    buildCommand: npm ci --include=dev && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    disk:
      name: botforge-data
      mountPath: /var/data
      sizeGB: 1
    envVars:
      - key: DATA_DIR      # sesiones y base de datos en el disco
        value: /var/data
      - key: AUTH_TOKEN    # generado automáticamente
        generateValue: true
      - key: CORS_ORIGINS
        value: "*"
```

### Detalles importantes

- **Plan free:** no permite discos persistentes y el servicio se duerme por inactividad. Sirve para probar el editor, pero WhatsApp se desconecta y los bots se pierden al reiniciar. Para un bot real usá `starter` (o superior) con el disco.
- **Un solo servicio hace todo:** interfaz, API, Socket.IO, WhatsApp y Teams. No hace falta configurar variables del frontend.
- **Dominio propio:** Render → Settings → Custom Domains. Usá ese dominio como URL pública al configurar Teams.
- **AUTH_TOKEN:** si querés desactivar la protección, borrá esa variable del dashboard (no recomendado en internet).
- **Webhooks de Teams:** usá la URL de Render directamente, `https://TU-SERVICIO.onrender.com/api/teams/<botId>/messages`.

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
| `AUTH_TOKEN` | *(vacío)* | Protege panel y API. Se envía por `?token=`, cookie, `x-auth-token` o `Bearer` |
| `CORS_ORIGINS` | `*` | Orígenes permitidos, separados por comas |
| `PUBLIC_URL` | *(vacío)* | URL pública mostrada en la documentación |
| `LOG_LEVEL` | `silent` | Logs de Baileys: `silent`, `info`, `debug` |
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

- [ ] `AUTH_TOKEN` definido y guardado en un gestor de contraseñas.
- [ ] HTTPS activo (Render y Vercel lo dan por defecto).
- [ ] `DATA_DIR` apuntando a un disco persistente (Render) o volumen (Docker/VPS).
- [ ] `CORS_ORIGINS` restringido si usás la API desde otro dominio.
- [ ] Endpoint de Teams apuntando al backend persistente.
- [ ] Número de WhatsApp dedicado, sin envíos masivos.
- [ ] Copia de seguridad de `db.json` y `sessions/` (contienen las credenciales).

---

## Solución de problemas de despliegue

| Síntoma | Causa / solución |
| --- | --- |
| El build de Render falla con «vite: not found» | `NODE_ENV=production` hace que npm omita devDependencies. El blueprint ya usa `npm ci --include=dev`. |
| Render dice que el disco no está disponible | Los discos requieren plan pago. Cambiá `plan: starter` o quitá `disk` (sin persistencia). |
| WhatsApp se desconecta cada rato en Render | El plan free duerme el servicio. Usá un plan always-on con disco. |
| `/api/health` funciona pero el panel devuelve 401 | Falta el token: abrí `https://tu-url/?token=TU_TOKEN` o definí `VITE_AUTH_TOKEN` (no recomendado). |
| En Vercel el inicio de WhatsApp devuelve 501 | Es esperado: usá Render o configurá `BACKEND_URL` + `BACKEND_TOKEN`. |
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
