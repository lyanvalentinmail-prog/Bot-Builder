import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Button, Field, Icon, Input, Textarea, useToast } from '../components/ui.jsx';

const EMOJIS = ['💬', '🎧', '🛍️', '👥', '🛡️', '📣', '🎟️', '🤖'];

export default function Register() {
  const [meta, setMeta] = useState(null);
  const [template, setTemplate] = useState('starter');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💬');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const { notify } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/meta')
      .then((data) => {
        setMeta(data);
        const first = data.templates?.find((t) => t.id === 'starter') || data.templates?.[0];
        if (first) {
          setTemplate(first.id);
          setName(first.name);
          setEmoji(first.emoji);
          setDescription(first.description || '');
        }
      })
      .catch((error) => notify(error.message, 'error'));
  }, [notify]);

  const choose = (option) => {
    setTemplate(option.id);
    setName(option.name);
    setEmoji(option.emoji);
    setDescription(option.description || '');
  };

  const create = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      notify('Ponele un nombre al bot', 'error');
      return;
    }
    setBusy(true);
    try {
      const { bot } = await api.post('/bots', {
        template,
        name: name.trim(),
        emoji,
        description: description.trim(),
      });
      notify(`«${bot.name}» está listo. Ahora vinculá WhatsApp.`);
      navigate(`/bots/${bot.id}/whatsapp`);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div>
          <span className="eyebrow">Registrar</span>
          <h1>Activar un bot para tu grupo</h1>
          <p>Elegí una plantilla, ponele nombre y después vinculá WhatsApp con QR o código.</p>
        </div>
      </header>

      <form className="register-layout" onSubmit={create}>
        <section className="panel-card">
          <div className="panel-card-head">
            <span className="panel-icon">
              <Icon name="sparkles" size={18} />
            </span>
            <div>
              <h2>Plantilla de arranque</h2>
              <p>Trae comandos, textos y reacciones listos para editar.</p>
            </div>
          </div>

          <div className="template-grid">
            {(meta?.templates || []).map((option) => (
              <button
                key={option.id}
                type="button"
                className={`template-card ${template === option.id ? 'is-selected' : ''}`}
                onClick={() => choose(option)}
              >
                <span className={`template-emoji accent-${option.accent}`}>{option.emoji}</span>
                <strong>{option.name}</strong>
                <small>{option.description}</small>
                <span className="template-tag">{option.tag}</span>
              </button>
            ))}
            {!meta
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="template-card skeleton-card" />
                ))
              : null}
          </div>

          <div className="form-row">
            <Field label="Nombre del bot" hint="Visible en el grupo y en el panel">
              <Input
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: Equipo Ventas"
                required
              />
            </Field>
            <Field label="Ícono" hint="Un emoji que lo identifique">
              <div className="emoji-row">
                {EMOJIS.map((option) => (
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
                  onChange={(event) => setEmoji(event.target.value)}
                  aria-label="Emoji personalizado"
                />
              </div>
            </Field>
          </div>

          <Field label="Descripción" hint="Para qué lo va a usar el grupo">
            <Textarea
              rows={3}
              value={description}
              maxLength={240}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ej: responde horarios, precios y pedidos del grupo de clientes."
            />
          </Field>

          <div className="form-actions">
            <span className="muted small">
              El bot queda guardado en este servidor y aparece en «Mis Bots».
            </span>
            <Button type="submit" icon="plus" loading={busy}>
              Crear bot
            </Button>
          </div>
        </section>

        <aside className="register-side">
          <div className="panel-card panel-soft">
            <h3>Qué pasa después</h3>
            <ol className="step-list">
              <li>
                <span>1</span>
                <div>
                  <strong>Vinculá WhatsApp</strong>
                  <p>QR o código de 8 dígitos desde el teléfono del equipo.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Sumá el número al grupo</strong>
                  <p>El bot ignora los chats privados: solo actúa en grupos.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Instalá comandos</strong>
                  <p>El catálogo agrega moderación, ventas y atención con un clic.</p>
                </div>
              </li>
            </ol>
            <p className="hint-box">
              <Icon name="lock" size={15} />
              <span>La sesión de WhatsApp se guarda en el servidor, nunca en el navegador.</span>
            </p>
          </div>

          <div className="panel-card panel-soft">
            <h3>Límites actuales</h3>
            <ul className="plain-list">
              <li>60 comandos por bot</li>
              <li>40 reacciones y 40 textos</li>
              <li>Una sesión de WhatsApp por bot</li>
            </ul>
          </div>
        </aside>
      </form>
    </div>
  );
}
