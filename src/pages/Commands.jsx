import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';

const MATCH_LABEL = {
  command: 'con prefijo',
  exact: 'exacto',
  contains: 'contiene',
  startsWith: 'empieza con',
  regex: 'regex',
  any: 'cualquiera',
};

export default function Commands() {
  const { data, loading, error } = useApi('/commands');
  const [query, setQuery] = useState('');
  const [onlyEnabled, setOnlyEnabled] = useState(false);

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const commands = (data?.commands || []).filter((command) => {
      if (onlyEnabled && !command.enabled) return false;
      if (!term) return true;
      return (
        command.name.toLowerCase().includes(term) ||
        command.trigger.toLowerCase().includes(term) ||
        command.bot.name.toLowerCase().includes(term) ||
        (command.aliases || []).some((alias) => alias.toLowerCase().includes(term))
      );
    });
    const map = new Map();
    for (const command of commands) {
      if (!map.has(command.bot.id)) map.set(command.bot.id, { bot: command.bot, commands: [] });
      map.get(command.bot.id).commands.push(command);
    }
    return [...map.values()];
  }, [data, onlyEnabled, query]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Comandos</span>
          <h1>Comandos disponibles</h1>
          <p>
            Todo lo que tus bots entienden hoy, leído de la configuración guardada en el servidor.
          </p>
        </div>
        <div className="page-head-actions">
          <Link className="btn btn-primary" to="/catalogo">
            <Icon name="crown" size={16} /> Instalar más
          </Link>
        </div>
      </header>

      <div className="catalog-toolbar">
        <label className="search-box">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar comando, alias o bot"
          />
        </label>
        <button
          className={`filter-chip ${onlyEnabled ? 'is-active' : ''}`}
          onClick={() => setOnlyEnabled((value) => !value)}
        >
          <Icon name="check" size={14} /> Solo activos
        </button>
        <span className="toolbar-count">
          {loading ? 'Cargando…' : `${data?.active || 0} activos de ${data?.total || 0}`}
        </span>
      </div>

      {error ? (
        <div className="hint-box hint-warn">
          <Icon name="warning" size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {groups.map((group) => (
        <section key={group.bot.id} className="panel-card">
          <div className="panel-card-head panel-card-head-between">
            <div className="panel-card-head">
              <span className="panel-icon">{group.bot.emoji}</span>
              <div>
                <h2>{group.bot.name}</h2>
                <p>{group.commands.length} comandos configurados</p>
              </div>
            </div>
            <Link className="btn btn-ghost btn-sm" to={`/bots/${group.bot.id}/commands`}>
              Editar <Icon name="chevron" size={14} />
            </Link>
          </div>

          <div className="command-grid">
            {group.commands.map((command) => (
              <div key={command.id} className={`command-chip ${command.enabled ? '' : 'is-off'}`}>
                <div className="command-chip-top">
                  <code>
                    {group.bot.prefix}
                    {command.trigger}
                  </code>
                  <span className={`tag ${command.enabled ? 'tag-ok' : 'tag-off'}`}>
                    {command.enabled ? 'activo' : 'pausado'}
                  </span>
                </div>
                <strong>{command.name}</strong>
                <small>
                  {MATCH_LABEL[command.matchType] || command.matchType}
                  {command.aliases?.length ? ` · ${command.aliases.map((a) => `${group.bot.prefix}${a}`).join(', ')}` : ''}
                </small>
                <span className="command-usage">{command.usageCount} usos</span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {!loading && !groups.length ? (
        <div className="empty-card">
          <Icon name="terminal" size={26} />
          <h3>No hay comandos para mostrar</h3>
          <p>Instalá plugins desde el catálogo o creá comandos desde el editor del bot.</p>
          <Link className="btn btn-primary" to="/catalogo">
            Abrir catálogo
          </Link>
        </div>
      ) : null}
    </div>
  );
}
