import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import {
  Button,
  Card,
  CardHeader,
  CopyButton,
  Field,
  Icon,
  Input,
  Modal,
  StatusDot,
} from '../../components/ui.jsx';

const STATUS_TEXT = {
  disconnected: 'Sin conectar',
  connecting: 'Iniciando conexión…',
  qr: 'Escaneá el QR',
  pairing: 'Ingresá el código en tu teléfono',
  connected: 'Conectado',
  error: 'Error de conexión',
};

export default function WhatsAppTab({ bot, setBot, live, setLive, logs, notify, onLog, reload }) {
  const [method, setMethod] = useState('qr');
  const [phone, setPhone] = useState(bot.channels.whatsapp.phone || '');
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testJid, setTestJid] = useState('');
  const [testText, setTestText] = useState('¡Hola! Este es un mensaje de prueba 👋');
  const [sending, setSending] = useState(false);

  const status = live.status || 'disconnected';
  const busy = ['connecting', 'qr', 'pairing'].includes(status);

  useEffect(() => {
    if (!busy) return undefined;
    const interval = setInterval(async () => {
      try {
        const data = await api.get(`/bots/${bot.id}/whatsapp`);
        const next = data.whatsapp;
        setLive((prev) => ({
          ...prev,
          status: next.status || prev.status,
          phone: next.phone || prev.phone,
          qr: next.qr || prev.qr,
          pairingCode: next.pairingCode || prev.pairingCode,
        }));
      } catch {
        /* el socket es la fuente principal */
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [busy, bot.id, setLive]);

  const start = async () => {
    setStarting(true);
    try {
      const res = await api.post(`/bots/${bot.id}/whatsapp/start`, { method, phone });
      setLive((prev) => ({
        ...prev,
        status: res.status?.status || (method === 'qr' ? 'connecting' : 'pairing'),
      }));
      onLog({
        text:
          method === 'qr'
            ? 'Iniciando vinculación con QR…'
            : `Solicitando código de vinculación para +${phone}…`,
        level: 'info',
        at: new Date().toISOString(),
      });
      notify(method === 'qr' ? 'Generando QR…' : 'Generando código de vinculación…');
    } catch (error) {
      notify(error.message, 'error');
      onLog({ text: error.message, level: 'error', at: new Date().toISOString() });
    } finally {
      setStarting(false);
    }
  };

  const stop = async (logout) => {
    setStopping(true);
    try {
      await api.post(`/bots/${bot.id}/whatsapp/stop`, { logout });
      setLive((prev) => ({ ...prev, status: 'disconnected', qr: null, pairingCode: null }));
      notify(logout ? 'Sesión cerrada y eliminada' : 'Conexión detenida');
      onLog({
        text: logout ? 'Sesión de WhatsApp cerrada y eliminada.' : 'Bot desconectado de WhatsApp.',
        level: 'warn',
        at: new Date().toISOString(),
      });
      reload(true);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setStopping(false);
    }
  };

  const sendTest = async () => {
    setSending(true);
    try {
      await api.post(`/bots/${bot.id}/whatsapp/test`, { jid: testJid, text: testText });
      notify('Mensaje enviado');
      setTestOpen(false);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="two-col">
      <div className="col-main">
        <Card className={`connect-card status-${status}`}>
          <div className="connect-head">
            <div className="connect-title">
              <span className="channel-icon channel-whatsapp">
                <Icon name="whatsapp" size={20} />
              </span>
              <div>
                <h3>Conectar WhatsApp</h3>
                <p>
                  Vinculá tu número como dispositivo adicional. Podés seguir usando WhatsApp en tu
                  teléfono.
                </p>
              </div>
            </div>
            <StatusDot status={status === 'connected' ? 'connected' : status} label={STATUS_TEXT[status]} />
          </div>

          {status === 'connected' ? (
            <div className="connected-panel">
              <div className="connected-badge">
                <Icon name="check" size={22} />
              </div>
              <div>
                <h4>¡WhatsApp conectado!</h4>
                <p>
                  {bot.channels.whatsapp.me?.name ? `${bot.channels.whatsapp.me.name} · ` : ''}
                  +{live.phone || bot.channels.whatsapp.phone}
                </p>
                <p className="muted small">
                  Los mensajes que reciba este número se responden automáticamente según tus
                  comandos.
                </p>
              </div>
              <div className="connected-actions">
                <Button variant="secondary" icon="send" onClick={() => setTestOpen(true)}>
                  Enviar prueba
                </Button>
                <Button variant="ghost" icon="stop" onClick={() => stop(false)} loading={stopping}>
                  Detener
                </Button>
                <Button variant="ghost" icon="logout" onClick={() => stop(true)} loading={stopping}>
                  Cerrar sesión
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="method-switch">
                <button
                  className={method === 'qr' ? 'is-active' : ''}
                  onClick={() => setMethod('qr')}
                >
                  <Icon name="qr" size={17} />
                  <span>
                    <strong>Código QR</strong>
                    <small>Escaneá con el teléfono</small>
                  </span>
                </button>
                <button
                  className={method === 'pairing' ? 'is-active' : ''}
                  onClick={() => setMethod('pairing')}
                >
                  <Icon name="key" size={17} />
                  <span>
                    <strong>Código de vinculación</strong>
                    <small>8 dígitos, sin cámara</small>
                  </span>
                </button>
              </div>

              {method === 'pairing' ? (
                <Field label="Número de WhatsApp" hint="Con código de país, solo números">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="59899123456"
                    inputMode="numeric"
                  />
                </Field>
              ) : null}

              <div className="connect-body">
                {status === 'qr' && live.qr ? (
                  <div className="qr-panel">
                    <img src={live.qr} alt="Código QR de WhatsApp" />
                    <div>
                      <h4>Escaneá este código</h4>
                      <ol className="steps">
                        <li>Abrí WhatsApp en tu teléfono.</li>
                        <li>Tocá ⋮ → Dispositivos vinculados.</li>
                        <li>Tocá «Vincular un dispositivo» y apuntá al QR.</li>
                      </ol>
                      <p className="muted small">
                        El código se renueva solo. Si expira, pedí uno nuevo.
                      </p>
                    </div>
                  </div>
                ) : null}

                {status === 'pairing' && live.pairingCode ? (
                  <div className="pairing-panel">
                    <div>
                      <h4>Código de vinculación</h4>
                      <div className="pairing-code">
                        {String(live.pairingCode).match(/.{1,4}/g)?.join(' ') || live.pairingCode}
                      </div>
                      <CopyButton text={live.pairingCode} label="Copiar código" />
                    </div>
                    <ol className="steps">
                      <li>Abrí WhatsApp → Dispositivos vinculados.</li>
                      <li>Elegí «Vincular con número de teléfono».</li>
                      <li>Ingresá el código de 8 dígitos.</li>
                    </ol>
                  </div>
                ) : null}

                {busy || status === 'error' ? (
                  <div className="connect-waiting">
                    {['connecting', 'qr', 'pairing'].includes(status) ? (
                      <span className="spinner spinner-lg" />
                    ) : (
                      <Icon name="warning" size={22} />
                    )}
                    <div>
                      <strong>{STATUS_TEXT[status]}</strong>
                      <p className="muted small">
                        {status === 'connecting'
                          ? 'Estableciendo conexión con los servidores de WhatsApp…'
                          : status === 'qr'
                            ? 'Esperando que escanees el código desde tu teléfono.'
                            : status === 'pairing'
                              ? 'Ingresá el código desde tu teléfono para completar la vinculación.'
                              : live.lastError || 'Revisá el registro y volvé a intentar.'}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="connect-actions">
                  <Button
                    icon={method === 'qr' ? 'qr' : 'key'}
                    onClick={start}
                    loading={starting}
                    disabled={busy}
                  >
                    {status === 'qr'
                      ? 'Generar un QR nuevo'
                      : status === 'pairing'
                        ? 'Pedir otro código'
                        : method === 'qr'
                          ? 'Generar QR'
                          : 'Obtener código'}
                  </Button>
                  {busy ? (
                    <Button variant="ghost" icon="stop" onClick={() => stop(false)} loading={stopping}>
                      Cancelar
                    </Button>
                  ) : null}
                  {status === 'error' ? (
                    <Button variant="ghost" icon="logout" onClick={() => stop(true)}>
                      Limpiar sesión
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHeader
            icon="clock"
            title="Actividad en WhatsApp"
            subtitle="Últimos eventos de la conexión y mensajes recibidos."
            actions={
              <Button variant="ghost" size="sm" icon="refresh" onClick={() => reload(true)}>
                Actualizar
              </Button>
            }
          />
          <div className="log-console">
            {logs.length ? (
              logs.slice(0, 40).map((log, index) => (
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
                <Icon name="clock" size={16} />
                <span>Sin actividad todavía. Los eventos aparecerán acá.</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="col-side">
        <Card className="sticky-card">
          <CardHeader icon="phone" title="Cómo funciona" />
          <ol className="steps">
            <li>
              <strong>Iniciá la vinculación</strong> con QR o código de 8 dígitos.
            </li>
            <li>
              <strong>Abrí WhatsApp</strong> en tu teléfono → Dispositivos vinculados.
            </li>
            <li>
              <strong>Listo:</strong> el bot responde a los mensajes que reciba ese número.
            </li>
          </ol>
          <div className="divider" />
          <h4 className="side-title">Requisitos</h4>
          <ul className="tips">
            <li>El servidor debe estar encendido para que el bot responda.</li>
            <li>La sesión se guarda en <code>data/sessions</code> y sobrevive reinicios.</li>
            <li>Funciona con WhatsApp personal y Business (multidispositivo).</li>
          </ul>
          <div className="hint-box hint-warn">
            <Icon name="warning" size={15} />
            <span>
              Baileys es una integración no oficial. Usá el bot para atención y automatización
              moderada, evitando envíos masivos que puedan suspender el número.
            </span>
          </div>
        </Card>

        <Card className="sticky-card">
          <CardHeader icon="monitor" title="Servidor" />
          <div className="kv">
            <span>Sesión</span>
            <code>data/sessions/{bot.id.slice(0, 10)}…</code>
          </div>
          <div className="kv">
            <span>Estado</span>
            <StatusDot status={status === 'connected' ? 'connected' : status} label={STATUS_TEXT[status]} />
          </div>
          <div className="kv">
            <span>Mensajes procesados</span>
            <strong>{bot.stats.messages}</strong>
          </div>
          <div className="kv">
            <span>Respuestas enviadas</span>
            <strong>{bot.stats.replies}</strong>
          </div>
        </Card>
      </div>

      <Modal
        open={testOpen}
        onClose={() => setTestOpen(false)}
        title="Enviar mensaje de prueba"
        subtitle="Se envía desde el número vinculado a un chat de WhatsApp."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>
              Cancelar
            </Button>
            <Button icon="send" onClick={sendTest} loading={sending} disabled={!testJid.trim()}>
              Enviar
            </Button>
          </>
        }
      >
        <Field label="Número destino" hint="Con código de país, sin + ni espacios">
          <Input
            value={testJid}
            onChange={(e) => setTestJid(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="59899123456"
          />
        </Field>
        <Field label="Mensaje">
          <Input value={testText} onChange={(e) => setTestText(e.target.value)} />
        </Field>
        <p className="help-text">
          El destino debe tener WhatsApp y haber aceptado recibir mensajes de este número.
        </p>
      </Modal>
    </div>
  );
}
