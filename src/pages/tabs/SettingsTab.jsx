import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import {
  Button,
  Card,
  CardHeader,
  Field,
  Icon,
  Input,
  Textarea,
  Toggle,
  useToast,
  Modal,
} from '../../components/ui.jsx';

export default function SettingsTab({ bot, setBot, patchBot, meta, notify, onBotReload }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [general, setGeneral] = useState({
    name: bot.name,
    emoji: bot.emoji,
    description: bot.description,
  });
  const [settings, setSettings] = useState(bot.settings);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    setGeneral({ name: bot.name, emoji: bot.emoji, description: bot.description });
    setSettings(bot.settings);
  }, [bot.updatedAt]);

  const generalDirty = useMemo(
    () =>
      general.name !== bot.name ||
      general.emoji !== bot.emoji ||
      general.description !== bot.description,
    [general, bot],
  );
  const settingsDirty = JSON.stringify(settings) !== JSON.stringify(bot.settings);

  const saveGeneral = async () => {
    setSavingGeneral(true);
    try {
      const updated = await patchBot(general);
      setBot(updated);
      notify('Datos del bot actualizados');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSavingGeneral(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const updated = await patchBot({ settings });
      setBot(updated);
      notify('Configuración guardada');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const update = (patch) => setSettings((prev) => ({ ...prev, ...patch }));

  const duplicate = async () => {
    setDuplicating(true);
    try {
      const { bot: copy } = await api.post(`/bots/${bot.id}/duplicate`);
      notify('Bot duplicado');
      navigate(`/bots/${copy.id}/settings`);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setDuplicating(false);
    }
  };

  const remove = async () => {
    try {
      await api.del(`/bots/${bot.id}`);
      toast.notify('Bot eliminado');
      navigate('/');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  return (
    <div className="two-col">
      <div className="col-main">
        <Card>
          <CardHeader
            icon="bot"
            title="Identidad del bot"
            subtitle="Cómo se presenta en WhatsApp y Teams."
            actions={
              <Button size="sm" icon="check" onClick={saveGeneral} loading={savingGeneral} disabled={!generalDirty}>
                Guardar
              </Button>
            }
          />
          <div className="form-row">
            <Field label="Nombre">
              <Input
                value={general.name}
                maxLength={60}
                onChange={(e) => setGeneral({ ...general, name: e.target.value })}
              />
            </Field>
            <Field label="Emoji" hint="Se muestra en la lista y en el teléfono">
              <Input
                value={general.emoji}
                maxLength={4}
                onChange={(e) => setGeneral({ ...general, emoji: e.target.value })}
                className="emoji-input"
              />
            </Field>
          </div>
          <Field label="Descripción">
            <Input
              value={general.description}
              maxLength={240}
              onChange={(e) => setGeneral({ ...general, description: e.target.value })}
            />
          </Field>
          <div className="kv">
            <span>Creado</span>
            <strong>{new Date(bot.createdAt).toLocaleDateString('es-UY')}</strong>
          </div>
          <div className="kv">
            <span>Última edición</span>
            <strong>{new Date(bot.updatedAt).toLocaleString('es-UY')}</strong>
          </div>
          <div className="kv">
            <span>Plantilla de origen</span>
            <strong>{bot.template}</strong>
          </div>
        </Card>

        <Card>
          <CardHeader
            icon="command"
            title="Comportamiento de los comandos"
            subtitle="Prefijo, respuestas de respaldo y mensaje de bienvenida."
            actions={
              <Button size="sm" icon="check" onClick={saveSettings} loading={savingSettings} disabled={!settingsDirty}>
                Guardar
              </Button>
            }
          />

          <div className="form-row form-row-compact">
            <Field label="Prefijo" hint="Ej: ! / # .">
              <Input
                value={settings.prefix}
                maxLength={3}
                onChange={(e) => update({ prefix: e.target.value })}
                className="input-prefix"
              />
            </Field>
            <div className="stack-toggles">
              <Toggle
                checked={settings.prefixRequired}
                onChange={(value) => update({ prefixRequired: value })}
                label="Exigir prefijo"
                description="Solo afecta a los comandos de tipo «comando». Las frases naturales funcionan con o sin prefijo."
              />
              <Toggle
                checked={settings.caseSensitive}
                onChange={(value) => update({ caseSensitive: value })}
                label="Distinguir mayúsculas"
              />
              <Toggle
                checked={settings.readReceipts}
                onChange={(value) => update({ readReceipts: value })}
                label="Marcar mensajes como leídos"
              />
              <Toggle
                checked={settings.ignoreGroups}
                onChange={(value) => update({ ignoreGroups: value })}
                label="Ignorar grupos"
                description="Los grupos no reciben respuestas del bot."
              />
            </div>
          </div>

          <div className="divider" />

          <Toggle
            checked={settings.unknownCommandEnabled}
            onChange={(value) => update({ unknownCommandEnabled: value })}
            label="Avisar cuando el comando no existe"
          />
          {settings.unknownCommandEnabled ? (
            <Field label="Mensaje para comandos desconocidos">
              <Textarea
                rows={2}
                value={settings.unknownCommandText}
                onChange={(e) => update({ unknownCommandText: e.target.value })}
              />
            </Field>
          ) : null}

          <Toggle
            checked={settings.fallbackEnabled}
            onChange={(value) => update({ fallbackEnabled: value })}
            label="Respuesta de respaldo"
            description="Responde a cualquier mensaje que no active un comando."
          />
          {settings.fallbackEnabled ? (
            <Field label="Texto de respaldo">
              <Textarea
                rows={2}
                value={settings.fallbackText}
                onChange={(e) => update({ fallbackText: e.target.value })}
              />
            </Field>
          ) : null}

          <Toggle
            checked={settings.welcomeEnabled}
            onChange={(value) => update({ welcomeEnabled: value })}
            label="Mensaje de bienvenida"
            description="Se envía la primera vez que una persona escribe al bot."
          />
          {settings.welcomeEnabled ? (
            <Field label="Texto de bienvenida">
              <Textarea
                rows={3}
                value={settings.welcomeText}
                onChange={(e) => update({ welcomeText: e.target.value })}
              />
            </Field>
          ) : null}

          <Field label="Firma" hint="Se agrega al final de cada respuesta de texto">
            <Input
              value={settings.signature}
              onChange={(e) => update({ signature: e.target.value })}
              placeholder="— Equipo de atención"
            />
          </Field>
        </Card>

        <Card>
          <CardHeader icon="download" title="Respaldo" subtitle="Mové tu bot entre servidores." />
          <div className="button-row-inline">
            <a className="btn btn-secondary btn-md" href={`/api/bots/${bot.id}/export`} download>
              <Icon name="download" size={16} /> <span>Exportar configuración</span>
            </a>
            <Button variant="secondary" icon="copy" onClick={duplicate} loading={duplicating}>
              Duplicar bot
            </Button>
            <Button variant="ghost" icon="upload" onClick={() => navigate('/')}>
              Importar desde el inicio
            </Button>
          </div>
        </Card>

        <Card className="danger-card">
          <CardHeader
            icon="warning"
            title="Zona de riesgo"
            subtitle="Eliminar el bot borra también su sesión de WhatsApp."
          />
          <Button variant="danger" icon="trash" onClick={() => setDeleting(true)}>
            Eliminar este bot
          </Button>
        </Card>
      </div>

      <div className="col-side">
        <Card className="sticky-card">
          <CardHeader icon="text" title="Variables disponibles" subtitle="Se reemplazan al responder" />
          <div className="var-table">
            {(meta?.variables || []).map((variable) => (
              <div key={variable.key} className="var-row">
                <code>{`{{${variable.key}}}`}</code>
                <span>{variable.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="sticky-card">
          <CardHeader icon="sparkles" title="Datos técnicos" />
          <div className="kv">
            <span>ID del bot</span>
            <code>{bot.id}</code>
          </div>
          <div className="kv">
            <span>Motor WhatsApp</span>
            <strong>Baileys</strong>
          </div>
          <div className="kv">
            <span>Motor Teams</span>
            <strong>Bot Framework v4</strong>
          </div>
          <div className="kv">
            <span>Mensajes procesados</span>
            <strong>{bot.stats.messages}</strong>
          </div>
          <div className="kv">
            <span>Reacciones enviadas</span>
            <strong>{bot.stats.reactions}</strong>
          </div>
        </Card>
      </div>

      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Eliminar bot"
        subtitle="Esta acción no se puede deshacer."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Cancelar
            </Button>
            <Button variant="danger" icon="trash" onClick={remove}>
              Eliminar «{bot.name}»
            </Button>
          </>
        }
      >
        <p className="modal-text">
          Se borrarán los {bot.commands.length} comandos, {bot.reactions.length} reacciones,{' '}
          {bot.texts.length} plantillas y la sesión vinculada de WhatsApp.
        </p>
      </Modal>
    </div>
  );
}
