import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Button, Icon, Input, useToast } from '../components/ui.jsx';

const EMOJIS = ['💬', '🎧', '🛍️', '👥', '🛡️', '📣', '🎟️', '🤖'];
const STEP_TITLES = [
  'Elige tu instancia',
  'Elige tu servidor',
  'Vinculación',
  'Datos del bot',
  'Ingresa el código',
];

const digits = (value) => String(value || '').replace(/[^\d]/g, '');

function StepRail({ step, onGo }) {
  return (
    <div className="wizard-rail" aria-label={`Paso ${step} de 5`}>
      {[1, 2, 3, 4, 5].map((item) => {
        const done = item < step;
        const current = item === step;
        return (
          <React.Fragment key={item}>
            {item > 1 ? <span className={`wizard-line ${item <= step ? 'is-on' : ''}`} /> : null}
            <button
              type="button"
              className={`wizard-dot ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}
              onClick={() => (done ? onGo(item) : undefined)}
              disabled={!done}
              aria-current={current ? 'step' : undefined}
              aria-label={`Paso ${item}`}
            >
              {done ? <Icon name="check" size={17} /> : item}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function Register() {
  const [meta, setMeta] = useState(null);
  const [botsCount, setBotsCount] = useState(0);
  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState('starter');
  const [listOpen, setListOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('pairing');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💬');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [bot, setBot] = useState(null);
  const [link, setLink] = useState({
    phase: 'idle',
    code: null,
    qr: null,
    error: null,
    expiresAt: null,
    now: Date.now(),
    connected: false,
  });
  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const { notify } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/meta'), api.get('/bots')])
      .then(([metaData, botsData]) => {
        setMeta(metaData);
        setBotsCount(botsData.bots.length);
        const first = metaData.templates?.find((item) => item.id === 'starter') || metaData.templates?.[0];
        if (first) {
          setTemplateId(first.id);
          setName(first.name);
          setEmoji(first.emoji);
          setDescription(first.description || '');
        }
      })
      .catch((error) => notify(error.message, 'error'));
  }, [notify]);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setLink((prev) => (prev.expiresAt ? { ...prev, now: Date.now() } : prev));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  useEffect(
    () => () => {
      clearInterval(pollRef.current);
    },
    [],
  );

  const templates = meta?.templates || [];
  const template = templates.find((item) => item.id === templateId) || templates[0] || null;
  const deploy = meta?.deploy;

  const serverLabel = useMemo(() => {
    const mode =
      deploy?.mode === 'serverless'
        ? 'serverless'
        : deploy?.ephemeral
          ? 'sin disco'
          : 'persistente';
    const host = deploy?.publicUrl
      ? deploy.publicUrl.replace(/^https?:\/\//, '')
      : typeof window !== 'undefined'
        ? window.location.host
        : 'este servidor';
    return `${host} · ${mode}`;
  }, [deploy]);

  const chooseTemplate = (option) => {
    setTemplateId(option.id);
    setName(option.name);
    setEmoji(option.emoji);
    setDescription(option.description || '');
    setListOpen(false);
  };

  const secondsLeft = link.expiresAt
    ? Math.max(0, Math.ceil((link.expiresAt - link.now) / 1000))
    : 0;

  const stopPolling = () => {
    clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const pollStatus = useCallback((botId) => {
    stopPolling();
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const data = await api.get(`/bots/${botId}/whatsapp`);
        const status = data.whatsapp || {};
        setLink((prev) => ({
          ...prev,
          code: status.pairingCode || prev.code,
          qr: status.qr || prev.qr,
          error: status.lastError || prev.error,
          connected: status.status === 'connected',
          expiresAt:
            status.pairingCode && !prev.code ? Date.now() + 60_000 : prev.expiresAt,
          phase:
            status.status === 'connected'
              ? 'connected'
              : status.pairingCode || prev.code
                ? 'code'
                : status.qr || prev.qr
                  ? 'qr'
                  : status.status === 'error'
                    ? 'error'
                    : prev.phase,
        }));
        if (attempts > 45) {
          stopPolling();
          setLink((prev) =>
            prev.code || prev.qr || prev.connected
              ? { ...prev, now: Date.now() }
              : {
                  ...prev,
                  now: Date.now(),
                  phase: 'error',
                  error: prev.error || 'El servidor no devolvió un código a tiempo. Reintentá la vinculación.',
                },
          );
        } else if (status.status === 'connected') {
          stopPolling();
        }
      } catch {
        /* el paso 5 muestra el estado que ya tenemos */
      }
    }, 2000);
  }, []);

  const startLinking = useCallback(
    async (botId) => {
      setLink({
        phase: 'starting',
        code: null,
        qr: null,
        error: null,
        expiresAt: null,
        now: Date.now(),
        connected: false,
      });
      try {
        await api.post(`/bots/${botId}/whatsapp/start`, {
          method,
          phone: digits(phone),
        });
        setLink((prev) => ({ ...prev, phase: 'waiting' }));
        pollStatus(botId);
      } catch (error) {
        setLink((prev) => ({ ...prev, phase: 'error', error: error.message }));
      }
    },
    [method, phone, pollStatus],
  );

  const createBot = async () => {
    if (!name.trim()) {
      notify('Ponele un nombre al bot', 'error');
      return;
    }
    setCreating(true);
    try {
      if (bot) {
        // El bot ya se creó en este asistente: solo actualizamos sus datos.
        const { bot: updated } = await api.put(`/bots/${bot.id}`, {
          name: name.trim(),
          emoji,
          description: description.trim(),
        });
        setBot(updated);
        setStep(5);
        await startLinking(updated.id);
        return;
      }
      const { bot: created } = await api.post('/bots', {
        template: templateId,
        name: name.trim(),
        emoji,
        description: description.trim(),
      });
      setBot(created);
      setStep(5);
      await startLinking(created.id);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const canContinue = step === 1 ? Boolean(templateId) : step === 3 ? true : true;
  const pairingDisabled = method === 'pairing' && digits(phone).length < 8;

  const next = () => {
    if (step === 4) {
      createBot();
      return;
    }
    if (step === 3 && pairingDisabled) {
      notify('Escribí el número con código de país para el código de 8 dígitos', 'error');
      return;
    }
    setStep((value) => Math.min(5, value + 1));
  };

  return (
    <div className="page page-wizard">
      <StepRail step={step} onGo={(target) => setStep(target)} />

      <section className="wizard-card">
        <span className="step-pill">PASO {step}</span>
        <h1 className="wizard-title">{STEP_TITLES[step - 1]}</h1>

        {step === 1 ? (
          <>
            <p className="wizard-sub">Selecciona el tipo de instancia que deseas activar.</p>
            <span className="wizard-label">Instancia</span>
            <button
              type="button"
              className="select-row"
              onClick={() => setListOpen((value) => !value)}
              aria-expanded={listOpen}
            >
              <span className="select-row-icon">
                <Icon name="bot" size={20} />
              </span>
              <span className="select-row-text">
                <strong>{template?.name || 'Cargando instancias…'}</strong>
                <small>{template?.description || 'Instancia de bot para grupos'}</small>
              </span>
              <Icon name="chevron" size={17} className={listOpen ? 'rot-up' : 'rot-down'} />
            </button>

            {listOpen ? (
              <div className="select-list">
                {templates.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`select-option ${option.id === templateId ? 'is-active' : ''}`}
                    onClick={() => chooseTemplate(option)}
                  >
                    <span className={`select-option-emoji accent-${option.accent}`}>{option.emoji}</span>
                    <span>
                      <strong>{option.name}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className="select-option-tag">{option.tag}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="wizard-sub">Selecciona el proveedor y el servidor donde correrá tu bot.</p>
            <span className="wizard-label">Conexión</span>
            <div className="select-row is-static">
              <span className="select-row-icon select-row-icon-wa">
                <Icon name="whatsapp" size={20} />
              </span>
              <span className="select-row-text">
                <strong>WhatsApp</strong>
                <small>Bot exclusivo para grupos</small>
              </span>
              <span className="dot-live" />
            </div>

            <span className="wizard-label">Servidor</span>
            <div className="select-row is-static">
              <span className="server-dot" />
              <span className="select-row-text">
                <strong>{serverLabel}</strong>
                <small>
                  {botsCount}/100 instancias ·{' '}
                  {deploy?.persistentChannels ? 'sesiones persistentes' : 'sin sesiones persistentes'}
                </small>
              </span>
              <Icon name="chevron" size={17} className="rot-down" />
            </div>
            <p className="wizard-help">
              Se muestran los servidores disponibles. Si el plan no tiene disco, la sesión de
              WhatsApp se pierde al reiniciar.
            </p>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <p className="wizard-sub">Ingresa el número del bot y elige cómo vincularlo.</p>
            <label className="wizard-label" htmlFor="wizard-phone">
              Número del bot
            </label>
            <Input
              id="wizard-phone"
              className="wizard-input"
              value={phone}
              inputMode="numeric"
              placeholder="+598 99 123 456"
              onChange={(event) => {
                const raw = event.target.value;
                const clean = digits(raw);
                setPhone(clean ? `+${clean}` : '');
              }}
            />
            <p className="wizard-help">WhatsApp enviará el código de vinculación a este número.</p>

            <span className="wizard-label">Cómo quieres vincularlo</span>
            <div className="option-stack">
              <button
                type="button"
                className={`option-card ${method === 'qr' ? 'is-active' : ''}`}
                onClick={() => setMethod('qr')}
              >
                <span className="option-icon">
                  <Icon name="qr" size={20} />
                </span>
                <span className="option-text">
                  <strong>Código QR</strong>
                  <small>Escaneas un código desde el dispositivo del bot.</small>
                </span>
              </button>
              <button
                type="button"
                className={`option-card ${method === 'pairing' ? 'is-active' : ''}`}
                onClick={() => setMethod('pairing')}
              >
                <span className="option-icon">
                  <Icon name="key" size={20} />
                </span>
                <span className="option-text">
                  <strong>Código de 8 dígitos</strong>
                  <small>Lo escribes en el dispositivo del bot.</small>
                </span>
              </button>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <p className="wizard-sub">Ponle nombre a la instancia. Después vas a poder editar todo.</p>
            <label className="wizard-label" htmlFor="wizard-name">
              Nombre del bot
            </label>
            <Input
              id="wizard-name"
              className="wizard-input"
              value={name}
              maxLength={60}
              placeholder="Ej: Equipo Ventas"
              onChange={(event) => setName(event.target.value)}
            />

            <span className="wizard-label">Ícono</span>
            <div className="emoji-row">
              {EMOJIS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`emoji-btn ${emoji === option ? 'is-active' : ''}`}
                  onClick={() => setEmoji(option)}
                >
                  {option}
                </button>
              ))}
              <Input
                className="emoji-input"
                value={emoji}
                maxLength={4}
                onChange={(event) => setEmoji(event.target.value)}
                aria-label="Emoji personalizado"
              />
            </div>

            <label className="wizard-label" htmlFor="wizard-description">
              Descripción
            </label>
            <Input
              id="wizard-description"
              className="wizard-input"
              value={description}
              maxLength={240}
              placeholder="Para qué lo va a usar el grupo"
              onChange={(event) => setDescription(event.target.value)}
            />

            <div className="wizard-summary">
              <span>
                <Icon name="bot" size={15} /> {template?.name || 'Instancia'} · {emoji} {name || 'sin nombre'}
              </span>
              <span>
                <Icon name="whatsapp" size={15} /> {method === 'qr' ? 'Vinculación por QR' : 'Código de 8 dígitos'}
                {phone ? ` · ${phone}` : ''}
              </span>
            </div>
          </>
        ) : null}

        {step === 5 ? (
          <>
            <p className="wizard-sub">
              Desde el teléfono que va a ser el bot, abre WhatsApp y{' '}
              {method === 'pairing' ? 'escribe este código.' : 'escanea este código.'}
            </p>

            {link.connected ? (
              <div className="wizard-success">
                <span className="wizard-success-icon">
                  <Icon name="check" size={24} />
                </span>
                <div>
                  <strong>¡WhatsApp conectado!</strong>
                  <p>
                    «{bot?.name}» ya está vinculado. Sumá el número al grupo y escribí{' '}
                    <code>!menu</code>.
                  </p>
                </div>
              </div>
            ) : null}

            {!link.connected && method === 'pairing' && link.code ? (
              <>
                <div className="code-display" aria-label={`Código ${link.code}`}>
                  {String(link.code)
                    .match(/.{1,4}/g)
                    ?.map((group, index) => (
                      <React.Fragment key={`${group}-${index}`}>
                        {index > 0 ? <span className="code-dash">—</span> : null}
                        <span className="code-group">
                          {group.split('').map((char, charIndex) => (
                            <span key={`${char}-${charIndex}`} className="code-char">
                              {char}
                            </span>
                          ))}
                        </span>
                      </React.Fragment>
                    ))}
                </div>
                <button
                  type="button"
                  className="code-copy"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link.code);
                      notify('Código copiado');
                    } catch {
                      notify('No se pudo copiar', 'error');
                    }
                  }}
                >
                  <Icon name="copy" size={16} /> Copiar código
                </button>
                <p className={`code-expiry ${secondsLeft === 0 ? 'is-expired' : ''}`}>
                  {secondsLeft > 0 ? `EXPIRA EN ${secondsLeft}S` : 'CÓDIGO VENCIDO'}
                </p>
              </>
            ) : null}

            {!link.connected && !link.error && method === 'pairing' && !link.code ? (
              <div className="wizard-waiting">
                <span className="spinner spinner-lg" />
                <div>
                  <strong>Generando el código…</strong>
                  <p>WhatsApp está preparando la vinculación del número {phone || 'del bot'}.</p>
                </div>
              </div>
            ) : null}

            {!link.connected && method === 'qr' && link.qr ? (
              <div className="wizard-qr">
                <img src={link.qr} alt="Código QR de WhatsApp" />
                <p className="wizard-help">Abrí WhatsApp → Dispositivos vinculados → Vincular un dispositivo.</p>
              </div>
            ) : null}

            {!link.connected && !link.error && method === 'qr' && !link.qr ? (
              <div className="wizard-waiting">
                <span className="spinner spinner-lg" />
                <div>
                  <strong>Generando el QR…</strong>
                  <p>Puede tardar unos segundos.</p>
                </div>
              </div>
            ) : null}

            {link.error && !link.connected ? (
              <div className="hint-box hint-warn">
                <Icon name="warning" size={16} />
                <span>
                  <strong>No se pudo completar la vinculación.</strong> {link.error}
                  {link.phase !== 'error' ? ' Reintentá o vinculá el número más tarde.' : ''}
                </span>
              </div>
            ) : null}

            {!link.connected ? (
              <>
                <ol className="wizard-instructions">
                  <li>Abrí WhatsApp en el teléfono del bot.</li>
                  <li>En Android tocá <strong>Menú ⋮</strong>; en iPhone, <strong>Ajustes ⚙</strong>.</li>
                  <li>
                    Entrá en <strong>Dispositivos vinculados</strong> y tocá <strong>Vincular dispositivo</strong>.
                  </li>
                  <li>
                    Elegí <strong>{method === 'pairing' ? 'Vincular con número de teléfono' : 'Escanear código QR'}</strong>{' '}
                    {method === 'pairing' ? 'e ingresá el código.' : 'y apuntá al código.'}
                  </li>
                </ol>
                <div className="wizard-actions wizard-actions-split">
                  <Button variant="ghost" onClick={() => setStep(3)}>
                    Cambiar datos
                  </Button>
                  <Button
                    variant="secondary"
                    icon="refresh"
                    onClick={() => startLinking(bot.id)}
                    loading={link.phase === 'starting'}
                  >
                    {method === 'pairing' ? 'Generar otro código' : 'Generar otro QR'}
                  </Button>
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {step < 5 ? (
          <div className={`wizard-actions ${step > 1 ? 'wizard-actions-split' : ''}`}>
            {step > 1 ? (
              <Button variant="ghost" icon="arrowLeft" onClick={() => setStep((value) => value - 1)}>
                Atrás
              </Button>
            ) : null}
            <button
              type="button"
              className="continue-btn"
              onClick={next}
              disabled={!canContinue || creating}
            >
              {creating ? <span className="spinner" /> : null}
              {step === 4 ? (bot ? 'Guardar y continuar' : 'Crear bot') : 'Continuar'}
              <Icon name="chevron" size={18} />
            </button>
          </div>
        ) : (
          <div className="wizard-actions wizard-actions-split">
            {!link.connected ? (
              <Button variant="ghost" onClick={() => navigate(`/bots/${bot?.id}/whatsapp`)}>
                Vincular más tarde
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => navigate(`/bots/${bot?.id}/commands`)}>
                Abrir el bot
              </Button>
            )}
            <Link className="btn btn-secondary" to="/bots">
              Ir a Mis Bots
            </Link>
          </div>
        )}
      </section>

      <p className="wizard-foot">
        Los datos del bot se guardan en este servidor. Podés editarlo o eliminarlo desde{' '}
        <Link to="/bots">Mis Bots</Link>.
      </p>
    </div>
  );
}
