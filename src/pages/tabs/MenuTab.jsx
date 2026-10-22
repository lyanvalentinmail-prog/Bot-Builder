import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import {
  Button,
  Card,
  CardHeader,
  CopyButton,
  Field,
  Icon,
  Input,
  Textarea,
  Toggle,
} from '../../components/ui.jsx';

const FALLBACK_PARAMS = [
  { key: 'usuario', label: 'Usuario', hint: 'Nombre de quien escribe' },
  { key: 'bot', label: 'Nombre del bot', hint: 'Nombre configurado' },
  { key: 'equipo', label: 'Equipo', hint: 'Texto libre' },
  { key: 'prefijo', label: 'Prefijo', hint: 'Prefijo de comandos' },
  { key: 'estado', label: 'Estado', hint: 'En línea o activo' },
  { key: 'version', label: 'Versión', hint: 'Versión de BotForge' },
  { key: 'grupo', label: 'Grupo', hint: 'Grupo donde escriben' },
  { key: 'hora', label: 'Hora', hint: 'Hora del mensaje' },
  { key: 'fecha', label: 'Fecha', hint: 'Fecha del mensaje' },
  { key: 'comando', label: 'Comando usado', hint: 'Comando que disparó el menú' },
  { key: 'total', label: 'Total', hint: 'Comandos visibles' },
  { key: 'ayuda', label: 'Ayuda', hint: 'Atajo a la ayuda' },
  { key: 'comandos', label: 'Bloque de comandos', hint: 'Lista agrupada de comandos' },
];

