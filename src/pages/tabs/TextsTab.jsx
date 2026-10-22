import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { previewText, waMarkupToHtml } from '../../lib/vars.js';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Icon,
  Input,
  Modal,
  Textarea,
} from '../../components/ui.jsx';

const slugify = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export default function TextsTab({ bot, setBot, notify }) {
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const areaRef = useRef(null);

  const selected = bot.texts.find((t) => t.id === selectedId) || null;

  useEffect(() => {
    setDraft(selected ? { ...selected } : null);
  }, [selectedId, bot.updatedAt]);

  const dirty = draft && selected ? JSON.stringify(draft) !== JSON.stringify(selected) : false;

  const usage = useMemo(() => {
    const map = {};
    for (const text of bot.texts) {
      const token = `{{texto:${text.slug}}}`;
      map[text.id] = bot.commands.filter((c) => JSON.stringify(c).includes(token)).length;
    }
    return map;
  }, [bot]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { bot: updated } = await api.put(`/bots/${bot.id}/texts/${draft.id}`, draft);
      setBot(updated);
      notify('Plantilla guardada');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    try {
      const { text, bot: updated } = await api.post(`/bots/${bot.id}/texts`, {
        name: newName || 'Nueva plantilla',
        slug: slugify(newName || 'nueva_plantilla'),
        content: 'Escribí acá el texto reutilizable. Podés usar {{nombre}} o {{prefix}}.',
      });
      setBot(updated);
      setSelectedId(text.id);
      setCreating(false);
      setNewName('');
      notify('Plantilla creada');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const remove = async () => {
    try {
      const { bot: updated } = await api.del(`/bots/${bot.id}/texts/${deleting.id}`);
      setBot(updated);
      setDeleting(null);
      if (deleting.id === selectedId) setSelectedId(null);
      notify('Plantilla eliminada');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const insert = (token) => {
    const el = areaRef.current;
    if (!el || !draft) {
      setDraft((prev) => ({ ...prev, content: `${prev?.content || ''}${token}` }));
      return;
    }
    const start = el.selectionStart ?? draft.content.length;
    const end = el.selectionEnd ?? start;
    const next = `${draft.content.slice(0, start)}${token}${draft.content.slice(end)}`;
    setDraft((prev) => ({ ...prev, content: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="two-col">
      <div className="col-main">
        <Card>
          <CardHeader
            icon="text"
            title="Plantillas de texto"
            subtitle="Textos reutilizables que podés insertar en cualquier comando."
            actions={
              <Button
                size="sm"
                icon="plus"
                onClick={() => setCreating(true)}
                disabled={bot.texts.length >= 40}
              >
                Nueva plantilla
              </Button>
            }
          />

          {!bot.texts.length ? (
            <EmptyState
              icon="text"
              title="Todavía no hay plantillas"
              description="Guardá horarios, direcciones o avisos para reutilizarlos con {{texto:slug}}."
              action={<Button icon="plus" onClick={() => setCreating(true)}>Crear plantilla</Button>}
            />
          ) : (
            <div className="text-list">
              {bot.texts.map((text) => (
                <button
                  key={text.id}
                  className={`text-item ${text.id === selectedId ? 'is-active' : ''}`}
                  onClick={() => setSelectedId(text.id)}
                >
                  <span className="text-item-icon">
                    <Icon name="text" size={16} />
                  </span>
                  <span className="text-item-body">
                    <span className="text-item-name">{text.name}</span>
                    <span className="text-item-preview">{text.content.slice(0, 90)}…</span>
                    <span className="text-item-tags">
                      <code>{`{{texto:${text.slug}}}`}</code>
                      {usage[text.id] ? <span className="chip chip-xs">{usage[text.id]} usos</span> : null}
                    </span>
                  </span>
                  <Icon name="chevron" size={15} />
                </button>
              ))}
            </div>
          )}
        </Card>

        {draft ? (
          <Card>
            <CardHeader
              icon="settings"
              title="Editar plantilla"
              actions={
                <div className="editor-actions">
                  <Button variant="ghost" size="sm" icon="trash" onClick={() => setDeleting(draft)} />
                  <Button size="sm" icon="check" onClick={save} loading={saving} disabled={!dirty}>
                    Guardar
                  </Button>
                </div>
              }
            />
            <div className="form-row">
              <Field label="Nombre">
                <Input
                  value={draft.name}
                  maxLength={80}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="Slug" hint="Se usa en {{texto:slug}}">
                <Input
                  value={draft.slug}
                  maxLength={60}
                  onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Descripción" hint="Para tu referencia, no se envía">
              <Input
                value={draft.description || ''}
                maxLength={200}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>
            <Field label="Contenido">
              <Textarea
                ref={areaRef}
                rows={7}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              />
            </Field>
            <div className="var-chips">
              <span className="muted small">Insertar:</span>
              {['nombre', 'bot', 'prefix', 'hora', 'fecha'].map((variable) => (
                <button
                  key={variable}
                  type="button"
                  className="var-chip"
                  onClick={() => insert(`{{${variable}}}`)}
                >
                  {`{{${variable}}}`}
                </button>
              ))}
              {bot.texts
                .filter((t) => t.id !== draft.id)
                .map((text) => (
                  <button
                    key={text.id}
                    type="button"
                    className="var-chip var-chip-text"
                    onClick={() => insert(`{{texto:${text.slug}}}`)}
                  >
                    {`{{texto:${text.slug}}}`}
                  </button>
                ))}
            </div>
            <p className="help-text">
              Usá *asteriscos* para negrita, _guiones bajos_ para itálica y ~virgulillas~ para tachar.
            </p>
          </Card>
        ) : null}
      </div>

      <div className="col-side">
        <Card className="sticky-card">
          <CardHeader icon="eye" title="Vista previa" subtitle="Con datos de ejemplo" />
          {draft ? (
            <div className="preview-chat compact">
              <div className="bubble-row is-bot">
                <div
                  className="bubble bubble-bot"
                  dangerouslySetInnerHTML={{
                    __html: waMarkupToHtml(
                      previewText(draft.content, {
                        texts: bot.texts,
                        vars: { prefix: bot.settings.prefix, bot: bot.name },
                      }) || 'La plantilla está vacía.',
                    ),
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="muted small">Elegí una plantilla para ver cómo queda.</p>
          )}
          <div className="divider" />
          <h4 className="side-title">Cómo se usa</h4>
          <p className="muted small">
            En cualquier respuesta escribí <code>{'{{texto:slug}}'}</code> y el bot reemplaza el
            texto completo. Podés combinar varias plantillas.
          </p>
        </Card>

        <Card className="sticky-card">
          <CardHeader icon="sparkles" title="Ideas de plantillas" />
          <ul className="tips">
            <li>Horarios de atención y feriados.</li>
            <li>Dirección y cómo llegar.</li>
            <li>Medios de pago y política de envíos.</li>
            <li>Mensaje de bienvenida y despedida.</li>
            <li>Aviso de fuera de horario.</li>
          </ul>
        </Card>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nueva plantilla"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button icon="plus" onClick={create}>
              Crear
            </Button>
          </>
        }
      >
        <Field label="Nombre" hint="El slug se genera automáticamente">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej: Horario de verano"
            autoFocus
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Eliminar plantilla"
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
        <p className="modal-text">
          Si algún comando usa <code>{`{{texto:${deleting?.slug || ''}}}`}</code>, quedará sin texto.
        </p>
      </Modal>
    </div>
  );
}
