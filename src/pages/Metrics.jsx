import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Icon, StatusDot } from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';

const fmt = new Intl.NumberFormat('es-UY');

function uptime(seconds = 0) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days} d ${hours} h`;
  if (hours) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

export default function Metrics() {
  const { data, loading, reload } = useApi('/metrics');
  const { data: meta } = useApi('/meta');

  useEffect(() => {
    const timer = setInterval(() => reload({ silent: true }), 20000);
    return () => clearInterval(timer);
  }, [reload]);

  const totals = data?.totals;
  const deploy = meta?.deploy;

  const cards = [
    { label: 'Bots', value: totals?.bots, icon: 'bot', tone: 'indigo', hint: `${totals?.connected || 0} en línea` },
    { label: 'Comandos', value: totals?.commands, icon: 'command', tone: 'violet', hint: `${totals?.texts || 0} textos` },
    { label: 'Mensajes', value: totals?.messages, icon: 'activity', tone: 'emerald', hint: `${totals?.replies || 0} respuestas` },
    { label: 'Reacciones', value: totals?.reactions, icon: 'smile', tone: 'amber', hint: `${totals?.reactionsSent || 0} enviadas` },
  ];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Métricas</span>
          <h1>Estado del servidor</h1>
          <p>
            Datos leídos de la API cada 20 segundos. Última lectura:{' '}
            {data ? new Date(data.generatedAt).toLocaleTimeString('es-UY') : '—'}
          </p>
        </div>
        <div className="page-head-actions">
          <Button variant="ghost" icon="refresh" onClick={() => reload()} loading={loading}>
            Actualizar
          </Button>
        </div>
      </header>

      <div className="metric-grid">
        {cards.map((card) => (
          <div key={card.label} className={`metric-card metric-${card.tone}`}>
            <span className="metric-icon">
              <Icon name={card.icon} size={19} />
            </span>
            <span className="metric-label">{card.label}</span>
            <strong className="metric-value">{loading && !data ? '—' : fmt.format(card.value || 0)}</strong>
            <small>{card.hint}</small>
          </div>
        ))}
      </div>

      <div className="two-col">
        <section className="panel-card">
          <div className="panel-card-head">
            <span className="panel-icon">
              <Icon name="chart" size={18} />
            </span>
            <div>
              <h2>Comandos más usados</h2>
              <p>Conteo real de ejecuciones desde el último arranque.</p>
            </div>
          </div>

          {data?.topCommands?.length ? (
            <ol className="rank-list">
              {data.topCommands.map((command, index) => {
                const max = data.topCommands[0].usageCount || 1;
                return (
                  <li key={`${command.botId}-${command.id || command.trigger}-${index}`}>
                    <span className="rank-position">{index + 1}</span>
                    <span className="rank-body">
                      <span className="rank-line">
                        <strong>
                          {command.emoji} {command.name}
                        </strong>
                        <code>!{command.trigger}</code>
                        <span className="rank-count">{fmt.format(command.usageCount)}</span>
                      </span>
                      <span className="rank-bar">
                        <span style={{ width: `${Math.max(4, (command.usageCount / max) * 100)}%` }} />
                      </span>
                      <small>{command.botName}</small>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="empty-inline">
              <Icon name="chart" size={20} />
              <p>
                Todavía no hay ejecuciones registradas. Probá un comando en el simulador o en el
                grupo para verlo aparecer acá.
              </p>
            </div>
          )}
        </section>

        <section className="panel-card">
          <div className="panel-card-head">
            <span className="panel-icon">
              <Icon name="globe" size={18} />
            </span>
            <div>
              <h2>Servidor</h2>
              <p>Cómo está corriendo esta instancia.</p>
            </div>
          </div>

          <dl className="data-list">
            <div>
              <dt>Modo</dt>
              <dd>{deploy?.mode === 'serverless' ? 'Serverless' : deploy?.ephemeral ? 'Sin disco' : 'Persistente'}</dd>
            </div>
            <div>
              <dt>Tiempo encendido</dt>
              <dd>{data ? uptime(data.uptimeSeconds) : '—'}</dd>
            </div>
            <div>
              <dt>Acceso</dt>
              <dd>{deploy?.access === 'protected' ? 'Protegido con clave' : 'Abierto'}</dd>
            </div>
            <div>
              <dt>Datos</dt>
              <dd className="mono">{deploy?.dataDir || '—'}</dd>
            </div>
            <div>
              <dt>URL pública</dt>
              <dd className="mono">{deploy?.publicUrl || 'No configurada'}</dd>
            </div>
            <div>
              <dt>Persistencia</dt>
              <dd>{deploy?.persistentData ? 'Disco persistente' : 'Se reinicia con el servidor'}</dd>
            </div>
          </dl>

          {deploy?.warning ? (
            <p className="hint-box hint-warn">
              <Icon name="warning" size={15} />
              <span>{deploy.warning}</span>
            </p>
          ) : null}
        </section>
      </div>

      <section className="panel-card">
        <div className="panel-card-head">
          <span className="panel-icon">
            <Icon name="bot" size={18} />
          </span>
          <div>
            <h2>Detalle por bot</h2>
            <p>Sesiones, actividad y comandos de cada bot registrado.</p>
          </div>
        </div>

        {data?.perBot?.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bot</th>
                  <th>Estado</th>
                  <th>Comandos</th>
                  <th>Mensajes</th>
                  <th>Respuestas</th>
                  <th>Última actividad</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.perBot.map((bot) => (
                  <tr key={bot.id}>
                    <td>
                      <span className="table-bot">
                        <span>{bot.emoji}</span>
                        <strong>{bot.name}</strong>
                      </span>
                    </td>
                    <td>
                      <StatusDot
                        status={bot.connected ? 'connected' : bot.status === 'error' ? 'error' : 'disconnected'}
                        label={bot.connected ? 'En línea' : bot.status === 'error' ? 'Error' : 'Sin vincular'}
                      />
                    </td>
                    <td>{fmt.format(bot.commands)}</td>
                    <td>{fmt.format(bot.messages)}</td>
                    <td>{fmt.format(bot.replies)}</td>
                    <td className="muted">
                      {bot.lastActiveAt ? new Date(bot.lastActiveAt).toLocaleString('es-UY') : 'Sin datos'}
                    </td>
                    <td>
                      <Link className="table-link" to={`/bots/${bot.id}/commands`}>
                        Abrir <Icon name="chevron" size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <Icon name="bot" size={20} />
            <p>No hay bots registrados todavía.</p>
            <Link className="btn btn-primary btn-sm" to="/registrar">
              Registrar bot
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
