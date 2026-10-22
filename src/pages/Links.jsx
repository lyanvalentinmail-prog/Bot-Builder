import React from 'react';
import { CopyButton, Icon } from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';

export default function Links() {
  const { data, loading, error } = useApi('/links');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = data?.publicUrl || origin;

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div>
          <span className="eyebrow">Links</span>
          <h1>Enlaces oficiales</h1>
          <p>Documentación, repositorio y estado del servicio de esta instancia.</p>
        </div>
      </header>

      {error ? (
        <div className="hint-box hint-warn">
          <Icon name="warning" size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="link-list">
        {(data?.links || []).map((link) => {
          const external = /^https?:/i.test(link.url);
          return (
            <div key={link.id} className="link-row">
              <span className="link-icon">
                <Icon name={link.icon === 'github' ? 'github' : link.icon} size={20} />
              </span>
              <div className="link-body">
                <strong>{link.name}</strong>
                <p>{link.description}</p>
                <code>{link.url}</code>
              </div>
              <div className="link-actions">
                <CopyButton text={link.url} label="Copiar" />
                {external ? (
                  <a className="btn btn-ghost btn-sm" href={link.url} target="_blank" rel="noreferrer">
                    Abrir <Icon name="chevron" size={14} />
                  </a>
                ) : (
                  <a className="btn btn-ghost btn-sm" href={link.url}>
                    Abrir <Icon name="chevron" size={14} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
        {loading ? <div className="skeleton-block" /> : null}
      </div>

      <section className="panel-card">
        <div className="panel-card-head">
          <span className="panel-icon">
            <Icon name="globe" size={18} />
          </span>
          <div>
            <h2>URL de esta instalación</h2>
            <p>Se usa para webhooks y para compartir el panel con el equipo.</p>
          </div>
        </div>
        <div className="copy-row">
          <code>{currentUrl || 'Sin definir'}</code>
          <CopyButton text={currentUrl} label="Copiar URL" />
        </div>
        {!data?.publicUrl ? (
          <p className="help-text">
            Definí <code>PUBLIC_URL</code> en el servidor para que los enlaces sean estables.
          </p>
        ) : null}
      </section>
    </div>
  );
}
