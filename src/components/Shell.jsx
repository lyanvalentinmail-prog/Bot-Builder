import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from './ui.jsx';

export const NAV_GROUPS = [
  {
    title: 'Navegación',
    items: [
      { to: '/', label: 'Inicio', sub: 'Panel principal', icon: 'home', end: true },
      { to: '/registrar', label: 'Registrar', sub: 'Activar nuevo bot', icon: 'plus' },
      { to: '/bots', label: 'Mis Bots', sub: 'Sesiones activas', icon: 'bot' },
      { to: '/metricas', label: 'Métricas', sub: 'Estado del servidor', icon: 'chart' },
      { to: '/catalogo', label: 'Catálogo', sub: 'Comandos y plugins', icon: 'crown' },
      { to: '/terminos', label: 'Términos', sub: 'Términos y privacidad', icon: 'shield' },
      { to: '/links', label: 'Links', sub: 'Enlaces oficiales', icon: 'link' },
      { to: '/comandos', label: 'Comandos', sub: 'Ver comandos disponibles', icon: 'terminal' },
    ],
  },
  {
    title: 'Soporte',
    items: [
      { to: '/canal', label: 'Canal WhatsApp', sub: 'Vincular y ver grupos', icon: 'whatsapp' },
      { to: '/conexion', label: 'Conexión', sub: 'Proveedor de servidores', icon: 'globe' },
    ],
  },
];

const BOTTOM = [
  { to: '/', label: 'Inicio', icon: 'home', end: true },
  { to: '/registrar', label: 'Registrar', icon: 'plus' },
  { to: '/bots', label: 'Mis Bots', icon: 'bot' },
  { to: '/metricas', label: 'Métricas', icon: 'chart' },
  { to: '/catalogo', label: 'Catálogo', icon: 'crown' },
];

const itemClass = ({ isActive }) => `drawer-item ${isActive ? 'is-active' : ''}`;

export function Drawer({ open, onClose }) {
  return (
    <>
      <div
        className={`drawer-backdrop ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <header className="drawer-head">
          <Link to="/" className="drawer-profile" onClick={onClose}>
            <span className="drawer-avatar">✦</span>
            <span className="drawer-profile-text">
              <strong>BotForge</strong>
              <small>PANEL DE GRUPOS</small>
            </span>
          </Link>
          <button className="icon-btn drawer-close" onClick={onClose} aria-label="Cerrar menú">
            <Icon name="x" size={18} />
          </button>
        </header>

        <div className="drawer-body">
          {NAV_GROUPS.map((group) => (
            <section key={group.title} className="drawer-group">
              <span className="drawer-group-title">{group.title}</span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={itemClass}
                  onClick={onClose}
                >
                  <span className="drawer-item-icon">
                    <Icon name={item.icon} size={19} />
                  </span>
                  <span className="drawer-item-text">
                    <strong>{item.label}</strong>
                    <small>{item.sub}</small>
                  </span>
                  <Icon name="chevron" size={16} className="drawer-chevron" />
                </NavLink>
              ))}
            </section>
          ))}
        </div>

        <footer className="drawer-foot">
          <Link to="/registrar" className="drawer-cta" onClick={onClose}>
            <span>REGISTRAR BOT</span>
            <Icon name="plus" size={16} />
          </Link>
          <p className="drawer-note">v1.0 · bots para grupos de WhatsApp</p>
        </footer>
      </aside>
    </>
  );
}

export default function Shell({ children }) {
  const [open, setOpen] = useState(false);
  const [mono, setMono] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('theme-mono', mono);
    return () => document.body.classList.remove('theme-mono');
  }, [mono]);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`app-shell ${open ? 'drawer-abierto' : ''}`}>
      <header className="topbar">
        <Link to="/" className="topbar-brand">
          <span className="brand-tile">✦</span>
        </Link>
        <div className="topbar-actions">
          <button
            className={`icon-btn topbar-moon ${mono ? 'is-on' : ''}`}
            onClick={() => setMono((value) => !value)}
            title={mono ? 'Volver al acento violeta' : 'Acento medianoche'}
            aria-label="Cambiar acento"
          >
            <Icon name="moon" size={19} />
          </button>
          <button className="topbar-user" onClick={() => setOpen(true)} aria-label="Abrir menú">
            <span className="topbar-avatar">BF</span>
            <Icon name="chevron" size={15} className="topbar-user-chevron" />
          </button>
        </div>
      </header>

      <Drawer open={open} onClose={() => setOpen(false)} />

      <main className="app-main">{children}</main>

      <nav className="bottom-nav" aria-label="Navegación principal">
        {BOTTOM.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-item ${isActive ? 'is-active' : ''}`}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button className="bottom-item" onClick={() => setOpen(true)}>
          <Icon name="menu" size={21} />
          <span>Menú</span>
        </button>
      </nav>
    </div>
  );
}
