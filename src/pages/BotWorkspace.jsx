import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { joinBotRoom } from '../lib/socket.js';
import { Button, Icon, Modal, StatusDot, Tabs, useToast } from '../components/ui.jsx';
import PhonePreview from '../components/PhonePreview.jsx';
import CommandsTab from './tabs/CommandsTab.jsx';
import ReactionsTab from './tabs/ReactionsTab.jsx';
import TextsTab from './tabs/TextsTab.jsx';
import WhatsAppTab from './tabs/WhatsAppTab.jsx';
import TeamsTab from './tabs/TeamsTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';

export default function BotWorkspace() {
  const { botId, tab = 'commands' } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [bot, setBot] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [live, setLive] = useState({ status: 'disconnected', qr: null, pairingCode: null, phone: '' });
  const [teamsStatus, setTeamsStatus] = useState({ status: 'not_configured' });
  const [logs, setLogs] = useState([]);
  const [testing, setTesting] = useState(false);

  const pushLog = useCallback((entry) => {
    setLogs((prev) => [entry, ...prev].slice(0, 80));
  }, []);

  const load = useCallback(
    async (silent = false) => {
      try {
        const [botData, metaData] = await Promise.all([api.get(`/bots/${botId}`), api.get('/meta')]);
        setBot(botData.bot);
        setMeta(metaData);
        setLive((prev) => ({
          ...prev,
          status: botData.bot.channels.whatsapp.status || 'disconnected',
          phone: botData.bot.channels.whatsapp.phone || '',
          me: botData.bot.channels.whatsapp.me,
        }));
        setTeamsStatus(botData.bot.channels.teams);
        setError(null);
      } catch (err) {
        if (!silent) setError(err.message);
      }
    },
    [botId],
  );

  useEffect(() => {
    setBot(null);
    load();
  }, [load]);

  useEffect(() => {
    if (!botId) return undefined;
    const socket = joinBotRoom(botId);
    const onStatus = (payload) => {
      if (payload.botId !== botId) return;
      setLive((prev) => ({ ...prev, ...payload }));
    };
    const onQr = (payload) => {
      if (payload.botId !== botId) return;
      setLive((prev) => ({ ...prev, status: 'qr', qr: payload.qr || prev.qr }));
    };
    const onPairing = (payload) => {
      if (payload.botId !== botId) return;
      setLive((prev) => ({ ...prev, status: 'pairing', pairingCode: payload.code }));
    };
    const onConnected = (payload) => {
      if (payload.botId !== botId) return;
      setLive((prev) => ({ ...prev, status: 'connected', qr: null, pairingCode: null, phone: payload.number }));
      pushLog({ text: `✅ Vinculado correctamente (${payload.number})`, level: 'success', at: new Date().toISOString() });
      load(true);
    };
    const onWaLog = (payload) => {
      if (payload.botId !== botId) return;
      pushLog({ text: payload.text, level: payload.level || 'info', at: new Date().toISOString() });
    };
    const onTeamsStatus = (payload) => {
      if (payload.botId !== botId) return;
      setTeamsStatus((prev) => ({ ...prev, ...payload }));
    };
    const onTeamsLog = (payload) => {
      if (payload.botId !== botId) return;
      pushLog({ text: payload.text, level: payload.level || 'info', at: new Date().toISOString() });
    };
    const onStats = (payload) => {
      if (payload.botId !== botId) return;
      setBot((prev) => (prev ? { ...prev, stats: payload.stats } : prev));
    };

    socket.on('whatsapp:status', onStatus);
    socket.on('whatsapp:qr', onQr);
    socket.on('whatsapp:pairing', onPairing);
    socket.on('whatsapp:connected', onConnected);
    socket.on('whatsapp:log', onWaLog);
    socket.on('whatsapp:message', (p) =>
      pushLog({
        text: `📩 ${p.from}: ${p.text}`,
        level: p.matched ? 'success' : 'info',
        at: new Date().toISOString(),
      }),
    );
    socket.on('teams:status', onTeamsStatus);
    socket.on('teams:log', onTeamsLog);
    socket.on('teams:message', (p) =>
      pushLog({ text: `👥 ${p.from}: ${p.text}`, level: 'info', at: new Date().toISOString() }),
    );
    socket.on('stats:update', onStats);

    return () => {
      socket.off('whatsapp:status', onStatus);
      socket.off('whatsapp:qr', onQr);
      socket.off('whatsapp:pairing', onPairing);
      socket.off('whatsapp:connected', onConnected);
      socket.off('whatsapp:log', onWaLog);
      socket.off('whatsapp:message');
      socket.off('teams:status', onTeamsStatus);
      socket.off('teams:log', onTeamsLog);
      socket.off('teams:message');
      socket.off('stats:update', onStats);
    };
  }, [botId, load, pushLog]);

  const patchBot = useCallback(
    async (patch) => {
      const { bot: updated } = await api.put(`/bots/${botId}`, patch);
      setBot(updated);
      return updated;
    },
    [botId],
  );

  const tabs = useMemo(
    () => [
      { id: 'commands', label: 'Comandos', icon: 'command', badge: bot?.commands.length },
      { id: 'reactions', label: 'Reacciones', icon: 'smile', badge: bot?.reactions.length },
      { id: 'texts', label: 'Textos', icon: 'text', badge: bot?.texts.length },
      { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
      { id: 'teams', label: 'Teams', icon: 'teams' },
      { id: 'settings', label: 'Ajustes', icon: 'settings' },
    ],
    [bot],
  );

  if (error) {
    return (
      <div className="page">
        <div className="empty">
          <h4>No pudimos abrir el bot</h4>
          <p>{error}</p>
          <Link className="btn btn-primary" to="/">
            Volver a mis bots
          </Link>
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="page">
        <div className="skeleton-block" />
        <div className="skeleton-row">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="page page-workspace">
      <header className="workspace-head">
        <div className="workspace-title">
          <Link to="/" className="icon-btn" title="Volver">
            <Icon name="arrowLeft" size={18} />
          </Link>
          <span className="bot-avatar bot-avatar-lg">{bot.emoji}</span>
          <div>
            <h1>{bot.name}</h1>
            <p>{bot.description}</p>
          </div>
        </div>
        <div className="workspace-actions">
          <div className="channel-pills">
            <StatusDot
              status={live.status === 'connected' ? 'connected' : live.status === 'qr' || live.status === 'pairing' ? live.status : 'disconnected'}
              label={
                live.status === 'connected'
                  ? `WhatsApp · +${live.phone || 'vinculado'}`
                  : live.status === 'qr'
                    ? 'Esperando escaneo'
                    : live.status === 'pairing'
                      ? 'Esperando código'
                      : 'WhatsApp desconectado'
              }
            />
            <StatusDot
              status={teamsStatus.status === 'ready' ? 'ready' : 'not_configured'}
              label={teamsStatus.status === 'ready' ? 'Teams activo' : 'Teams inactivo'}
            />
          </div>
          <Button variant="secondary" icon="send" onClick={() => setTesting(true)}>
            Probar
          </Button>
        </div>
      </header>

      <Tabs tabs={tabs} value={tab} onChange={(next) => navigate(`/bots/${botId}/${next}`)} />

      <div className="workspace-body">
        {tab === 'commands' && (
          <CommandsTab bot={bot} setBot={setBot} meta={meta} notify={notify} onBotReload={load} />
        )}
        {tab === 'reactions' && (
          <ReactionsTab bot={bot} setBot={setBot} notify={notify} patchBot={patchBot} />
        )}
        {tab === 'texts' && <TextsTab bot={bot} setBot={setBot} notify={notify} />}
        {tab === 'whatsapp' && (
          <WhatsAppTab
            bot={bot}
            setBot={setBot}
            live={live}
            setLive={setLive}
            logs={logs}
            notify={notify}
            onLog={pushLog}
            reload={load}
          />
        )}
        {tab === 'teams' && (
          <TeamsTab
            bot={bot}
            setBot={setBot}
            teamsStatus={teamsStatus}
            setTeamsStatus={setTeamsStatus}
            logs={logs}
            notify={notify}
            onLog={pushLog}
            reload={load}
          />
        )}
        {tab === 'settings' && (
          <SettingsTab
            bot={bot}
            setBot={setBot}
            patchBot={patchBot}
            meta={meta}
            notify={notify}
            onBotReload={load}
          />
        )}
      </div>

      <TestModal
        open={testing}
        onClose={() => setTesting(false)}
        bot={bot}
        onStats={(stats) => setBot((prev) => ({ ...prev, stats }))}
      />
    </div>
  );
}

/* ---------------------------- probador general --------------------------- */

function TestModal({ open, onClose, bot, onStats }) {
  const [channel, setChannel] = useState('whatsapp');
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setTyping(false);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    }
  }, [open]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const send = async (text) => {
    const userMessage = { id: `u-${Date.now()}`, from: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setTyping(true);
    try {
      const res = await api.post(`/bots/${bot.id}/simulate`, {
        text,
        channel,
        name: 'Ana',
      });
      const reaction = res.reactions?.[0]?.emoji;
      if (reaction) {
        setMessages((prev) => prev.map((m) => (m.id === userMessage.id ? { ...m, reaction } : m)));
      }
      let accumulated = 0;
      const actions = res.actions || [];
      if (!actions.length) {
        setTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            from: 'bot',
            text:
              channel === 'teams'
                ? 'No hay respuesta configurada para ese mensaje.'
                : 'No hay respuesta configurada para ese mensaje. Revisá los comandos o el mensaje de respaldo.',
          },
        ]);
        return;
      }
      actions.forEach((action, index) => {
        accumulated += Math.min(Number(action.delayMs) || 500, 1800);
        const timer = setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `b-${Date.now()}-${index}`,
              from: 'bot',
              text: action.text,
              image: action.kind === 'image' ? action.url : undefined,
              buttons: action.buttons,
              note: action.editAfterMs ? `Se editará en ${Math.round(action.editAfterMs / 1000)} s` : undefined,
            },
          ]);
          if (index === actions.length - 1) setTyping(false);
        }, accumulated);
        timers.current.push(timer);
      });
    } catch (error) {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, from: 'bot', text: `⚠️ ${error.message}` },
      ]);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Probar el bot"
      subtitle="Simulación real del motor, sin enviar mensajes."
      wide
    >
      <div className="test-layout">
        <div className="test-side">
          <h4>Canal</h4>
          <div className="segmented">
            <button
              className={channel === 'whatsapp' ? 'is-active' : ''}
              onClick={() => setChannel('whatsapp')}
            >
              <Icon name="whatsapp" size={15} /> WhatsApp
            </button>
            <button className={channel === 'teams' ? 'is-active' : ''} onClick={() => setChannel('teams')}>
              <Icon name="teams" size={15} /> Teams
            </button>
          </div>
          <p className="muted small">
            {channel === 'whatsapp'
              ? 'Simula un chat de WhatsApp (incluye reacciones).'
              : 'En Teams los comandos se aceptan con / o sin prefijo. Las reacciones nativas no se envían.'}
          </p>

          <h4>Comandos disponibles</h4>
          <div className="test-commands">
            {bot.commands
              .filter((c) => c.enabled && c.showInMenu)
              .slice(0, 12)
              .map((command) => (
                <button
                  key={command.id}
                  onClick={() => send(`${bot.settings.prefix}${command.trigger}`)}
                  className="test-command"
                >
                  <code>
                    {bot.settings.prefix}
                    {command.trigger}
                  </code>
                  <span>{command.name}</span>
                </button>
              ))}
          </div>

          {channel === 'teams' ? (
            <div className="hint-box">
              <Icon name="warning" size={15} />
              <span>
                Para responder en Teams real necesitás credenciales de Azure Bot y una URL pública HTTPS.
              </span>
            </div>
          ) : null}
        </div>

        <PhonePreview
          botName={bot.name}
          botEmoji={bot.emoji}
          messages={messages}
          typingMessage={typing ? 'typing' : ''}
          onSend={send}
          onReset={() => setMessages([])}
          channel={channel === 'teams' ? 'Microsoft Teams' : 'WhatsApp'}
          quickMessages={[`${bot.settings.prefix}menu`, `${bot.settings.prefix}ping`, 'hola']}
        />
      </div>
    </Modal>
  );
}
