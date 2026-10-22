import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import {
  Button,
  Card,
  Field,
  Icon,
  Input,
  Modal,
  StatusDot,
  useToast,
} from '../components/ui.jsx';

const TEMPLATE_EMOJI = ['💬', '🎧', '🛍️', '👥', '🎟️', '🤖'];

export default function Dashboard() {
  const [bots, setBots] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('starter');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💬');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const { notify } = useToast();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/bots'), api.get('/meta')])
      .then(([botsData, metaData]) => {
        setBots(botsData.bots);
        setMeta(metaData);
      })
      .catch((error) => notify(error.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const totals = useMemo(
    () => ({
      bots: bots.length,
      commands: bots.reduce((acc, b) => acc + b.commands, 0),
      reactions: bots.reduce((acc, b) => acc + b.reactions, 0),
      online: bots.filter((b) => b.whatsapp.connected || b.teams.status === 'ready').length,
    }),
    [bots],
  );

  const openCreate = () => {
    setCreating(true);
    const template = meta?.templates?.find((t) => t.id === selectedTemplate) || meta?.templates?.[0];
    if (template) {
      setName(template.name === 'Desde cero' ? 'Mi bot' : template.name);
      setEmoji(template.emoji);
    }
  };

  const chooseTemplate = (template) => {
    setSelectedTemplate(template.id);
    setEmoji(template.emoji);
    setName(template.id === 'custom' ? 'Mi bot' : template.name);
  };

  const createBot = async () => {
    setBusy(true);
    try {
      const { bot } = await api.post('/bots', { template: selectedTemplate, name, emoji });
      notify('¡Bot creado! Ya podés personalizarlo.');
      setCreating(false);
      navigate(`/bots/${bot.id}/commands`);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (bot) => {
    try {
      await api.post(`/bots/${bot.id}/duplicate`);
      notify(`Se duplicó «${bot.name}»`);
      load();
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const remove = async () => {
    try {
      await api.del(`/bots/${deleting.id}`);
      notify('Bot eliminado');
      setDeleting(null);
      load();
    } catch (error) {
      notify(error.message, 'error');
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
      load();
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
          <span className="eyebrow">Panel de control</span>
          <h1>Mis bots</h1>
          <p>Crea, personaliza y conecta asistentes para WhatsApp y Microsoft Teams.</p>
        </div>
        <div className="page-head-actions">
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={importBot} />
          <Button variant="ghost" icon="upload" onClick={() => fileRef.current?.click()} loading={importing}>
            Importar
          </Button>
          <Button icon="plus" onClick={openCreate}>
            Nuevo bot
          </Button>
        </div>
      </header>

      <div className="stat-row">
        {[
          { label: 'Bots creados', value: totals.bots, icon: 'bot', tone: 'indigo' },
          { label: 'Comandos activos', value: totals.commands, icon: 'command', tone: 'violet' },
          { label: 'Reacciones', value: totals.reactions, icon: 'smile', tone: 'amber' },
          { label: 'Canales conectados', value: totals.online, icon: 'whatsapp', tone: 'emerald' },
        ].map((stat) => (
          <div key={stat.label} className={`stat stat-${stat.tone}`}>
            <span className="stat-icon">
              <Icon name={stat.icon} size={18} />
            </span>
            <div>
              <strong>{loading ? '—' : stat.value}</strong>
              <small>{stat.label}</small>
            </div>
          </div>
        ))}
      </div>

      {!loading && !bots.length ? (
        <Card className="hero-card">
          <div className="hero-copy">
            <span className="eyebrow">Empezá en 2 minutos</span>
            <h2>Tu primer bot, sin escribir código</h2>
            <p>
              Elegí una plantilla, ajustá los comandos y las reacciones, y vinculá tu WhatsApp con
              QR o código de vinculación. También podés publicarlo en Microsoft Teams.
            </p>
            <div className="hero-actions">
              <Button icon="plus" onClick={openCreate}>
                Crear mi bot
              </Button>
              <span className="hero-hint">Plantillas: atención al cliente, tienda, comunidad y más.</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-phone">
              <span>🤖</span>
              <div className="hero-bubble">¡Hola! Soy tu nuevo bot 👋</div>
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
              <div className="bot-card-menu">
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
                status={bot.whatsapp.connected ? 'connected' : 'disconnected'}
                label={bot.whatsapp.connected ? 'WhatsApp conectado' : 'WhatsApp sin conectar'}
              />
              <StatusDot
                status={bot.teams.status === 'ready' ? 'ready' : 'not_configured'}
                label={bot.teams.status === 'ready' ? 'Teams activo' : 'Teams sin activar'}
              />
            </div>

            <div className="bot-card-footer">
              <span className="muted small">
                {bot.stats.messages} mensajes · {bot.stats.replies} respuestas
              </span>
              <Link className="btn btn-primary btn-sm" to={`/bots/${bot.id}/commands`}>
                Abrir <Icon name="chevron" size={14} />
              </Link>
            </div>
          </Card>
        ))}

        <button className="bot-card bot-card-new" onClick={openCreate}>
          <span className="bot-new-icon">
            <Icon name="plus" size={22} />
          </span>
          <strong>Crear otro bot</strong>
          <small>Partí de una plantilla editable</small>
        </button>
      </div>

      <Card className="info-strip">
        <div className="info-item">
          <Icon name="whatsapp" size={18} />
          <div>
            <strong>WhatsApp personal</strong>
            <span>Vinculación por QR o código de 8 dígitos.</span>
          </div>
        </div>
        <div className="info-item">
          <Icon name="teams" size={18} />
          <div>
            <strong>Microsoft Teams</strong>
            <span>Activá el canal con tu App ID de Azure Bot.</span>
          </div>
        </div>
        <div className="info-item">
          <Icon name="smile" size={18} />
          <div>
            <strong>Reacciones y textos</strong>
            <span>Editá emojis, respuestas y plantillas reutilizables.</span>
          </div>
        </div>
      </Card>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Crear un bot"
        subtitle="Elegí una plantilla y ponele nombre. Después podés cambiar todo."
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button icon="sparkles" onClick={createBot} loading={busy}>
              Crear bot
            </Button>
          </>
        }
      >
        <div className="template-grid">
          {(meta?.templates || []).map((template) => (
            <button
              key={template.id}
              className={`template-card ${selectedTemplate === template.id ? 'is-selected' : ''}`}
              onClick={() => chooseTemplate(template)}
              type="button"
            >
              <span className={`template-emoji accent-${template.accent}`}>{template.emoji}</span>
              <strong>{template.name}</strong>
              <small>{template.description}</small>
              <span className="template-tag">{template.tag}</span>
            </button>
          ))}
        </div>

        <div className="form-row">
          <Field label="Nombre del bot">
            <Input
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Atención Montevideo"
            />
          </Field>
          <Field label="Ícono" hint="Un emoji que lo identifique">
            <div className="emoji-row">
              {TEMPLATE_EMOJI.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`emoji-btn ${emoji === option ? 'is-active' : ''}`}
                  onClick={() => setEmoji(option)}
                >
                  {option}
                </button>
              ))}
              <Input
                className="emoji-input"
                value={emoji}
                maxLength={4}
                onChange={(e) => setEmoji(e.target.value)}
                aria-label="Emoji personalizado"
              />
            </div>
          </Field>
        </div>
      </Modal>

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
            <Button variant="danger" icon="trash" onClick={remove}>
              Eliminar «{deleting?.name}»
            </Button>
          </>
        }
      >
        <p className="modal-text">
          Se borrarán sus comandos, reacciones, plantillas y la sesión de WhatsApp vinculada.
        </p>
      </Modal>
    </div>
  );
}
