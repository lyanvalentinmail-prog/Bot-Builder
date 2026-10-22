import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { previewText, waMarkupToHtml } from '../../lib/vars.js';
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
  Textarea,
  Toggle,
} from '../../components/ui.jsx';

const MATCH_LABELS = {
  command: 'Comando con prefijo (!menu)',
  exact: 'Frase exacta',
  startsWith: 'Empieza con…',
  contains: 'Contiene…',
  regex: 'Expresión regular',
  any: 'Cualquier mensaje',
};

const MATCH_HELP = {
  command: 'Se activa con el prefijo del bot, por ejemplo !menu o !menu algo.',
  exact: 'Todo el mensaje debe coincidir exactamente. No hace falta el prefijo (aunque también lo acepta).',
  startsWith: 'El mensaje debe empezar con el disparador. Funciona con o sin prefijo.',
  contains: 'Se activa si el texto aparece en cualquier parte del mensaje.',
  regex: 'Usá una expresión regular de JavaScript. Ej: ^pedido \\d+$',
  any: 'Responde siempre. Útil para respuestas de respaldo.',
};

const REPLY_LABELS = {
  text: 'Texto',
  random: 'Frase al azar',
  image: 'Imagen con texto',
  buttons: 'Botones',
  none: 'Solo reacción',
};

const MAX = { commands: 60, variants: 20, buttons: 10, aliases: 10 };

const blankCommand = () => ({
  name: 'Nuevo comando',
  description: '',
  trigger: 'nuevo',
  aliases: [],
  matchType: 'command',
  enabled: true,
  scope: 'all',
  caseSensitive: false,
  cooldownSeconds: 0,
  showInMenu: true,
  reaction: { enabled: false, emoji: '👍', removeAfterSeconds: 0 },
  reply: {
    type: 'text',
    text: '',
    variants: [],
    imageUrl: '',
    caption: '',
    buttons: [],
    footer: '',
    delayMs: 600,
    editAfterMs: 0,
    editText: '',
  },
});

