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
import GroupsTab from './tabs/GroupsTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';

export default function BotWorkspace() {
  const { botId, tab = 'commands' } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [bot, setBot] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [live, setLive] = useState({ status: 'disconnected', qr: null, pairingCode: null, phone: '' });
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
    socket.on('stats:update', onStats);

    return () => {
      socket.off('whatsapp:status', onStatus);
      socket.off('whatsapp:qr', onQr);
      socket.off('whatsapp:pairing', onPairing);
      socket.off('whatsapp:connected', onConnected);
      socket.off('whatsapp:log', onWaLog);
      socket.off('whatsapp:message');
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
      { id: 'groups', label: 'Grupos', icon: 'users' },
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
          <Link to="/bots" className="icon-btn" title="Volver">
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
          </div>
          <Button variant="secondary" icon="send" onClick={() => setTesting(true)}>
            Probar
          </Button>
        </div>
      </header>

      {meta?.deploy?.ephemeral ? (
        <div className="hint-box hint-warn deploy-banner">
          <Icon name="warning" size={16} />
          <span>
            <strong>
              {meta.deploy.serverless ? 'Modo serverless (Vercel).' : 'Plan sin disco persistente.'}
            </strong>{' '}
            {meta.deploy.hint}
          </span>
        </div>
      ) : null}

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
            deploy={meta?.deploy}
          />
        )}
        {tab === 'groups' && <GroupsTab bot={bot} />}
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
        name: 'Ana',
        groupName: 'Grupo Ventas',
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
            text: 'No hay respuesta configurada para ese mensaje. Revisá los comandos o el mensaje de respaldo.',
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
          <h4>Contexto</h4>
          <p className="muted small">
            Simula un mensaje dentro de un grupo de WhatsApp, con reacciones y respuestas reales del
            motor.
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

        </div>

        <PhonePreview
          botName={bot.name}
          botEmoji={bot.emoji}
          messages={messages}
          typingMessage={typing ? 'typing' : ''}
          onSend={send}
          onReset={() => setMessages([])}
          channel="WhatsApp"
          quickMessages={[`${bot.settings.prefix}menu`, `${bot.settings.prefix}ping`, 'hola']}
        />
      </div>
    </Modal>
  );
}
