import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, StatusDot } from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';

const numbers = new Intl.NumberFormat('es-UY');

function InfoCard({ metrics, loading, pages }) {
  const [page, setPage] = useState(0);
  const total = pages.length;
  const current = pages[page];

  return (
    <section className="info-card">
      <header className="info-card-head">
        <span className="info-card-title">
          <Icon name="info" size={20} />
          {current.title}
        </span>
        <span className="info-card-stack" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </header>

      <div className="info-card-body">
        {current.render({ metrics, loading })}
        <p className="info-card-copy">© 2025-2026 BotForge · Hecho para grupos de WhatsApp</p>
      </div>

      <div className="info-card-nav">
        <button
          className="info-nav-btn"
          onClick={() => setPage((value) => (value - 1 + total) % total)}
          aria-label="Página anterior"
        >
          <Icon name="chevron" size={16} className="flip" />
        </button>
        <span className="info-nav-count">
          {page + 1} / {total}
        </span>
        <button
          className="info-nav-btn"
          onClick={() => setPage((value) => (value + 1) % total)}
          aria-label="Página siguiente"
        >
          <Icon name="chevron" size={16} />
        </button>
      </div>
    </section>
  );
}

export default function Home() {
  const { data: metrics, loading } = useApi('/metrics');
  const { data: botsData } = useApi('/bots');
  const { data: meta } = useApi('/meta');

  const totals = metrics?.totals;
  const bots = botsData?.bots || [];
  const deploy = meta?.deploy;

  const pages = useMemo(
    () => [
      {
        title: 'INFORMACIÓN',
        render: () => (
          <>
            <p className="info-line">
              <strong>
                {deploy?.serverless
                  ? 'Servidor serverless'
                  : deploy?.ephemeral
                    ? 'Servidor sin disco persistente'
                    : 'Servidor persistente'}
              </strong>{' '}
              · acceso {deploy?.access === 'protected' ? 'con clave' : 'abierto'}
            </p>
            <p className="info-paragraph">
              Tenés <strong>{loading ? '—' : numbers.format(totals?.bots || 0)}</strong> bots
              registrados, <strong>{numbers.format(totals?.commands || 0)}</strong> comandos activos y{' '}
              <strong>{numbers.format(totals?.messages || 0)}</strong> mensajes procesados desde que
              arrancó el servidor.
            </p>
            <p className="info-subtitle">✿ BENEFICIOS ✿</p>
            <ul className="info-list">
              <li>(ˆ▽ˆ) Responde únicamente en grupos de WhatsApp.</li>
              <li>(ˆ▽ˆ) Vinculación por QR o código de 8 dígitos.</li>
              <li>(ˆ▽ˆ) Comandos, reacciones y textos editables sin código.</li>
              <li>(ˆ▽ˆ) Métricas y grupos leídos del servidor en tiempo real.</li>
            </ul>
            <p className="info-paragraph info-paragraph-soft">
              Sumá el bot a un grupo, dale permisos de administrador opcionales y escribí{' '}
              <strong>!menu</strong> para verlo trabajar.
            </p>
          </>
        ),
      },
      {
        title: 'PRIMEROS PASOS',
        render: () => (
          <>
            <p className="info-paragraph">
              Tres pasos y el bot queda atendiendo el grupo. No hace falta instalar nada.
            </p>
            <ol className="info-steps">
              <li>
                <strong>Registrá el bot.</strong> Elegí una plantilla y ponele el nombre del equipo.
              </li>
              <li>
                <strong>Instalá comandos.</strong> El catálogo trae moderación, ventas, atención y
                dinámicas listas para usar.
              </li>
              <li>
                <strong>Vinculá WhatsApp.</strong> Escaneá el QR o usá el código de vinculación y
                sumá el número al grupo.
              </li>
            </ol>
            <div className="info-cta-row">
              <Link className="info-cta" to="/registrar">
                Registrar bot <Icon name="chevron" size={14} />
              </Link>
              <Link className="info-cta info-cta-ghost" to="/catalogo">
                Ver catálogo <Icon name="chevron" size={14} />
              </Link>
            </div>
          </>
        ),
      },
    ],
    [deploy, loading, totals],
  );

  return (
    <div className="page page-home">
      <section className="welcome">
        <span className="welcome-avatar">✦</span>
        <div className="welcome-text">
          <h1>WELCOME</h1>
          <p>
            Hola, <strong>bienvenido</strong>. Panel de grupos
          </p>
        </div>
      </section>

      <InfoCard metrics={metrics} loading={loading} pages={pages} />

      <div className="home-stats">
        <div className="home-stat">
          <span className="home-stat-label">
            <Icon name="bot" size={15} /> TOTAL BOTS
          </span>
          <strong className="home-stat-value">{loading ? '—' : numbers.format(totals?.bots || 0)}</strong>
          <small>{loading ? 'Cargando…' : `${bots.length} en este servidor`}</small>
        </div>
        <div className="home-stat">
          <span className="home-stat-label">
            <Icon name="crown" size={15} /> CONECTADOS
          </span>
          <strong className="home-stat-value">
            {loading ? '—' : numbers.format(totals?.connected || 0)}
          </strong>
          <small>Sesiones de WhatsApp activas</small>
        </div>
        <div className="home-stat">
          <span className="home-stat-label">
            <Icon name="command" size={15} /> COMANDOS
          </span>
          <strong className="home-stat-value">
            {loading ? '—' : numbers.format(totals?.commands || 0)}
          </strong>
          <small>Activos en todos los bots</small>
        </div>
        <div className="home-stat">
          <span className="home-stat-label">
            <Icon name="activity" size={15} /> MENSAJES
          </span>
          <strong className="home-stat-value">
            {loading ? '—' : numbers.format(totals?.messages || 0)}
          </strong>
          <small>{numbers.format(totals?.replies || 0)} respuestas enviadas</small>
        </div>
      </div>

      <section className="section-block">
        <header className="section-head">
          <div>
            <span className="eyebrow">Sesiones</span>
            <h2>Tus bots</h2>
          </div>
          <Link className="btn btn-ghost btn-sm" to="/bots">
            Ver todos <Icon name="chevron" size={14} />
          </Link>
        </header>

        {bots.length ? (
          <div className="bot-list-home">
            {bots.slice(0, 4).map((bot) => (
              <Link key={bot.id} to={`/bots/${bot.id}/commands`} className="bot-row">
                <span className="bot-row-emoji">{bot.emoji}</span>
                <span className="bot-row-body">
                  <strong>{bot.name}</strong>
                  <small>
                    {bot.commands} comandos · {numbers.format(bot.stats?.messages || 0)} mensajes
                  </small>
                </span>
                <StatusDot
                  status={bot.whatsapp.connected ? 'connected' : 'disconnected'}
                  label={bot.whatsapp.connected ? 'En línea' : 'Sin vincular'}
                />
                <Icon name="chevron" size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-card">
            <Icon name="bot" size={26} />
            <h3>Todavía no hay bots</h3>
            <p>Registrá el primero para empezar a responder en tu grupo.</p>
            <Link className="btn btn-primary" to="/registrar">
              <Icon name="plus" size={16} /> Registrar bot
            </Link>
          </div>
        )}
      </section>

      <div className="quick-grid">
        {[
          { to: '/registrar', icon: 'plus', title: 'Registrar', text: 'Crear un bot con plantilla' },
          { to: '/catalogo', icon: 'crown', title: 'Catálogo', text: 'Instalar comandos y plugins' },
          { to: '/canal', icon: 'whatsapp', title: 'Canal WhatsApp', text: 'QR, código y grupos' },
          { to: '/metricas', icon: 'chart', title: 'Métricas', text: 'Uso real del servidor' },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="quick-card">
            <span className="quick-icon">
              <Icon name={item.icon} size={18} />
            </span>
            <strong>{item.title}</strong>
            <small>{item.text}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}
