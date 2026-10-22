import React, { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import BotWorkspace from './pages/BotWorkspace.jsx';
import { Icon, StatusDot } from './components/ui.jsx';
import { api } from './lib/api.js';

function Sidebar() {
  const [bots, setBots] = useState([]);
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    api
      .get('/bots')
      .then((data) => alive && setBots(data.bots))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [location.pathname]);

  return (
    <aside className="sidebar">
      <Link to="/" className="brand">
        <span className="brand-mark">
          <Icon name="bot" size={22} />
        </span>
        <span className="brand-text">
          <strong>BotForge</strong>
          <small>Bots para WhatsApp y Teams</small>
        </span>
      </Link>

      <nav className="side-nav">
        <NavLink to="/" end className={({ isActive }) => `side-link ${isActive ? 'is-active' : ''}`}>
          <Icon name="grid" size={17} />
          <span>Mis bots</span>
        </NavLink>
      </nav>

      <div className="side-section">
        <span className="side-title">Bots recientes</span>
        <div className="side-bots">
          {bots.slice(0, 6).map((bot) => (
            <NavLink
              key={bot.id}
              to={`/bots/${bot.id}/commands`}
              className={({ isActive }) => `side-bot ${isActive ? 'is-active' : ''}`}
            >
              <span className="side-bot-emoji">{bot.emoji}</span>
              <span className="side-bot-body">
                <span className="side-bot-name">{bot.name}</span>
                <span className="side-bot-meta">
                  <StatusDot
                    status={bot.whatsapp.connected ? 'connected' : bot.teams.status === 'ready' ? 'ready' : 'disconnected'}
                    label={bot.whatsapp.connected ? 'WhatsApp' : bot.teams.status === 'ready' ? 'Teams' : 'sin conectar'}
                  />
                </span>
              </span>
            </NavLink>
          ))}
          {!bots.length ? <span className="side-empty">Todavía no hay bots</span> : null}
        </div>
      </div>

      <div className="side-footer">
        <span className="side-note">
          <Icon name="sparkles" size={14} /> Motor Baileys + Bot Framework
        </span>
        <span className="side-note muted">Los datos se guardan en tu servidor.</span>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bots/:botId/:tab?" element={<BotWorkspace />} />
          <Route
            path="*"
            element={
              <div className="page">
                <div className="empty">
                  <h4>Página no encontrada</h4>
                  <Link className="btn btn-primary" to="/">
                    Volver al inicio
                  </Link>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
