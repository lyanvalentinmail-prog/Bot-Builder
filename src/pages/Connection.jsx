import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { API_BASE, IS_EXTERNAL_API } from '../lib/config.js';
import { useApi } from '../lib/useApi.js';
import { Button, Card, CardHeader, Icon, StatusDot } from '../components/ui.jsx';

const MODE_LABEL = {
  server: 'Servidor persistente',
  ephemeral: 'Servidor sin disco persistente',
  serverless: 'Serverless (Vercel)',
};

export default function Connection() {
  const { data: meta } = useApi('/meta');
  const [health, setHealth] = useState({ status: 'checking', ms: null, at: null });

  const check = async () => {
    setHealth((prev) => ({ ...prev, status: 'checking' }));
    const started = performance.now();
    try {
      await api.get('/health');
      setHealth({ status: 'ok', ms: Math.round(performance.now() - started), at: new Date() });
    } catch {
      setHealth({ status: 'down', ms: null, at: new Date() });
    }
  };

  useEffect(() => {
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, []);

  const deploy = meta?.deploy;

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div>
          <span className="eyebrow">Soporte</span>
          <h1>Conexión</h1>
          <p>Proveedor donde corre este panel y estado en vivo de la API.</p>
        </div>
        <div className="page-head-actions">
          <Button variant="ghost" icon="refresh" onClick={check}>
            Probar conexión
          </Button>
        </div>
      </header>

      <Card className="connection-hero">
        <div className="connection-state">
          <span className={`connection-orb ${health.status}`}>
            <Icon name="globe" size={26} />
          </span>
          <div>
            <h2>{MODE_LABEL[deploy?.mode] || 'Detectando servidor…'}</h2>
            <p>
              {health.status === 'ok'
                ? `API respondiendo en ${health.ms} ms · ${health.at.toLocaleTimeString('es-UY')}`
                : health.status === 'down'
                  ? 'La API no respondió. Revisá el servicio o el token de acceso.'
                  : 'Comprobando /api/health…'}
            </p>
          </div>
          <StatusDot
            status={health.status === 'ok' ? 'connected' : health.status === 'down' ? 'error' : 'connecting'}
            label={health.status === 'ok' ? 'Operativo' : health.status === 'down' ? 'Sin respuesta' : 'Comprobando'}
          />
        </div>
      </Card>

      <div className="two-col">
        <Card>
          <CardHeader icon="monitor" title="Servidor" subtitle="Datos informados por la API." />
          <dl className="data-list">
            <div>
              <dt>URL pública</dt>
              <dd className="mono">{deploy?.publicUrl || 'No configurada'}</dd>
            </div>
            <div>
              <dt>API que usa el navegador</dt>
              <dd className="mono">{IS_EXTERNAL_API ? API_BASE : 'Mismo origen (proxy /api)'}</dd>
            </div>
            <div>
              <dt>Datos</dt>
              <dd className="mono">{deploy?.dataDir || '—'}</dd>
            </div>
            <div>
              <dt>Acceso</dt>
              <dd>{deploy?.access === 'protected' ? 'Protegido con clave' : 'Abierto, sin clave'}</dd>
            </div>
            <div>
              <dt>Persistencia</dt>
              <dd>{deploy?.persistentData ? 'Disco persistente' : 'Efímera: se reinicia'}</dd>
            </div>
            <div>
              <dt>Sesiones de WhatsApp</dt>
              <dd>{deploy?.persistentChannels ? 'Soportadas' : 'Requieren servidor persistente'}</dd>
            </div>
          </dl>
          {deploy?.hint ? (
            <p className="hint-box">
              <Icon name="info" size={15} />
              <span>{deploy.hint}</span>
            </p>
          ) : null}
          {deploy?.warning ? (
            <p className="hint-box hint-warn">
              <Icon name="warning" size={15} />
              <span>{deploy.warning}</span>
            </p>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            icon="terminal"
            title="Variables de entorno"
            subtitle="Lo que lee el servidor al arrancar."
          />
          <div className="env-list">
            {[
              ['PORT', '3001', 'Puerto HTTP del servidor.'],
              ['DATA_DIR', 'data/', 'Carpeta de la base y las sesiones.'],
              ['AUTH_TOKEN', 'sin definir', 'Opcional: protege el panel con clave.'],
              ['EPHEMERAL_DATA', 'false', 'Avisa que el disco no es persistente.'],
              ['CORS_ORIGINS', '*', 'Orígenes permitidos para la API.'],
              ['PUBLIC_URL', 'auto', 'URL usada en enlaces y webhooks.'],
            ].map(([name, value, help]) => (
              <div key={name} className="env-row">
                <code>{name}</code>
                <span>{value}</span>
                <small>{help}</small>
              </div>
            ))}
          </div>
          <p className="help-text">
            La guía completa de despliegue está en <code>DEPLOY.md</code> del repositorio.
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader icon="lock" title="Buenas prácticas" subtitle="Para que el bot no se caiga ni pierda la sesión." />
        <ul className="tips">
          <li>Usá un servidor persistente con disco para mantener la sesión de WhatsApp (Render con disco o un VPS).</li>
          <li>No compartas el token de acceso: si está definido, la API exige <code>x-auth-token</code> o <code>?token=</code>.</li>
          <li>En planes gratuitos el servicio se duerme por inactividad y el bot deja de responder hasta el próximo pedido.</li>
          <li>Hacé copias de <code>data/</code> antes de cada redeploy si no usás disco persistente.</li>
        </ul>
      </Card>
    </div>
  );
}
