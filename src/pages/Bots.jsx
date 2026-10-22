import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { Button, Card, Icon, Modal, StatusDot, useToast } from '../components/ui.jsx';

const fmt = new Intl.NumberFormat('es-UY');

export default function Bots() {
  const { data, loading, reload } = useApi('/bots');
  const { data: meta } = useApi('/meta');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const { notify } = useToast();
  const bots = data?.bots || [];

  const totals = useMemo(
    () => ({
      commands: bots.reduce((acc, bot) => acc + bot.commands, 0),
      connected: bots.filter((bot) => bot.whatsapp.connected).length,
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
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Sesiones</span>
          <h1>Mis Bots</h1>
          <p>Bots de grupo guardados en este servidor. Todo lo que ves sale de la API real.</p>
        </div>
        <div className="page-head-actions">
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importBot} />
          <Button variant="ghost" icon="upload" onClick={() => fileRef.current?.click()} loading={importing}>
            Importar
          </Button>
          <Link className="btn btn-primary" to="/registrar">
            <Icon name="plus" size={17} /> Registrar bot
          </Link>
        </div>
      </header>

      {meta?.deploy?.ephemeral ? (
        <div className="hint-box hint-warn">
          <Icon name="warning" size={16} />
          <span>
            <strong>{meta.deploy.serverless ? 'Modo serverless.' : 'Plan sin disco persistente.'}</strong>{' '}
            {meta.deploy.hint}
          </span>
        </div>
      ) : null}

      <div className="stat-row">
        {[
          { label: 'Bots creados', value: bots.length, icon: 'bot', tone: 'indigo' },
          { label: 'Comandos activos', value: totals.commands, icon: 'command', tone: 'violet' },
          { label: 'Sesiones en línea', value: totals.connected, icon: 'whatsapp', tone: 'emerald' },
          {
            label: 'Mensajes procesados',
            value: bots.reduce((acc, bot) => acc + (bot.stats?.messages || 0), 0),
            icon: 'activity',
            tone: 'amber',
          },
        ].map((stat) => (
          <div key={stat.label} className={`stat stat-${stat.tone}`}>
            <span className="stat-icon">
              <Icon name={stat.icon} size={18} />
            </span>
            <div>
              <strong>{loading ? '—' : fmt.format(stat.value)}</strong>
              <small>{stat.label}</small>
            </div>
          </div>
        ))}
      </div>

      {!loading && !bots.length ? (
        <Card className="hero-card">
          <div className="hero-copy">
            <span className="eyebrow">Empezá en dos minutos</span>
            <h2>Tu primer bot para el grupo</h2>
            <p>
              Elegí una plantilla, ajustá los comandos y vinculá WhatsApp con QR o código. El bot
              solo responde en grupos, nunca en chats privados.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/registrar">
                <Icon name="plus" size={17} /> Registrar bot
              </Link>
              <Link className="btn btn-ghost" to="/catalogo">
                Ver catálogo
              </Link>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-phone">
              <span>🤖</span>
              <div className="hero-bubble">¡Hola! Soy el bot del grupo 👋</div>
              <div className="hero-bubble hero-bubble-2">!menu</div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="bot-grid">
        {bots.map((bot) => (
          <Card key={bot.id} className="bot-card">
            <div className="bot-card-top">
              <span className="bot-avatar">{bot.emoji}</span>
              <div className="bot-card-id">
                <h3>{bot.name}</h3>
                <p>{bot.description || 'Sin descripción'}</p>
              </div>
              <div className="mini-dropdown">
                <button className="icon-btn" title="Opciones del bot" aria-label="Opciones">
                  <Icon name="chevron" size={16} />
                </button>
                <div className="mini-menu">
                  <button onClick={() => duplicate(bot)}>
                    <Icon name="copy" size={14} /> Duplicar
                  </button>
                  <a href={`/api/bots/${bot.id}/export`} download>
                    <Icon name="download" size={14} /> Exportar
                  </a>
                  <button className="is-danger" onClick={() => setDeleting(bot)}>
                    <Icon name="trash" size={14} /> Eliminar
                  </button>
                </div>
              </div>
            </div>

            <div className="bot-card-chips">
              <span className="chip">
                <Icon name="command" size={13} /> {bot.commands} comandos
              </span>
              <span className="chip">
                <Icon name="smile" size={13} /> {bot.reactions} reacciones
              </span>
              <span className="chip">
                <Icon name="text" size={13} /> {bot.texts} textos
              </span>
            </div>

            <div className="bot-card-channels">
              <StatusDot
                status={bot.whatsapp.connected ? 'connected' : bot.whatsapp.status === 'error' ? 'error' : 'disconnected'}
                label={bot.whatsapp.connected ? `WhatsApp · +${bot.whatsapp.phone}` : 'WhatsApp sin vincular'}
              />
              <span className="muted small">
                {bot.stats?.lastActiveAt
                  ? `Último mensaje: ${new Date(bot.stats.lastActiveAt).toLocaleString('es-UY')}`
                  : 'Sin actividad todavía'}
              </span>
            </div>

            <div className="bot-card-footer">
              <span className="muted small">
                {fmt.format(bot.stats?.messages || 0)} mensajes · {fmt.format(bot.stats?.replies || 0)}{' '}
                respuestas
              </span>
              <Link className="btn btn-primary btn-sm" to={`/bots/${bot.id}/commands`}>
                Abrir <Icon name="chevron" size={14} />
              </Link>
            </div>
          </Card>
        ))}

        <Link to="/registrar" className="bot-card bot-card-new">
          <span className="bot-new-icon">
            <Icon name="plus" size={22} />
          </span>
          <strong>Registrar otro bot</strong>
          <small>Partí de una plantilla editable</small>
        </Link>
      </div>

      <Card className="info-strip">
        <div className="info-item">
          <Icon name="whatsapp" size={18} />
          <div>
            <strong>Solo grupos</strong>
            <span>Los chats privados se ignoran por completo.</span>
          </div>
        </div>
        <div className="info-item">
          <Icon name="qr" size={18} />
          <div>
            <strong>QR o código</strong>
            <span>Vinculación por QR o pairing code de 8 dígitos.</span>
          </div>
        </div>
        <div className="info-item">
          <Icon name="crown" size={18} />
          <div>
            <strong>Catálogo</strong>
            <span>Comandos de moderación, ventas y atención.</span>
          </div>
        </div>
      </Card>

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
