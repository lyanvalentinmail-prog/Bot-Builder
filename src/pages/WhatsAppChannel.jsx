import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { joinBotRoom } from '../lib/socket.js';
import { Button, Card, CardHeader, Icon, StatusDot, useToast } from '../components/ui.jsx';
import WhatsAppTab from './tabs/WhatsAppTab.jsx';

export default function WhatsAppChannel() {
  const [bots, setBots] = useState([]);
  const [botId, setBotId] = useState('');
  const [bot, setBot] = useState(null);
  const [meta, setMeta] = useState(null);
  const [live, setLive] = useState({ status: 'disconnected', qr: null, pairingCode: null, phone: '' });
  const [groups, setGroups] = useState({ connected: false, groups: [] });
  const [logs, setLogs] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const { notify } = useToast();
  const timer = useRef(null);

  const reloadBot = useCallback(
    async (silent = false) => {
      if (!botId) return;
      try {
        const [botData, metaData] = await Promise.all([api.get(`/bots/${botId}`), api.get('/meta')]);
        setBot(botData.bot);
        setMeta(metaData);
        setLive((prev) => ({
          ...prev,
          ...botData.bot.channels.whatsapp,
        }));
      } catch (error) {
        if (!silent) notify(error.message, 'error');
      }
    },
    [botId, notify],
  );

  useEffect(() => {
    api
      .get('/bots')
      .then((data) => {
        setBots(data.bots);
        setBotId((current) => current || data.bots[0]?.id || '');
      })
      .catch((error) => notify(error.message, 'error'));
  }, [notify]);

  useEffect(() => {
    setBot(null);
    setLive({ status: 'disconnected', qr: null, pairingCode: null, phone: '' });
    setGroups({ connected: false, groups: [] });
    setLogs([]);
    reloadBot();
  }, [reloadBot]);

  useEffect(() => {
    if (!botId) return undefined;
    const socket = joinBotRoom(botId);
    const guard = (payload) => !payload?.botId || payload.botId === botId;
    const onStatus = (payload) => guard(payload) && setLive((prev) => ({ ...prev, ...payload }));
    const onQr = (payload) => guard(payload) && setLive((prev) => ({ ...prev, status: 'qr', qr: payload.qr }));
    const onPairing = (payload) =>
      guard(payload) && setLive((prev) => ({ ...prev, status: 'pairing', pairingCode: payload.code }));
    const onLog = (payload) => {
      if (!guard(payload)) return;
      setLogs((prev) => [
        { text: payload.text, level: payload.level || 'info', at: new Date().toISOString() },
        ...prev,
      ]);
    };
    const onMessage = (payload) =>
      guard(payload) &&
      setLogs((prev) => [
        {
          text: `📩 ${payload.from}${payload.command ? ` · ${payload.command}` : ''}: ${payload.text}`,
          level: payload.matched ? 'success' : 'info',
          at: new Date().toISOString(),
        },
        ...prev,
      ]);

    socket.on('whatsapp:status', onStatus);
    socket.on('whatsapp:qr', onQr);
    socket.on('whatsapp:pairing', onPairing);
    socket.on('whatsapp:log', onLog);
    socket.on('whatsapp:message', onMessage);
    return () => {
      socket.off('whatsapp:status', onStatus);
      socket.off('whatsapp:qr', onQr);
      socket.off('whatsapp:pairing', onPairing);
      socket.off('whatsapp:log', onLog);
      socket.off('whatsapp:message', onMessage);
    };
  }, [botId]);

  // Sondeo de respaldo (Socket.IO no cruza todos los proxies).
  useEffect(() => {
    if (!botId) return undefined;
    timer.current = setInterval(async () => {
      try {
        const data = await api.get(`/bots/${botId}/whatsapp`);
        setLive((prev) => ({ ...prev, ...data.whatsapp }));
      } catch {
        /* silencioso */
      }
    }, 4000);
    return () => clearInterval(timer.current);
  }, [botId]);

  const loadGroups = useCallback(
    async (refresh = false) => {
      if (!botId) return;
      setLoadingGroups(true);
      try {
        const data = await api.get(`/bots/${botId}/groups${refresh ? '?refresh=1' : ''}`);
        setGroups(data);
      } catch (error) {
        notify(error.message, 'error');
      } finally {
        setLoadingGroups(false);
      }
    },
    [botId, notify],
  );

  useEffect(() => {
    if (botId) loadGroups();
  }, [botId, loadGroups]);

  if (!bots.length) {
    return (
      <div className="page">
        <header className="page-head">
          <div>
            <span className="eyebrow">Soporte</span>
            <h1>Canal WhatsApp</h1>
            <p>Vinculá un número y el bot queda disponible para tus grupos.</p>
          </div>
        </header>
        <div className="empty-card">
          <Icon name="whatsapp" size={28} />
          <h3>Primero registrá un bot</h3>
          <p>Cuando tengas un bot vas a poder vincular el número por QR o con código.</p>
          <Link className="btn btn-primary" to="/registrar">
            <Icon name="plus" size={16} /> Registrar bot
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Soporte</span>
          <h1>Canal WhatsApp</h1>
          <p>QR, código de vinculación y grupos reales del número conectado.</p>
        </div>
        <div className="page-head-actions">
          <select className="input select" value={botId} onChange={(event) => setBotId(event.target.value)}>
            {bots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.emoji} {item.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {!bot ? (
        <div className="skeleton-block" />
      ) : (
        <>
          <WhatsAppTab
            bot={bot}
            setBot={setBot}
            live={live}
            setLive={setLive}
            logs={logs}
            notify={notify}
            onLog={(entry) => setLogs((prev) => [entry, ...prev].slice(0, 80))}
            reload={reloadBot}
            deploy={meta?.deploy}
          />

          <Card className="groups-card">
            <CardHeader
              icon="users"
              title="Grupos del número"
              subtitle={
                groups.connected
                  ? `${groups.groups.length} grupos detectados en la sesión de WhatsApp.`
                  : 'Vinculá WhatsApp para leer los grupos reales de esta sesión.'
              }
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  icon="refresh"
                  onClick={() => loadGroups(true)}
                  loading={loadingGroups}
                  disabled={!groups.connected}
                >
                  Actualizar
                </Button>
              }
            />
            {groups.connected && groups.groups.length ? (
              <div className="group-grid">
                {groups.groups.map((group) => (
                  <div key={group.id} className="group-row">
                    <span className="group-avatar">
                      <Icon name="users" size={17} />
                    </span>
                    <div className="group-body">
                      <strong>{group.name}</strong>
                      <small>
                        {group.participants ? `${group.participants} integrantes · ` : ''}
                        {group.messages || 0} mensajes procesados
                      </small>
                      <code>{group.id}</code>
                    </div>
                    <StatusDot
                      status={group.lastActivityAt ? 'connected' : 'ready'}
                      label={
                        group.lastActivityAt
                          ? new Date(group.lastActivityAt).toLocaleTimeString('es-UY')
                          : 'sin actividad'
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inline">
                <Icon name="users" size={20} />
                <p>
                  {groups.connected
                    ? 'La sesión no reportó grupos todavía. Sumá el número a un grupo y actualizá.'
                    : 'Los grupos aparecen acá cuando la sesión está conectada.'}
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
