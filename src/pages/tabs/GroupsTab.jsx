import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { Button, Card, CardHeader, CopyButton, Icon, StatusDot } from '../../components/ui.jsx';

export default function GroupsTab({ bot }) {
  const [data, setData] = useState({ connected: false, groups: [], status: 'disconnected' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      try {
        const next = await api.get(`/bots/${bot.id}/groups${refresh ? '?refresh=1' : ''}`);
        setData(next);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [bot.id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const connected = data.connected;

  return (
    <div className="two-col">
      <div className="col-main">
        <Card>
          <CardHeader
            icon="users"
            title="Grupos del bot"
            subtitle="Grupos reales de la sesión de WhatsApp vinculada a este bot."
            badge={<span className="tab-badge">{data.groups.length}</span>}
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon="refresh"
                onClick={() => load(true)}
                loading={loading}
                disabled={!connected}
              >
                Actualizar
              </Button>
            }
          />

          {error ? (
            <div className="hint-box hint-warn">
              <Icon name="warning" size={16} />
              <span>{error}</span>
            </div>
          ) : null}

          {!connected ? (
            <div className="empty-inline">
              <Icon name="whatsapp" size={22} />
              <p>
                El bot todavía no está conectado a WhatsApp. Vinculá el número con QR o código y los
                grupos van a aparecer acá.
              </p>
              <Link className="btn btn-primary btn-sm" to={`/bots/${bot.id}/whatsapp`}>
                Vincular WhatsApp
              </Link>
            </div>
          ) : data.groups.length ? (
            <div className="group-grid">
              {data.groups.map((group) => (
                <div key={group.id} className="group-row">
                  <span className="group-avatar">
                    <Icon name="users" size={17} />
                  </span>
                  <div className="group-body">
                    <strong>{group.name}</strong>
                    <small>
                      {group.participants ? `${group.participants} integrantes · ` : ''}
                      {group.messages || 0} mensajes procesados
                    </small>
                    <code>{group.id}</code>
                  </div>
                  <div className="group-actions">
                    <StatusDot
                      status={group.lastActivityAt ? 'connected' : 'ready'}
                      label={
                        group.lastActivityAt
                          ? new Date(group.lastActivityAt).toLocaleString('es-UY')
                          : 'sin actividad'
                      }
                    />
                    <CopyButton text={group.id} label="Copiar ID" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-inline">
              <Icon name="users" size={22} />
              <p>
                La sesión está conectada pero todavía no reportó grupos. Sumá el número a un grupo y
                actualizá la lista.
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="col-side">
        <Card className="sticky-card">
          <CardHeader icon="info" title="Cómo funciona" />
          <ol className="steps">
            <li>
              <strong>Un número, un bot.</strong> Cada bot usa su propia sesión de WhatsApp.
            </li>
            <li>
              <strong>Solo grupos.</strong> Los mensajes privados se descartan sin responder.
            </li>
            <li>
              <strong>Lista real.</strong> Los grupos se leen de WhatsApp al pedir «Actualizar».
            </li>
          </ol>
          <div className="divider" />
          <div className="kv">
            <span>Estado</span>
            <StatusDot
              status={connected ? 'connected' : data.status === 'error' ? 'error' : 'disconnected'}
              label={connected ? 'Conectado' : 'Sin conectar'}
            />
          </div>
          <div className="kv">
            <span>Grupos detectados</span>
            <strong>{data.groups.length}</strong>
          </div>
          <div className="kv">
            <span>Mensajes procesados</span>
            <strong>{bot.stats?.messages || 0}</strong>
          </div>
        </Card>
      </div>
    </div>
  );
}