export default function CommandsTab({ bot, setBot, meta, notify, onBotReload }) {
  const [selectedId, setSelectedId] = useState(bot.commands[0]?.id || null);
  const [draft, setDraft] = useState(() => bot.commands[0] || blankCommand());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const textRef = useRef(null);

  const selected = useMemo(
    () => bot.commands.find((c) => c.id === selectedId) || null,
    [bot.commands, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      if (bot.commands.length) setSelectedId(bot.commands[0].id);
      else setDraft(blankCommand());
      return;
    }
    setDraft(structuredClone(selected));
    setTestResult(null);
  }, [selectedId, bot.updatedAt]);

  useEffect(() => {
    if (!bot.commands.length) setSelectedId(null);
  }, [bot.commands.length]);

  const filtered = bot.commands.filter((command) => {
    const q = search.toLowerCase();
    return (
      !q ||
      command.name.toLowerCase().includes(q) ||
      command.trigger.toLowerCase().includes(q) ||
      (command.aliases || []).some((a) => a.toLowerCase().includes(q))
    );
  });

  const dirty = selected ? JSON.stringify(draft) !== JSON.stringify(selected) : false;

  const update = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const updateReply = (patch) => setDraft((prev) => ({ ...prev, reply: { ...prev.reply, ...patch } }));
  const updateReaction = (patch) =>
    setDraft((prev) => ({ ...prev, reaction: { ...prev.reaction, ...patch } }));

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { command, bot: updated } = await api.put(
        `/bots/${bot.id}/commands/${selected.id}`,
        draft,
      );
      setBot(updated);
      setDraft(structuredClone(command));
      setSavedAt(Date.now());
      notify('Comando guardado');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (command) => {
    try {
      const { bot: updated } = await api.put(`/bots/${bot.id}/commands/${command.id}`, {
        ...command,
        enabled: !command.enabled,
      });
      setBot(updated);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const create = async () => {
    const trigger =
      newTrigger.trim() ||
      newName
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    if (!trigger) {
      notify('Escribí un nombre o un disparador', 'error');
      return;
    }
    if (bot.commands.some((c) => c.trigger.toLowerCase() === trigger.toLowerCase())) {
      notify('Ya existe un comando con ese disparador', 'error');
      return;
    }
    try {
      const { command, bot: updated } = await api.post(`/bots/${bot.id}/commands`, {
        ...blankCommand(),
        name: newName.trim() || 'Nuevo comando',
        trigger,
        reply: {
          ...blankCommand().reply,
          text: `Hola {{nombre}} 👋 Soy *{{bot}}* y respondo a *${bot.settings.prefix}${trigger}*.`,
        },
      });
      setBot(updated);
      setSelectedId(command.id);
      setCreating(false);
      setNewName('');
      setNewTrigger('');
      notify('Comando creado');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const duplicate = async () => {
    if (!selected) return;
    try {
      const { command, bot: updated } = await api.post(
        `/bots/${bot.id}/commands/${selected.id}/duplicate`,
      );
      setBot(updated);
      setSelectedId(command.id);
      notify('Comando duplicado');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const remove = async () => {
    try {
      await api.del(`/bots/${bot.id}/commands/${deleting.id}`);
      const data = await api.get(`/bots/${bot.id}`);
      setBot(data.bot);
      setDeleting(null);
      notify('Comando eliminado');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const insertVariable = (variable) => {
    const el = textRef.current;
    const token = `{{${variable}}}`;
    if (!el) {
      updateReply({ text: `${draft.reply.text}${token}` });
      return;
    }
    const start = el.selectionStart ?? draft.reply.text.length;
    const end = el.selectionEnd ?? start;
    const next = `${draft.reply.text.slice(0, start)}${token}${draft.reply.text.slice(end)}`;
    updateReply({ text: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const runTest = async () => {
    if (!selected) return;
    setTesting(true);
    try {
      const sample =
        draft.matchType === 'command'
          ? `${bot.settings.prefix}${draft.trigger}`
          : draft.matchType === 'regex'
            ? draft.trigger
            : draft.trigger;
      const res = await api.post(`/bots/${bot.id}/simulate`, { text: sample, name: 'Ana' });
      setTestResult(res);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const previewReply = useMemo(() => {
    if (!draft) return '';
    const vars = { prefix: bot.settings.prefix, bot: bot.name, nombre: 'Ana' };
    if (draft.reply.type === 'random') {
      return previewText(draft.reply.variants?.[0] || '', { texts: bot.texts, vars });
    }
    if (draft.reply.type === 'image') {
      return previewText(draft.reply.caption || draft.reply.text || '', { texts: bot.texts, vars });
    }
    return previewText(draft.reply.text || '', { texts: bot.texts, vars });
  }, [draft, bot]);

  return (
    <div className="commands-layout">
      <Card className="command-list-card">
        <div className="command-list-head">
          <div className="search-box">
            <Icon name="search" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar comando…"
              aria-label="Buscar comando"
            />
          </div>
          <Button
            size="sm"
            icon="plus"
            onClick={() => setCreating(true)}
            disabled={bot.commands.length >= MAX.commands}
          >
            Nuevo
          </Button>
        </div>

        <div className="command-list">
          {filtered.map((command) => (
            <button
              key={command.id}
              className={`command-item ${command.id === selectedId ? 'is-active' : ''} ${
                command.enabled ? '' : 'is-off'
              }`}
              onClick={() => setSelectedId(command.id)}
            >
              <span className="command-reaction">{command.reaction?.enabled ? command.reaction.emoji : '•'}</span>
              <span className="command-item-body">
                <span className="command-item-name">{command.name}</span>
                <span className="command-item-trigger">
                  {command.matchType === 'command'
                    ? `${bot.settings.prefix}${command.trigger}`
                    : command.trigger}
                </span>
              </span>
              <span
                className={`switch-mini ${command.enabled ? 'is-on' : ''}`}
                title={command.enabled ? 'Activo' : 'Desactivado'}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEnabled(command);
                }}
                role="switch"
                aria-checked={command.enabled}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleEnabled(command)}
              />
            </button>
          ))}
          {!filtered.length ? (
            <div className="muted small pad">No hay comandos que coincidan.</div>
          ) : null}
        </div>

        <div className="command-list-foot">
          <span className="muted small">
            {bot.commands.filter((c) => c.enabled).length} de {bot.commands.length} activos
          </span>
          <span className="muted small">Máx. {MAX.commands}</span>
        </div>
      </Card>

      {selected ? (
        <Card className="command-editor">
          <CardHeader
            icon="command"
            title={draft.name || 'Comando'}
            subtitle={`Usado ${selected.usageCount || 0} veces`}
            actions={
              <div className="editor-actions">
                <Button variant="ghost" size="sm" icon="play" onClick={runTest} loading={testing}>
                  Probar
                </Button>
                <Button variant="ghost" size="sm" icon="copy" onClick={duplicate} title="Duplicar" />
                <Button
                  variant="ghost"
                  size="sm"
                  icon="trash"
                  onClick={() => setDeleting(selected)}
                  title="Eliminar"
                />
                <Button size="sm" icon="check" onClick={save} loading={saving} disabled={!dirty}>
                  {dirty ? 'Guardar' : 'Guardado'}
                </Button>
              </div>
            }
          />

          <div className="editor-scroll">
            <div className="editor-section">
              <div className="form-row">
                <Field label="Nombre del comando" hint="Solo para organizarte">
                  <Input value={draft.name} maxLength={80} onChange={(e) => update({ name: e.target.value })} />
                </Field>
                <Field label="Descripción" hint="Aparece en el menú de ayuda">
                  <Input
                    value={draft.description}
                    maxLength={240}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="Qué hace este comando"
                  />
                </Field>
              </div>

              <div className="form-row">
                <Field label="Disparador" hint="El texto que activa el comando">
                  <Input
                    value={draft.trigger}
                    maxLength={120}
                    onChange={(e) => update({ trigger: e.target.value })}
                    placeholder="menu"
                  />
                </Field>
                <Field label="Tipo de coincidencia">
                  <Select
                    value={draft.matchType}
                    onChange={(e) => update({ matchType: e.target.value })}
                  >
                    {Object.entries(MATCH_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Dónde responde">
                  <Select value={draft.scope} onChange={(e) => update({ scope: e.target.value })}>
                    <option value="all">Todos los chats</option>
                    <option value="dm">Solo privados</option>
                    <option value="group">Solo grupos</option>
                  </Select>
                </Field>
              </div>
              <p className="help-text">{MATCH_HELP[draft.matchType]}</p>

              <Field
                label="Alias"
                hint="Separados por coma. Ej: help, ayuda, comandos"
              >
                <Input
                  value={(draft.aliases || []).join(', ')}
                  onChange={(e) =>
                    update({
                      aliases: e.target.value
                        .split(',')
                        .map((a) => a.trim())
                        .filter(Boolean)
                        .slice(0, MAX.aliases),
                    })
                  }
                  placeholder="help, ayuda"
                />
              </Field>

              <div className="form-row form-row-compact">
                <Field label="Enfriamiento (segundos)" hint="Evita respuestas repetidas">
                  <Input
                    type="number"
                    min={0}
                    max={86400}
                    value={draft.cooldownSeconds}
                    onChange={(e) => update({ cooldownSeconds: Number(e.target.value) })}
                  />
                </Field>
                <div className="stack-toggles">
                  <Toggle
                    checked={draft.enabled}
                    onChange={(value) => update({ enabled: value })}
                    label="Comando activo"
                  />
                  <Toggle
                    checked={draft.showInMenu}
                    onChange={(value) => update({ showInMenu: value })}
                    label="Mostrar en el menú"
                  />
                  <Toggle
                    checked={draft.caseSensitive}
                    onChange={(value) => update({ caseSensitive: value })}
                    label="Distinguir mayúsculas"
                  />
                </div>
              </div>
            </div>

            <div className="editor-section">
              <div className="section-title">
                <h4>
                  <Icon name="smile" size={16} /> Reacción al mensaje
                </h4>
              </div>
              <div className="reaction-inline">
                <Toggle
                  checked={draft.reaction?.enabled}
                  onChange={(value) => updateReaction({ enabled: value })}
                  label="Reaccionar con un emoji"
                  description="WhatsApp muestra la reacción en el mensaje recibido."
                />
                <div className="reaction-picker">
                  <button
                    type="button"
                    className="emoji-trigger"
                    onClick={() => setEmojiOpen((v) => !v)}
                    disabled={!draft.reaction?.enabled}
                  >
                    {draft.reaction?.emoji || '👍'}
                  </button>
                  {emojiOpen ? (
                    <EmojiPicker
                      value={draft.reaction?.emoji}
                      onChange={(emoji) => updateReaction({ emoji })}
                      onClose={() => setEmojiOpen(false)}
                    />
                  ) : null}
                  <Field label="Quitar después de (s)" hint="0 = permanente">
                    <Input
                      type="number"
                      min={0}
                      max={3600}
                      value={draft.reaction?.removeAfterSeconds ?? 0}
                      onChange={(e) => updateReaction({ removeAfterSeconds: Number(e.target.value) })}
                      disabled={!draft.reaction?.enabled}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="editor-section">
              <div className="section-title">
                <h4>
                  <Icon name="text" size={16} /> Respuesta
                </h4>
                <div className="segmented">
                  {Object.entries(REPLY_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      className={draft.reply.type === value ? 'is-active' : ''}
                      onClick={() => updateReply({ type: value })}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {(draft.reply.type === 'text' || draft.reply.type === 'buttons') && (
                <>
                  <Field label="Texto de la respuesta">
                    <Textarea
                      ref={textRef}
                      rows={5}
                      value={draft.reply.text}
                      onChange={(e) => updateReply({ text: e.target.value })}
                      placeholder="Hola {{nombre}} 👋 Escribí {{prefix}}menu para ver las opciones."
                    />
                  </Field>
                  <div className="var-chips">
                    <span className="muted small">Insertar:</span>
                    {(meta?.variables || [])
                      .filter((v) => v.key !== 'texto:slug')
                      .map((variable) => (
                        <button
                          key={variable.key}
                          type="button"
                          className="var-chip"
                          onClick={() => insertVariable(variable.key)}
                          title={variable.label}
                        >
                          {`{{${variable.key}}}`}
                        </button>
                      ))}
                    {(bot.texts || []).map((text) => (
                      <button
                        key={text.id}
                        type="button"
                        className="var-chip var-chip-text"
                        onClick={() => insertVariable(`texto:${text.slug}`)}
                        title={text.name}
                      >
                        {`{{texto:${text.slug}}}`}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {draft.reply.type === 'random' && (
                <div className="variant-list">
                  {(draft.reply.variants || []).map((variant, index) => (
                    <div className="variant-row" key={index}>
                      <span className="variant-index">{index + 1}</span>
                      <Input
                        value={variant}
                        onChange={(e) => {
                          const next = [...draft.reply.variants];
                          next[index] = e.target.value;
                          updateReply({ variants: next });
                        }}
                        placeholder="¡Hola {{nombre}}! 👋"
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() =>
                          updateReply({ variants: draft.reply.variants.filter((_, i) => i !== index) })
                        }
                        aria-label="Quitar frase"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="plus"
                    onClick={() =>
                      updateReply({ variants: [...(draft.reply.variants || []), ''] })
                    }
                    disabled={(draft.reply.variants || []).length >= MAX.variants}
                  >
                    Agregar frase
                  </Button>
                  <p className="help-text">
                    El bot elige una frase al azar cada vez que se activa el comando.
                  </p>
                </div>
              )}

              {draft.reply.type === 'image' && (
                <>
                  <Field label="URL de la imagen" hint="Debe ser un enlace público (JPG, PNG)">
                    <Input
                      value={draft.reply.imageUrl}
                      onChange={(e) => updateReply({ imageUrl: e.target.value })}
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </Field>
                  <Field label="Texto debajo de la imagen">
                    <Textarea
                      rows={3}
                      value={draft.reply.caption}
                      onChange={(e) => updateReply({ caption: e.target.value })}
                    />
                  </Field>
                </>
              )}

              {draft.reply.type === 'buttons' && (
                <div className="buttons-editor">
                  <span className="field-label">Botones (máx. {MAX.buttons})</span>
                  {(draft.reply.buttons || []).map((button, index) => (
                    <div className="button-row" key={index}>
                      <Input
                        value={button.label}
                        onChange={(e) => {
                          const next = [...draft.reply.buttons];
                          next[index] = { ...next[index], label: e.target.value };
                          updateReply({ buttons: next });
                        }}
                        placeholder="Etiqueta"
                        maxLength={40}
                      />
                      <Input
                        value={button.command}
                        onChange={(e) => {
                          const next = [...draft.reply.buttons];
                          next[index] = { ...next[index], command: e.target.value };
                          updateReply({ buttons: next });
                        }}
                        placeholder="!menu"
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() =>
                          updateReply({ buttons: draft.reply.buttons.filter((_, i) => i !== index) })
                        }
                        aria-label="Quitar botón"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="plus"
                    onClick={() =>
                      updateReply({ buttons: [...(draft.reply.buttons || []), { label: '', command: '' }] })
                    }
                    disabled={(draft.reply.buttons || []).length >= MAX.buttons}
                  >
                    Agregar botón
                  </Button>
                  <Field label="Pie de los botones">
                    <Input
                      value={draft.reply.footer}
                      onChange={(e) => updateReply({ footer: e.target.value })}
                      placeholder="Elegí una opción"
                    />
                  </Field>
                </div>
              )}

              <div className="form-row form-row-compact">
                <Field label="Retardo antes de responder (ms)" hint="Simula escritura natural">
                  <Input
                    type="number"
                    min={0}
                    max={15000}
                    step={100}
                    value={draft.reply.delayMs}
                    onChange={(e) => updateReply({ delayMs: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Editar la respuesta después de (ms)" hint="0 = no editar">
                  <Input
                    type="number"
                    min={0}
                    max={120000}
                    step={1000}
                    value={draft.reply.editAfterMs ?? 0}
                    onChange={(e) => updateReply({ editAfterMs: Number(e.target.value) })}
                  />
                </Field>
                {draft.reply.editAfterMs > 0 ? (
                  <Field label="Texto editado">
                    <Input
                      value={draft.reply.editText || ''}
                      onChange={(e) => updateReply({ editText: e.target.value })}
                      placeholder="Texto que reemplaza al anterior"
                    />
                  </Field>
                ) : null}
              </div>
            </div>

            <div className="editor-section preview-section">
              <div className="section-title">
                <h4>
                  <Icon name="eye" size={16} /> Vista previa
                </h4>
                {savedAt ? <span className="muted small">Guardado ✓</span> : null}
              </div>

              <div className="preview-chat">
                <div className="bubble-row is-user">
                  <div className="bubble bubble-user">
                    <div className="bubble-text">
                      <code>
                        {draft.matchType === 'command'
                          ? `${bot.settings.prefix}${draft.trigger}`
                          : draft.trigger}
                      </code>
                    </div>
                    <span className="bubble-meta">14:32</span>
                    {draft.reaction?.enabled ? (
                      <span className="bubble-reaction">{draft.reaction.emoji}</span>
                    ) : null}
                  </div>
                </div>

                {draft.reply.type !== 'none' ? (
                  <div className="bubble-row is-bot">
                    <div className="bubble bubble-bot">
                      {draft.reply.type === 'image' && draft.reply.imageUrl ? (
                        <img className="bubble-img" src={draft.reply.imageUrl} alt="Vista previa" />
                      ) : null}
                      <div
                        className="bubble-text"
                        dangerouslySetInnerHTML={{
                          __html: waMarkupToHtml(
                            previewReply || 'La respuesta aparecerá acá…',
                          ),
                        }}
                      />
                      {draft.reply.type === 'buttons' && draft.reply.buttons?.length ? (
                        <div className="bubble-buttons">
                          {draft.reply.buttons.map((button, index) => (
                            <span className="bubble-button" key={index}>
                              {button.label || `Botón ${index + 1}`}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {draft.reply.footer ? <div className="bubble-note">{draft.reply.footer}</div> : null}
                      <span className="bubble-meta">14:32 ✓✓</span>
                    </div>
                  </div>
                ) : (
                  <p className="muted small">Este comando solo reacciona, no envía texto.</p>
                )}
              </div>

              {testResult ? (
                <div className="test-result">
                  <div className="test-result-head">
                    <strong>Resultado de la prueba</strong>
                    <span className={`chip ${testResult.matched ? 'chip-ok' : 'chip-warn'}`}>
                      {testResult.matched ? 'Coincide' : 'No coincide'}
                    </span>
                  </div>
                  <ul>
                    <li>
                      Mensaje probado: <code>{testResult.input.text}</code>
                    </li>
                    <li>
                      Comando detectado: <strong>{testResult.command?.name || 'ninguno'}</strong>
                    </li>
                    <li>
                      Reacciones: {testResult.reactions?.length
                        ? testResult.reactions.map((r) => r.emoji).join(' ')
                        : 'ninguna'}
                    </li>
                    <li>
                      Respuestas: {testResult.actions?.length
                        ? testResult.actions.map((a) => a.kind).join(', ')
                        : 'ninguna'}
                    </li>
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="command-editor">
          <EmptyState
            icon="command"
            title="Creá tu primer comando"
            description="Los comandos son las palabras que activan las respuestas del bot."
            action={
              <Button icon="plus" onClick={() => setCreating(true)}>
                Nuevo comando
              </Button>
            }
          />
        </Card>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nuevo comando"
        subtitle="Después podés ajustar la respuesta, la reacción y el alcance."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button icon="plus" onClick={create}>
              Crear comando
            </Button>
          </>
        }
      >
        <Field label="Nombre">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Precios" />
        </Field>
        <Field label="Disparador" hint={`Se usará como ${bot.settings.prefix}disparador`}>
          <Input
            value={newTrigger}
            onChange={(e) => setNewTrigger(e.target.value)}
            placeholder="precios"
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Eliminar comando"
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
        <p className="modal-text">Se eliminará «{deleting?.name}» de este bot.</p>
      </Modal>
    </div>
  );
}