const escapeHtml = (value = '') =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Resalta comandos y parámetros mientras se escribe el menú manual. */
function highlightMenu(text, triggers, prefix) {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}([\\p{L}\\p{N}_-]+)`, 'u');
  return escapeHtml(text)
    .split('\n')
    .map((line) => {
      let out = line.replace(/\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}/g, '<span class="tok-param">$&</span>');
      const match = line.trim().match(pattern);
      if (match) {
        const known = triggers.has(match[1].toLowerCase());
        out = `<span class="${known ? 'tok-command' : 'tok-missing'}">${out}</span>`;
      }
      if (/^[\s]*[━─╭╰「]/.test(line)) return `<span class="tok-rule">${out}</span>`;
      return out || ' ';
    })
    .join('\n');
}

export default function MenuTab({ bot, setBot, meta, notify }) {
  const [draft, setDraft] = useState(bot.menu);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState({ text: '', banner: '', commands: [], missing: [] });
  const [previewing, setPreviewing] = useState(false);
  const areaRef = useRef(null);

  const params = meta?.menu?.params || FALLBACK_PARAMS;
  const prefix = bot.settings?.prefix || '.';
  const triggers = useMemo(
    () => new Set((bot.commands || []).map((command) => command.trigger.toLowerCase())),
    [bot.commands],
  );
  const menuCommands = useMemo(
    () =>
      (bot.commands || []).filter(
        (command) => command.reply?.type !== 'menu' && command.showInMenu !== false,
      ),
    [bot.commands],
  );

  useEffect(() => {
    setDraft(bot.menu);
  }, [bot.updatedAt]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(bot.menu), [draft, bot.menu]);

  const update = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const updateInfo = (id, patch) =>
    setDraft((prev) => ({
      ...prev,
      info: prev.info.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));

  // Vista previa real: el mismo código que arma el mensaje del bot.
  useEffect(() => {
    if (!draft) return undefined;
    let cancelled = false;
    setPreviewing(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api.post(`/bots/${bot.id}/menu/preview`, {
          menu: draft,
          name: 'Ana',
          groupName: 'Equipo Ventas',
        });
        if (!cancelled) setPreview(data);
      } catch (error) {
        if (!cancelled) notify(error.message, 'error');
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, bot.id]);

  const save = async () => {
    setSaving(true);
    try {
      const { bot: updated } = await api.put(`/bots/${bot.id}/menu`, draft);
      setBot(updated);
      setDraft(updated.menu);
      notify('Menú guardado');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    try {
      const { bot: updated } = await api.post(`/bots/${bot.id}/menu/reset`);
      setBot(updated);
      setDraft(updated.menu);
      notify('Menú restaurado');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const insertAtCursor = useCallback(
    (token) => {
      setDraft((prev) => {
        const current = prev.custom || '';
        const el = areaRef.current;
        if (!el) return { ...prev, custom: `${current}${token}` };
        const start = el.selectionStart ?? current.length;
        const end = el.selectionEnd ?? start;
        const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(start + token.length, start + token.length);
        });
        return { ...prev, custom: next };
      });
    },
    [],
  );

  const insertCommand = (command) => {
    const block = `${prefix}${command.trigger}${
      command.description ? `\n> ${command.description}` : ''
    }\n`;
    insertAtCursor(`${block}\n`);
  };

  const detected = preview.commands || [];
  const missing = preview.missing || [];
  const detectedTriggers = new Set(detected.filter((item) => item.found).map((item) => item.trigger.toLowerCase()));

  if (!draft) return null;

  return (
    <div className="two-col menu-layout">
      <div className="col-main">
        <Card>
          <CardHeader
            icon="menu"
            title="Menú de comandos"
            subtitle="Es lo que el bot envía al recibir el comando de menú. Todo es editable."
            badge={<span className="chip chip-xs">{menuCommands.length} comandos</span>}
            actions={
              <div className="editor-actions">
                <Button variant="ghost" size="sm" icon="refresh" onClick={reset}>
                  Restaurar
                </Button>
                <Button size="sm" icon="check" onClick={save} loading={saving} disabled={!dirty}>
                  {dirty ? 'Guardar' : 'Guardado'}
                </Button>
              </div>
            }
          />

          <div className="menu-banner-row">
            <Field
              label="Banner"
              hint="Imagen que carga junto con el menú (URL pública JPG o PNG)"
            >
              <Input
                value={draft.banner}
                onChange={(event) => update({ banner: event.target.value })}
                placeholder="https://…/banner.jpg"
                inputMode="url"
              />
            </Field>
            {draft.banner ? (
              <button
                type="button"
                className="menu-banner-thumb"
                onClick={() => update({ banner: '' })}
                title="Quitar banner"
              >
                <img src={draft.banner} alt="Banner del menú" />
                <span>
                  <Icon name="x" size={13} /> Quitar
                </span>
              </button>
            ) : (
              <div className="menu-banner-empty">
                <Icon name="image" size={20} />
                <span>Sin banner</span>
              </div>
            )}
          </div>

          <div className="menu-mode">
            <button
              type="button"
              className={`menu-mode-btn ${draft.mode === 'auto' ? 'is-active' : ''}`}
              onClick={() => update({ mode: 'auto' })}
            >
              <Icon name="grid" size={16} />
              <span>
                <strong>Automático</strong>
                <small>Se arma con los comandos y sus categorías.</small>
              </span>
            </button>
            <button
              type="button"
              className={`menu-mode-btn ${draft.mode === 'manual' ? 'is-active' : ''}`}
              onClick={() => update({ mode: 'manual' })}
            >
              <Icon name="terminal" size={16} />
              <span>
                <strong>Manual</strong>
                <small>Escribís el menú y detecta los comandos.</small>
              </span>
            </button>
          </div>

          <div className="form-row">
            <Field label="Título">
              <Input
                value={draft.title}
                maxLength={60}
                onChange={(event) => update({ title: event.target.value })}
              />
            </Field>
            <Field label="Equipo" hint="Se usa con {equipo}">
              <Input
                value={draft.team}
                maxLength={40}
                onChange={(event) => update({ team: event.target.value })}
              />
            </Field>
            <Field label="Pie del menú">
              <Input
                value={draft.footer}
                maxLength={60}
                onChange={(event) => update({ footer: event.target.value })}
              />
            </Field>
          </div>

          <div className="stack-toggles">
            <Toggle
              checked={draft.showHeader}
              onChange={(value) => update({ showHeader: value })}
              label="Marco del título"
              description="Las líneas ╭───╮ que enmarcan MENÚ DE COMANDOS."
            />
            <Toggle
              checked={draft.showCategories}
              onChange={(value) => update({ showCategories: value })}
              label="Separar por categorías"
              description="Agrupa con 「 01 | DESCARGAS 」 y sus separadores."
            />
            <Toggle
              checked={draft.showDescriptions}
              onChange={(value) => update({ showDescriptions: value })}
              label="Mostrar descripciones"
              description="La línea > debajo de cada comando."
            />
          </div>
        </Card>

        {draft.mode === 'manual' ? (
          <Card>
            <CardHeader
              icon="terminal"
              title="Menú manual"
              subtitle="Escribí el menú. Los comandos reales se marcan en violeta y los inexistentes en rojo."
              actions={
                <Button
                  size="sm"
                  variant="ghost"
                  icon="sparkles"
                  onClick={() => insertAtCursor('\n{comandos}\n')}
                >
                  Insertar comandos
                </Button>
              }
            />
            <div className="menu-editor">
              <pre
                className="menu-editor-highlight"
                aria-hidden="true"
                dangerouslySetInnerHTML={{
                  __html: highlightMenu(draft.custom || '', triggers, prefix),
                }}
              />
              <textarea
                ref={areaRef}
                className="menu-editor-input"
                value={draft.custom}
                spellCheck={false}
                onChange={(event) => update({ custom: event.target.value })}
                placeholder={`╭────────────────────╮\n   MENÚ DE COMANDOS\n╰────────────────────╯\n\nHola {usuario} 👋 Estás en {grupo}.\nEscribí ${prefix}tiktok con un enlace para empezar.`}
              />
            </div>

            <div className="var-chips">
              <span className="muted small">Parámetros:</span>
              {params.map((param) => (
                <button
                  key={param.key}
                  type="button"
                  className="var-chip"
                  title={param.hint}
                  onClick={() => insertAtCursor(`{${param.key}}`)}
                >
                  {`{${param.key}}`}
                </button>
              ))}
            </div>

            <div className="menu-command-picker">
              <span className="muted small">Agregar comando al texto:</span>
              <div className="menu-command-list">
                {menuCommands.map((command) => {
                  const used = detectedTriggers.has(command.trigger.toLowerCase());
                  return (
                    <button
                      key={command.id}
                      type="button"
                      className={`menu-command-chip ${used ? 'is-used' : ''}`}
                      onClick={() => insertCommand(command)}
                    >
                      <code>
                        {prefix}
                        {command.trigger}
                      </code>
                      {used ? <Icon name="check" size={12} /> : <Icon name="plus" size={12} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        ) : null}

        <Card>
          <CardHeader
            icon="info"
            title="Datos del menú"
            subtitle="Cada fila es una línea del bloque de información."
            actions={
              <Button
                size="sm"
                variant="ghost"
                icon="plus"
                onClick={() =>
                  update({
                    info: [
                      ...draft.info,
                      { id: `mi_${Date.now()}`, label: 'Nuevo', value: '{usuario}' },
                    ].slice(0, 10),
                  })
                }
                disabled={draft.info.length >= 10}
              >
                Agregar fila
              </Button>
            }
          />
          <div className="menu-info-list">
            {draft.info.map((item) => (
              <div className="menu-info-row" key={item.id}>
                <Input
                  className="menu-info-label"
                  value={item.label}
                  maxLength={24}
                  placeholder="Nombre"
                  onChange={(event) => updateInfo(item.id, { label: event.target.value })}
                />
                <Input
                  className="menu-info-value"
                  value={item.value}
                  maxLength={400}
                  placeholder="{usuario}"
                  onChange={(event) => updateInfo(item.id, { value: event.target.value })}
                />
                <button
                  type="button"
                  className="icon-btn"
                  title="Quitar fila"
                  onClick={() =>
                    update({ info: draft.info.filter((row) => row.id !== item.id) })
                  }
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
            {!draft.info.length ? (
              <p className="muted small">Sin datos: el menú arranca directo con los comandos.</p>
            ) : null}
          </div>
          <div className="var-chips">
            {params
              .filter((param) => param.key !== 'comandos')
              .map((param) => (
                <span key={param.key} className="menu-param-tag" title={param.hint}>
                  {`{${param.key}}`}
                </span>
              ))}
          </div>
        </Card>
      </div>

      <div className="col-side">
        <Card className="sticky-card">
          <CardHeader
            icon="eye"
            title="Vista previa"
            subtitle={previewing ? 'Actualizando…' : 'Lo que recibe el grupo'}
            actions={<CopyButton text={preview.text || ''} label="Copiar" size="sm" />}
          />
          <div className="menu-preview">
            {preview.banner ? (
              <img className="menu-preview-banner" src={preview.banner} alt="Banner del menú" />
            ) : null}
            <pre className="menu-preview-text">{preview.text || 'Escribí el menú para verlo.'}</pre>
          </div>
          <div className="menu-preview-meta">
            <span>
              <Icon name="command" size={13} /> {preview.total ?? menuCommands.length} comandos
            </span>
            <span>
              <Icon name="grid" size={13} />{' '}
              {new Set(menuCommands.map((command) => command.category)).size} categorías
            </span>
          </div>
        </Card>

        <Card>
          <CardHeader
            icon="search"
            title="Comandos detectados"
            subtitle="Los que aparecen escritos en el menú."
          />
          <div className="menu-detected">
            {detected.length ? (
              detected.map((item) => (
                <span
                  key={item.trigger}
                  className={`menu-detected-chip ${item.found ? 'is-ok' : 'is-missing'}`}
                >
                  <code>
                    {prefix}
                    {item.trigger}
                  </code>
                  {item.found ? <Icon name="check" size={12} /> : <Icon name="x" size={12} />}
                </span>
              ))
            ) : (
              <p className="muted small">Todavía no hay comandos escritos en el menú.</p>
            )}
          </div>
          {missing.length ? (
            <div className="hint-box hint-warn">
              <Icon name="warning" size={15} />
              <span>
                {missing.length === 1
                  ? 'Hay un comando que no existe y no va a responder.'
                  : `Hay ${missing.length} comandos que no existen y no van a responder.`}
              </span>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
