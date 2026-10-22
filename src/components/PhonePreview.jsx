import React, { useEffect, useRef, useState } from 'react';
import { waMarkupToHtml } from '../lib/vars.js';
import { Icon } from './ui.jsx';

function timeNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function PhonePreview({
  botName = 'Bot',
  botEmoji = '🤖',
  messages = [],
  typingMessage = '',
  onSend,
  onReset,
  placeholder = 'Escribí un mensaje…',
  quickMessages = [],
  channel = 'WhatsApp',
}) {
  const [draft, setDraft] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, typingMessage]);

  const submit = (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !onSend) return;
    onSend(text);
    setDraft('');
  };

  return (
    <div className="phone-wrap">
      <div className="phone">
        <div className="phone-notch" />
        <header className="phone-header">
          <span className="phone-avatar">{botEmoji}</span>
          <div className="phone-contact">
            <strong>{botName}</strong>
            <small>{channel === 'WhatsApp' ? 'en línea' : `Bot de ${channel}`}</small>
          </div>
          <div className="phone-actions">
            {onReset ? (
              <button type="button" className="phone-reset" onClick={onReset} title="Reiniciar chat">
                <Icon name="refresh" size={15} />
              </button>
            ) : null}
            <Icon name="phone" size={15} />
          </div>
        </header>

        <div className="phone-body" ref={bodyRef}>
          <div className="phone-day">HOY</div>
          {messages.map((m, index) => (
            <div key={m.id || index} className={`bubble-row ${m.from === 'user' ? 'is-user' : 'is-bot'}`}>
              <div className={`bubble ${m.from === 'user' ? 'bubble-user' : 'bubble-bot'}`}>
                {m.image ? <img className="bubble-img" src={m.image} alt="" /> : null}
                {m.text ? (
                  <div
                    className="bubble-text"
                    dangerouslySetInnerHTML={{ __html: waMarkupToHtml(m.text) }}
                  />
                ) : null}
                {m.note ? <div className="bubble-note">{m.note}</div> : null}
                {m.buttons?.length ? (
                  <div className="bubble-buttons">
                    {m.buttons.map((b, i) => (
                      <button
                        key={`${b.label}-${i}`}
                        type="button"
                        className="bubble-button"
                        onClick={() => onSend?.(b.command || b.label)}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <span className="bubble-meta">
                  {m.time || timeNow()}
                  {m.from !== 'user' ? <Icon name="check" size={12} /> : null}
                </span>
                {m.reaction ? (
                  <span className="bubble-reaction" title="Reacción enviada por el bot">
                    {m.reaction}
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          {typingMessage ? (
            <div className="bubble-row is-bot">
              <div className="bubble bubble-bot bubble-typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
                <span className="typing-label">escribiendo…</span>
              </div>
            </div>
          ) : null}

          {!messages.length && !typingMessage ? (
            <div className="phone-empty">
              <Icon name="whatsapp" size={26} />
              <p>Probá tu bot acá.</p>
              <small>Los mensajes que escribas ejecutan el motor real.</small>
            </div>
          ) : null}
        </div>

        {quickMessages.length ? (
          <div className="phone-quick">
            {quickMessages.map((q) => (
              <button key={q} type="button" onClick={() => onSend?.(q)}>
                {q}
              </button>
            ))}
          </div>
        ) : null}

        <form className="phone-composer" onSubmit={submit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            aria-label="Mensaje de prueba"
          />
          <button type="submit" className="phone-send" aria-label="Enviar" disabled={!draft.trim()}>
            <Icon name="send" size={16} />
          </button>
        </form>
      </div>
      {onSend ? <p className="phone-caption">Simulación local: no envía nada a WhatsApp ni Teams.</p> : null}
    </div>
  );
}
