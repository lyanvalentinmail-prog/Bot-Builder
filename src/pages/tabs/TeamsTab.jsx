import React, { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import PhonePreview from '../../components/PhonePreview.jsx';
import {
  Button,
  Card,
  CardHeader,
  CopyButton,
  Field,
  Icon,
  Input,
  StatusDot,
} from '../../components/ui.jsx';

export default function TeamsTab({ bot, setBot, teamsStatus, setTeamsStatus, logs, notify, onLog, reload }) {
  const [appId, setAppId] = useState(bot.channels.teams.appId || '');
  const [appPassword, setAppPassword] = useState('');
  const [tenantId, setTenantId] = useState(bot.channels.teams.tenantId || '');
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);

  // Teams exige un GUID como id del manifest: lo derivamos del id del bot.
  const manifestId = useMemo(() => {
    let hash = 0;
    for (const char of bot.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    const hex = hash.toString(16).padStart(8, '0');
    const hex2 = (hash ^ 0x9e3779b9).toString(16).padStart(8, '0').slice(0, 4);
    const tail = (hash * 2654435761 >>> 0).toString(16).padStart(12, '0').slice(0, 12);
    return `${hex}-${hex2}-4b1e-9f2a-${tail}`;
  }, [bot.id]);

  const endpoint = useMemo(
    () => `${window.location.origin}/api/teams/${bot.id}/messages`,
    [bot.id],
  );

  const manifest = useMemo(
    () =>
      JSON.stringify(
        {
          $schema: 'https://developer.microsoft.com/en-us/json-schemas/teams/v1.17/MicrosoftTeams.schema.json',
          manifestVersion: '1.17',
          version: '1.0.0',
          id: manifestId,
          name: { short: bot.name.slice(0, 30), full: bot.name },
          description: {
            short: (bot.description || 'Bot creado con BotForge').slice(0, 80),
            full: `${bot.description || 'Bot creado con BotForge'} · Comandos: ${bot.commands
              .map((c) => `${bot.settings.prefix}${c.trigger}`)
              .slice(0, 8)
              .join(', ')}`,
          },
          developer: { name: 'BotForge', websiteUrl: 'https://example.com', privacyUrl: 'https://example.com', termsOfUseUrl: 'https://example.com' },
          icons: { color: 'color.png', outline: 'outline.png' },
          accentColor: '#6366f1',
          bots: [{ botId: appId || 'PEGAR-APP-ID', scopes: ['personal', 'team', 'groupchat'], isNotificationOnly: false, supportsFiles: false }],
          permissions: ['identity', 'messageTeamMembers'],
          validDomains: [window.location.hostname],
        },
        null,
        2,
      ),
    [bot, appId],
  );

  const saveCredentials = async (enableAfter = false) => {
    setSaving(true);
    try {
      const { teams } = await api.put(`/bots/${bot.id}/teams/credentials`, {
        appId,
        appPassword: appPassword || undefined,
        tenantId,
      });
      setTeamsStatus(teams);
      notify('Credenciales guardadas');
      if (enableAfter) await activate();
      else reload(true);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    setActivating(true);
    try {
      const res = await api.post(`/bots/${bot.id}/teams/start`);
      setTeamsStatus(res.teams);
      notify('Canal Teams activado');
      onLog({ text: 'Canal Microsoft Teams activado.', level: 'success', at: new Date().toISOString() });
      reload(true);
    } catch (error) {
      notify(error.message, 'error');
      onLog({ text: error.message, level: 'error', at: new Date().toISOString() });
      reload(true);
    } finally {
      setActivating(false);
    }
  };

  const deactivate = async () => {
    try {
      const res = await api.post(`/bots/${bot.id}/teams/stop`);
      setTeamsStatus(res.teams);
      notify('Canal Teams desactivado');
      reload(true);
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const simulateSend = async (text) => {
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, from: 'user', text }]);
    setTyping(true);
    try {
      const res = await api.post(`/bots/${bot.id}/teams/simulate`, { text });
      const actions = res.actions || [];
      if (!actions.length) {
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            from: 'bot',
            text: 'No hay una respuesta para ese mensaje. Probá con /menu.',
          },
        ]);
      } else {
        actions.forEach((action, index) => {
          setTimeout(
            () => {
              setMessages((prev) => [
                ...prev,
                {
                  id: `b-${Date.now()}-${index}`,
                  from: 'bot',
                  text: action.text,
                  buttons: action.buttons,
                },
              ]);
              if (index === actions.length - 1) setTyping(false);
            },
            500 + index * 300,
          );
        });
      }
      if (res.reactions?.length) {
        onLog({
          text: 'En Teams la reacción no se envía por API (solo WhatsApp).',
          level: 'info',
          at: new Date().toISOString(),
        });
      }
      if (!actions.length) setTyping(false);
    } catch (error) {
      setTyping(false);
      notify(error.message, 'error');
    }
  };

  const ready = teamsStatus.status === 'ready';

  return (
    <div className="two-col">
      <div className="col-main">
        <Card>
          <div className="connect-head">
            <div className="connect-title">
              <span className="channel-icon channel-teams">
                <Icon name="teams" size={20} />
              </span>
              <div>
                <h3>Microsoft Teams</h3>
                <p>
                  Conectá tu bot al Bot Framework con las credenciales de Azure. Sin túneles: Teams
                  llama a este servidor.
                </p>
              </div>
            </div>
            <StatusDot
              status={ready ? 'ready' : 'not_configured'}
              label={ready ? 'Canal activo' : 'Sin activar'}
            />
          </div>

          <div className="form-grid">
            <Field label="Microsoft App ID" hint="Del recurso Azure Bot">
              <Input
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                autoComplete="off"
              />
            </Field>
            <Field
              label="App Password"
              hint={bot.channels.teams.appPassword ? 'Ya hay una guardada — dejá vacío para conservarla' : 'Client secret del App Registration'}
            >
              <Input
                type="password"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder={bot.channels.teams.appPassword ? '••••••••' : 'Nuevo secreto'}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Tenant ID (opcional)" hint="Para bots de una sola organización">
              <Input
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </Field>
          </div>

          <div className="endpoint-box">
            <div>
              <span className="field-label">Messaging endpoint</span>
              <code>{endpoint}</code>
            </div>
            <CopyButton text={endpoint} label="Copiar" />
          </div>

          <div className="connect-actions">
            <Button variant="secondary" icon="check" onClick={() => saveCredentials(false)} loading={saving}>
              Guardar credenciales
            </Button>
            {ready ? (
              <Button variant="ghost" icon="stop" onClick={deactivate}>
                Desactivar canal
              </Button>
            ) : (
              <Button icon="play" onClick={activate} loading={activating}>
                Activar canal
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            icon="send"
            title="Simulador de Teams"
            subtitle="Probá los comandos tal como llegarían desde Teams (/menu, menu o !menu)."
          />
          <div className="simulator-layout">
            <PhonePreview
              botName={`${bot.name} · Teams`}
              botEmoji={bot.emoji}
              messages={messages}
              typingMessage={typing ? 'typing' : ''}
              onSend={simulateSend}
              onReset={() => setMessages([])}
              channel="Microsoft Teams"
              placeholder="Escribí /menu…"
              quickMessages={['/menu', `/ping`, '/hola']}
            />
            <div className="simulator-side">
              <h4>Comandos en Teams</h4>
              <div className="test-commands">
                {bot.commands
                  .filter((c) => c.enabled)
                  .slice(0, 10)
                  .map((command) => (
                    <button
                      key={command.id}
                      className="test-command"
                      onClick={() => simulateSend(`/${command.trigger}`)}
                    >
                      <code>/{command.trigger}</code>
                      <span>{command.name}</span>
                    </button>
                  ))}
              </div>
              <div className="hint-box">
                <Icon name="warning" size={15} />
                <span>
                  Las reacciones nativas no están disponibles en la API de Teams: se aplican solo en
                  WhatsApp.
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader icon="monitor" title="Registro" subtitle="Eventos del canal Teams." />
          <div className="log-console">
            {logs.length ? (
              logs.slice(0, 25).map((log, index) => (
                <div key={index} className={`log-line log-${log.level || 'info'}`}>
                  <span className="log-time">
                    {new Date(log.at || Date.now()).toLocaleTimeString('es-UY', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="log-text">{log.text}</span>
                </div>
              ))
            ) : (
              <div className="log-empty">
                <Icon name="clock" size={16} /> <span>Sin actividad todavía.</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="col-side">
        <Card className="sticky-card">
          <CardHeader icon="sparkles" title="Puesta en marcha" subtitle="5 pasos en Azure" />
          <ol className="steps">
            <li>
              Creá un <strong>Azure Bot</strong> en el portal de Azure.
            </li>
            <li>
              En <em>Configuración</em>, pegá el messaging endpoint de arriba.
            </li>
            <li>
              Copiá el <strong>Microsoft App ID</strong> y generá un <strong>secreto</strong> en el
              App Registration.
            </li>
            <li>Pegá ambos datos acá y activá el canal.</li>
            <li>
              Publicá el bot en Teams desde <em>Canales → Microsoft Teams</em> y probalo.
            </li>
          </ol>
          <div className="hint-box">
            <Icon name="warning" size={15} />
            <span>
              El endpoint debe ser público por HTTPS. Si trabajás en local, exponé este servidor con
              un túnel (por ejemplo <code>cloudflared</code> o <code>ngrok</code>) y usá esa URL.
            </span>
          </div>
        </Card>

        <Card className="sticky-card">
          <CardHeader
            icon="download"
            title="Manifest para Teams"
            subtitle="Personal app lista para subir"
            actions={<CopyButton text={manifest} label="Copiar JSON" />}
          />
          <pre className="code-block manifest">{manifest}</pre>
          <p className="muted small">
            Reemplazá los íconos <code>color.png</code> y <code>outline.png</code> antes de
            empaquetar el ZIP.
          </p>
        </Card>

        <Card className="sticky-card">
          <CardHeader icon="users" title="Conversaciones" />
          {teamsStatus.conversations?.length ? (
            <ul className="conversation-list">
              {teamsStatus.conversations.map((conversation) => (
                <li key={conversation.id}>
                  <strong>{conversation.name || 'Chat'}</strong>
                  <span className="muted small">
                    {conversation.userName} · {conversation.type}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">
              Cuando alguien escriba al bot en Teams, sus conversaciones aparecerán acá.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
