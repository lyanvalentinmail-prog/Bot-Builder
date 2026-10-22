import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { API_BASE, AUTH_TOKEN } from '../lib/config.js';
import { useApi } from '../lib/useApi.js';
import { Button, Icon, Modal, StatusDot, useToast } from '../components/ui.jsx';

const fmt = new Intl.NumberFormat('es-UY');

export default function Bots() {
  const { data, loading, reload } = useApi('/bots');
  const { data: meta } = useApi('/meta');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [menu, setMenu] = useState(null);
  const menuRef = useRef(null);
  const fileRef = useRef(null);
  const { notify } = useToast();

  const bots = data?.bots || [];

  useEffect(() => {
    if (!menu) return undefined;
    const onPointer = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenu(null);
    };
    const onKey = (event) => event.key === 'Escape' && setMenu(null);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const counts = useMemo(
    () => ({
      all: bots.length,
      online: bots.filter((bot) => bot.whatsapp.connected).length,
      offline: bots.filter((bot) => !bot.whatsapp.connected).length,
    }),
    [bots],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return bots.filter((bot) => {
      if (filter === 'online' && !bot.whatsapp.connected) return false;
      if (filter === 'offline' && bot.whatsapp.connected) return false;
      if (!term) return true;
      return (
        bot.name.toLowerCase().includes(term) ||
        (bot.description || '').toLowerCase().includes(term)
      );
    });
  }, [bots, filter, query]);

  const totals = useMemo(
    () => ({
      commands: bots.reduce((acc, bot) => acc + bot.commands, 0),
      messages: bots.reduce((acc, bot) => acc + (bot.stats?.messages || 0), 0),
    }),
    [bots],
  );

  const duplicate = async (bot) => {
    try {
      await api.post(`/bots/${bot.id}/duplicate`);
      notify(`Se duplicó «${bot.name}»`);
      reload({ silent: true });
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/bots/${deleting.id}`);
      notify('Bot eliminado');
      setDeleting(null);
      reload({ silent: true });
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const importBot = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const payload = JSON.parse(await file.text());
      const { bot } = await api.post('/bots/import', payload);
      notify(`Se importó «${bot.name}»`);
      reload({ silent: true });
    } catch (error) {
      notify(`No se pudo importar: ${error.message}`, 'error');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="page page-bots">
      <section className="bots-hero">
        <div className="bots-hero-text">
          <span className="bots-hero-label">Sesiones activas</span>
          <h1>
            Mis Bots <span className="count-pill">{bots.length}</span>
          </h1>
          <p>
            Cada bot usa su propia sesión de WhatsApp y responde solo en grupos. Los datos salen del
            servidor en tiempo real.
          </p>
        </div>
        <div className="bots-hero-actions">
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importBot} />
          <Button variant="ghost" icon="upload" onClick={() => fileRef.current?.click()} loading={importing}>
            Importar
          </Button>
          <Link className="btn btn-primary" to="/registrar">
            <Icon name="plus" size={17} /> Registrar bot
          </Link>
        </div>
      </section>

      {meta?.deploy?.ephemeral ? (
        <div className="hint-box hint-warn">
          <Icon name="warning" size={16} />
          <span>
            <strong>{meta.deploy.serverless ? 'Modo serverless.' : 'Plan sin disco persistente.'}</strong>{' '}
            {meta.deploy.hint}
          </span>
        </div>
      ) : null}

      <div className="bots-toolbar">
        <div className="bots-chips">
          {[
            { id: 'all', label: 'Todas', count: counts.all },
            { id: 'online', label: 'En línea', count: counts.online },
            { id: 'offline', label: 'Sin vincular', count: counts.offline },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`filter-chip ${filter === item.id ? 'is-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              <span>{item.count}</span>
            </button>
          ))}
        </div>
        <label className="search-box">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar bot por nombre"
          />
        </label>
      </div>

      <div className="bots-summary">
        <span>
          <Icon name="command" size={14} /> {fmt.format(totals.commands)} comandos activos
        </span>
        <span>
          <Icon name="activity" size={14} /> {fmt.format(totals.messages)} mensajes procesados
        </span>
        <span>
          <Icon name="whatsapp" size={14} /> {counts.online} de {counts.all} en línea
        </span>
      </div>

      {bots.length ? (
        <div className="bots-grid">
          {visible.map((bot) => (
            <article key={bot.id} className="bot-tile">
              <header className="bot-tile-head">
                <span className="bot-tile-emoji">{bot.emoji}</span>
                <div className="bot-tile-id">
                  <h2>{bot.name}</h2>
                  <small>{bot.description || 'Sin descripción'}</small>
                </div>
                <div
                  className={`mini-dropdown ${menu === bot.id ? 'is-open' : ''}`}
                  ref={menu === bot.id ? menuRef : null}
                >
                  <button
                    className="icon-btn"
                    title="Opciones del bot"
                    aria-label={`Opciones de ${bot.name}`}
                    aria-expanded={menu === bot.id}
                    onClick={() => setMenu((prev) => (prev === bot.id ? null : bot.id))}
                  >
                    <Icon name="chevron" size={16} className="rot-down" />
                  </button>
                  <div className="mini-menu">
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(null);
                        duplicate(bot);
                      }}
                    >
                      <Icon name="copy" size={14} /> Duplicar
                    </button>
                    <a
                      href={`${API_BASE}/api/bots/${bot.id}/export${AUTH_TOKEN ? `?token=${encodeURIComponent(AUTH_TOKEN)}` : ''}`}
                      download
                      onClick={() => setMenu(null)}
                    >
                      <Icon name="download" size={14} /> Exportar
                    </a>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => {
                        setMenu(null);
                        setDeleting(bot);
                      }}
                    >
                      <Icon name="trash" size={14} /> Eliminar
                    </button>
                  </div>
                </div>
              </header>

              <div className={`bot-tile-status ${bot.whatsapp.connected ? 'is-online' : ''}`}>
                <StatusDot
                  status={
                    bot.whatsapp.connected
                      ? 'connected'
                      : bot.whatsapp.status === 'error'
                        ? 'error'
                        : 'disconnected'
                  }
                  label={
                    bot.whatsapp.connected
                      ? `WhatsApp +${bot.whatsapp.phone}`
                      : bot.whatsapp.status === 'error'
                        ? 'Error de conexión'
                        : 'Sin vincular'
                  }
                />
                <span>
                  {bot.stats?.lastActiveAt
                    ? `Último mensaje ${new Date(bot.stats.lastActiveAt).toLocaleDateString('es-UY')}`
                    : 'Sin actividad todavía'}
                </span>
              </div>

              <div className="bot-tile-chips">
                <span>
                  <Icon name="command" size={13} /> {bot.commands} comandos
                </span>
                <span>
                  <Icon name="smile" size={13} /> {bot.reactions} reacciones
                </span>
                <span>
                  <Icon name="text" size={13} /> {bot.texts} textos
                </span>
              </div>

              <div className="bot-tile-stats">
                <div>
                  <strong>{fmt.format(bot.stats?.messages || 0)}</strong>
                  <small>mensajes</small>
                </div>
                <div>
                  <strong>{fmt.format(bot.stats?.replies || 0)}</strong>
                  <small>respuestas</small>
                </div>
                <div>
                  <strong>{fmt.format(bot.stats?.reactions || 0)}</strong>
                  <small>reacciones</small>
                </div>
              </div>

              <div className="bot-tile-actions">
                <Link className="bot-open" to={`/bots/${bot.id}/commands`}>
                  Abrir <Icon name="chevron" size={15} />
                </Link>
                <Link className="bot-ghost" to={`/bots/${bot.id}/whatsapp`}>
                  {bot.whatsapp.connected ? 'Sesión' : 'Vincular'}
                </Link>
              </div>
            </article>
          ))}

          <Link to="/registrar" className="bot-tile bot-tile-new">
            <span className="bot-tile-new-icon">
              <Icon name="plus" size={24} />
            </span>
            <strong>Registrar otro bot</strong>
            <small>Asistente de 5 pasos con plantilla incluida</small>
          </Link>
        </div>
      ) : null}

      {!loading && !bots.length ? (
        <div className="bots-empty">
          <span className="bots-empty-icon">
            <Icon name="bot" size={26} />
          </span>
          <h2>Tu primer bot para el grupo</h2>
          <p>
            Elegí una instancia, vinculá WhatsApp por QR o código y sumá el número al grupo. Son
            cinco pasos y no hace falta escribir código.
          </p>
          <Link className="continue-btn" to="/registrar">
            Registrar bot <Icon name="chevron" size={18} />
          </Link>
        </div>
      ) : null}

      {bots.length && !visible.length ? (
        <div className="bots-empty">
          <span className="bots-empty-icon">
            <Icon name="search" size={26} />
          </span>
          <h2>Sin resultados</h2>
          <p>Probá con otro nombre o cambiá el filtro de estado.</p>
        </div>
      ) : null}

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Eliminar bot"
        subtitle="Esta acción no se puede deshacer."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="danger" icon="trash" onClick={remove} loading={busy}>
              Eliminar «{deleting?.name}»
            </Button>
          </>
        }
      >
        <p className="modal-text">
          Se borran sus comandos, reacciones, plantillas y la sesión de WhatsApp vinculada.
        </p>
      </Modal>
    </div>
  );
}
