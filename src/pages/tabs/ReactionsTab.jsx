import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import {
  Button,
  Card,
  CardHeader,
  EmojiPicker,
  EmptyState,
  Field,
  Icon,
  Input,
  Modal,
  Select,
  Toggle,
} from '../../components/ui.jsx';

const CONDITION_LABELS = {
  keyword: 'Contiene palabras clave',
  command: 'Cuando se usa un comando',
  every: 'En todos los mensajes',
  regex: 'Coincide con una expresión regular',
  dm: 'Mensajes privados',
  group: 'Mensajes de grupo',
  mention: 'Cuando mencionan al bot',
};

const CONDITION_HELP = {
  keyword: 'Separá las palabras con comas. No distingue mayúsculas ni acentos.',
  command: 'Escribí los comandos sin el prefijo, separados por coma. Ej: menu, ping',
  every: 'Reacciona a cada mensaje recibido. Usalo con probabilidad baja.',
  regex: 'Ejemplo: ^(hola|buenas)\\b',
  dm: 'Reacciona solo en chats privados.',
  group: 'Reacciona solo en grupos.',
  mention: 'Reacciona cuando el mensaje menciona al bot.',
};

const emptyReaction = () => ({
  name: 'Nueva reacción',
  enabled: true,
  emoji: '🔥',
  on: 'keyword',
  pattern: '',
  scope: 'all',
  chance: 100,
  removeAfterSeconds: 0,
});

