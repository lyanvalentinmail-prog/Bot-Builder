import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { Button, Icon, useToast } from '../components/ui.jsx';

export default function Catalog() {
  const { data: catalog, loading } = useApi('/catalog');
  const { data: botsData } = useApi('/bots');
  const { notify } = useToast();

  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [botId, setBotId] = useState('');
  const [installing, setInstalling] = useState(null);

  const bots = botsData?.bots || [];
  const selectedBot = bots.find((bot) => bot.id === botId) || bots[0] || null;
  const activeBotId = selectedBot?.id || '';

  const { data: botData, reload: reloadBot } = useApi(activeBotId ? `/bots/${activeBotId}` : null, {
    deps: [activeBotId],
    immediate: Boolean(activeBotId),
  });
  const installedTriggers = useMemo(
    () => new Set((botData?.bot?.commands || []).map((command) => command.trigger.toLowerCase())),
    [botData],
  );

  const plugins = useMemo(() => {
    const list = catalog?.plugins || [];
    const term = query.trim().toLowerCase();
    return list.filter((plugin) => {
      const matchCategory = category === 'all' || plugin.category === category;
      const matchQuery =
        !term ||
        plugin.name.toLowerCase().includes(term) ||
        plugin.description.toLowerCase().includes(term) ||
        plugin.trigger.toLowerCase().includes(term) ||
        (plugin.tags || []).some((tag) => tag.includes(term));
      return matchCategory && matchQuery;
    });
  }, [catalog, category, query]);

  const install = async (plugin) => {
    if (!activeBotId) {
      notify('Primero registrá un bot', 'error');
      return;
    }
    setInstalling(plugin.id);
    try {
      await api.post(`/bots/${activeBotId}/catalog/${plugin.id}`);
      notify(`«${plugin.name}» instalado en ${selectedBot.name}`);
      await reloadBot({ silent: true });
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1>Comandos y plugins</h1>
          <p>
            Automatizaciones listas para instalar en un bot existente. Al instalarlas se crean como
            comandos reales, editables y probables.
          </p>
        </div>
        <div className="page-head-actions">
          <Link className="btn btn-ghost" to="/comandos">
            <Icon name="terminal" size={16} /> Ver comandos activos
          </Link>
        </div>
      </header>

      <div className="catalog-toolbar">
        <div className="catalog-bot-select">
          <span className="catalog-bot-label">Instalar en</span>
          {bots.length ? (
            <select
              className="input select"
              value={activeBotId}
              onChange={(event) => setBotId(event.target.value)}
            >
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.emoji} {bot.name}
                </option>
              ))}
            </select>
          ) : (
            <Link className="btn btn-primary btn-sm" to="/registrar">
              <Icon name="plus" size={15} /> Registrar bot
            </Link>
          )}
        </div>
        <label className="search-box">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, comando o etiqueta"
          />
        </label>
      </div>

      <div className="chip-row">
        <button
          className={`filter-chip ${category === 'all' ? 'is-active' : ''}`}
          onClick={() => setCategory('all')}
        >
          Todos
          <span>{catalog?.plugins?.length || 0}</span>
        </button>
        {(catalog?.categories || []).map((item) => {
          const count = (catalog?.plugins || []).filter((plugin) => plugin.category === item.id).length;
          return (
            <button
              key={item.id}
              className={`filter-chip ${category === item.id ? 'is-active' : ''}`}
              onClick={() => setCategory(item.id)}
            >
              {item.emoji} {item.name}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="catalog-grid">
        {plugins.map((plugin) => {
          const installed = installedTriggers.has(plugin.trigger.toLowerCase());
          return (
            <article key={plugin.id} className={`catalog-card ${installed ? 'is-installed' : ''}`}>
              <div className="catalog-card-top">
                <span className="catalog-emoji">{plugin.emoji}</span>
                <span className="catalog-category">
                  {catalog?.categories?.find((item) => item.id === plugin.category)?.name || plugin.category}
                </span>
              </div>
              <h3>{plugin.name}</h3>
              <p>{plugin.description}</p>
              <div className="catalog-meta">
                <code>!{plugin.trigger}</code>
                {(plugin.aliasList || []).slice(0, 2).map((alias) => (
                  <code key={alias}>!{alias}</code>
                ))}
                <span className="catalog-type">{plugin.replyType}</span>
              </div>
              <div className="catalog-tags">
                {(plugin.tags || []).map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
              {installed ? (
                <div className="catalog-installed">
                  <Icon name="check" size={15} /> Ya está en {selectedBot?.name}
                </div>
              ) : (
                <Button
                  size="sm"
                  icon="plus"
                  variant="secondary"
                  onClick={() => install(plugin)}
                  loading={installing === plugin.id}
                  disabled={!activeBotId}
                >
                  Instalar
                </Button>
              )}
            </article>
          );
        })}

        {!loading && !plugins.length ? (
          <div className="empty-card">
            <Icon name="search" size={24} />
            <h3>Sin resultados</h3>
            <p>Probá con otra categoría o con otra palabra.</p>
          </div>
        ) : null}
        {loading ? <div className="catalog-card skeleton-card" /> : null}
      </div>
    </div>
  );
}