export default function ReactionsTab({ bot, setBot, notify, patchBot }) {
  const [auto, setAuto] = useState(bot.autoReact);
  const [savingAuto, setSavingAuto] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(null);

  useEffect(() => setAuto(bot.autoReact), [bot.autoReact]);

  const autoTimer = useRef(null);
  useEffect(() => () => clearTimeout(autoTimer.current), []);

  const persistAuto = async (next) => {
    setSavingAuto(true);
    try {
      await patchBot({ autoReact: next });
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSavingAuto(false);
    }
  };

  const saveAuto = (patch) => {
    const next = { ...auto, ...patch };
    setAuto(next);
    clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => persistAuto(next), 450);
  };

  const saveReaction = async () => {
    try {
      const isNew = !editing.id;
      const { bot: updated } = isNew
        ? await api.post(`/bots/${bot.id}/reactions`, editing)
        : await api.put(`/bots/${bot.id}/reactions/${editing.id}`, editing);
      setBot(updated);
      setEditing(null);
      notify(isNew ? 'Reacción creada' : 'Reacción actualizada');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const toggleReaction = async (reaction) => {
    try {
      const { bot: updated } = await api.put(`/bots/${bot.id}/reactions/${reaction.id}`, {
        ...reaction,
        enabled: !reaction.enabled,
      });
      setBot(updated);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const remove = async () => {
    try {
      const { bot: updated } = await api.del(`/bots/${bot.id}/reactions/${deleting.id}`);
      setBot(updated);
      setDeleting(null);
      notify('Reacción eliminada');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const emojiOptions = ['👍', '❤️', '🔥', '👏', '😄', '🤩', '🙌', '✨', '💯', '🎉', '👋', '😍'];

  return (
    <div className="two-col">
      <div className="col-main">
        <Card>
          <CardHeader
            icon="sparkles"
            title="Reacción automática"
            subtitle="El bot reacciona a los mensajes que recibe, como lo haría una persona."
            badge={savingAuto ? <span className="chip">guardando…</span> : null}
          />
          <Toggle
            checked={auto.enabled}
            onChange={(value) => saveAuto({ enabled: value })}
            label="Activar reacción automática"
            description="Se aplica a los mensajes que no activan un comando."
          />

          <div className={`auto-config ${auto.enabled ? '' : 'is-disabled'}`}>
            <Field label="Emojis disponibles" hint="Se elige uno al azar">
              <div className="emoji-row">
                {emojiOptions.map((emoji) => {
                  const active = (auto.emojis || []).includes(emoji);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      className={`emoji-btn ${active ? 'is-active' : ''}`}
                      onClick={() => {
                        const next = active
                          ? auto.emojis.filter((e) => e !== emoji)
                          : [...(auto.emojis || []), emoji];
                        saveAuto({ emojis: next.length ? next : [emoji] });
                      }}
                      disabled={!auto.enabled}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="form-row form-row-compact">
              <Field label="Probabilidad" hint={`${auto.chance ?? 0}% de los mensajes`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={auto.chance ?? 0}
                  disabled={!auto.enabled}
                  onChange={(e) => saveAuto({ chance: Number(e.target.value) })}
                  className="range"
                />
              </Field>
              <Field label="Dónde reaccionar">
                <Select
                  value={auto.scope}
                  disabled={!auto.enabled}
                  onChange={(e) => saveAuto({ scope: e.target.value })}
                >
                  <option value="all">Todos los chats</option>
                  <option value="dm">Solo privados</option>
                  <option value="group">Solo grupos</option>
                </Select>
              </Field>
              <Field label="Quitar reacción (segundos)" hint="0 = queda permanente">
                <Input
                  type="number"
                  min={0}
                  max={3600}
                  value={auto.removeAfterSeconds ?? 0}
                  disabled={!auto.enabled}
                  onChange={(e) => saveAuto({ removeAfterSeconds: Number(e.target.value) })}
                />
              </Field>
            </div>

            <Toggle
              checked={auto.onCommands}
              onChange={(value) => saveAuto({ onCommands: value })}
              label="Reaccionar también a comandos"
              description="Si está apagado, solo reacciona a mensajes comunes."
              disabled={!auto.enabled}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            icon="smile"
            title="Reacciones personalizadas"
            subtitle="Reglas con emoji según lo que escribe la persona."
            actions={
              <Button
                icon="plus"
                size="sm"
                onClick={() => setEditing(emptyReaction())}
                disabled={bot.reactions.length >= 40}
              >
                Nueva reacción
              </Button>
            }
          />

          {!bot.reactions.length ? (
            <EmptyState
              icon="smile"
              title="Sin reacciones personalizadas"
              description="Por ejemplo: reaccionar con ❤️ cuando alguien agradece."
              action={<Button icon="plus" onClick={() => setEditing(emptyReaction())}>Crear reacción</Button>}
            />
          ) : (
            <div className="reaction-list">
              {bot.reactions.map((reaction) => (
                <div key={reaction.id} className={`reaction-item ${reaction.enabled ? '' : 'is-off'}`}>
                  <span className="reaction-emoji">{reaction.emoji}</span>
                  <div className="reaction-body">
                    <strong>{reaction.name}</strong>
                    <span className="muted small">
                      {CONDITION_LABELS[reaction.on]}
                      {reaction.on !== 'every' && reaction.on !== 'dm' && reaction.on !== 'group'
                        ? `: ${reaction.pattern || '(sin texto)'}`
                        : ''}
                    </span>
                    <span className="reaction-badges">
                      <span className="chip chip-xs">
                        {reaction.scope === 'all' ? 'Todos' : reaction.scope === 'dm' ? 'Privados' : 'Grupos'}
                      </span>
                      <span className="chip chip-xs">{reaction.chance}%</span>
                      {reaction.removeAfterSeconds ? (
                        <span className="chip chip-xs">se quita en {reaction.removeAfterSeconds}s</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="reaction-actions">
                    <button
                      className={`switch-mini ${reaction.enabled ? 'is-on' : ''}`}
                      onClick={() => toggleReaction(reaction)}
                      role="switch"
                      aria-checked={reaction.enabled}
                      aria-label="Activar reacción"
                    />
                    <button className="icon-btn" onClick={() => setEditing({ ...reaction })} aria-label="Editar">
                      <Icon name="settings" size={16} />
                    </button>
                    <button className="icon-btn" onClick={() => setDeleting(reaction)} aria-label="Eliminar">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="col-side">
        <Card className="sticky-card">
          <CardHeader icon="eye" title="Cómo se ve" />
          <div className="preview-chat compact">
            <div className="bubble-row is-user">
              <div className="bubble bubble-user">
                <div className="bubble-text">Hola, ¿me pasás los horarios?</div>
                <span className="bubble-meta">14:32</span>
                <span className="bubble-reaction">{auto.emojis?.[0] || '👍'}</span>
              </div>
            </div>
            <div className="bubble-row is-user">
              <div className="bubble bubble-user">
                <div className="bubble-text">¡Muchas gracias!</div>
                <span className="bubble-meta">14:33</span>
                <span className="bubble-reaction">❤️</span>
              </div>
            </div>
          </div>
          <div className="divider" />
          <h4 className="side-title">Buenas prácticas</h4>
          <ul className="tips">
            <li>Una reacción por mensaje: WhatsApp reemplaza la anterior.</li>
            <li>Evitá el 100% en grupos grandes para no parecer un bot invasivo.</li>
            <li>En Microsoft Teams la API no permite reaccionar: las reacciones son solo de WhatsApp.</li>
          </ul>
        </Card>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar reacción' : 'Nueva reacción'}
        subtitle="Definí cuándo reaccionar y con qué emoji."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button icon="check" onClick={saveReaction}>
              Guardar
            </Button>
          </>
        }
      >
        {editing ? (
          <>
            <div className="form-row">
              <Field label="Nombre">
                <Input
                  value={editing.name}
                  maxLength={60}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <Field label="Emoji">
                <div className="emoji-field">
                  <button
                    type="button"
                    className="emoji-trigger"
                    onClick={() => setEmojiOpen(emojiOpen ? null : 'modal')}
                  >
                    {editing.emoji}
                  </button>
                  <Input
                    value={editing.emoji}
                    maxLength={4}
                    onChange={(e) => setEditing({ ...editing, emoji: e.target.value })}
                    aria-label="Emoji"
                  />
                  {emojiOpen ? (
                    <EmojiPicker
                      value={editing.emoji}
                      onChange={(emoji) => setEditing({ ...editing, emoji })}
                      onClose={() => setEmojiOpen(null)}
                    />
                  ) : null}
                </div>
              </Field>
            </div>

            <Field label="Cuándo reaccionar">
              <Select
                value={editing.on}
                onChange={(e) => setEditing({ ...editing, on: e.target.value })}
              >
                {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="help-text">{CONDITION_HELP[editing.on]}</p>

            {['keyword', 'command', 'regex'].includes(editing.on) ? (
              <Field label={editing.on === 'regex' ? 'Expresión regular' : 'Palabras o comandos'}>
                <Input
                  value={editing.pattern}
                  onChange={(e) => setEditing({ ...editing, pattern: e.target.value })}
                  placeholder={editing.on === 'regex' ? '^(hola|buenas)' : 'gracias, genial'}
                />
              </Field>
            ) : null}

            <div className="form-row">
              <Field label="Alcance">
                <Select
                  value={editing.scope}
                  onChange={(e) => setEditing({ ...editing, scope: e.target.value })}
                >
                  <option value="all">Todos los chats</option>
                  <option value="dm">Solo privados</option>
                  <option value="group">Solo grupos</option>
                </Select>
              </Field>
              <Field label="Probabilidad (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.chance}
                  onChange={(e) => setEditing({ ...editing, chance: Number(e.target.value) })}
                />
              </Field>
              <Field label="Quitar después de (s)">
                <Input
                  type="number"
                  min={0}
                  max={3600}
                  value={editing.removeAfterSeconds}
                  onChange={(e) =>
                    setEditing({ ...editing, removeAfterSeconds: Number(e.target.value) })
                  }
                />
              </Field>
            </div>

            <Toggle
              checked={editing.enabled}
              onChange={(value) => setEditing({ ...editing, enabled: value })}
              label="Reacción activa"
            />
          </>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Eliminar reacción"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="danger" icon="trash" onClick={remove}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="modal-text">Se eliminará «{deleting?.name}».</p>
      </Modal>
    </div>
  );
}
