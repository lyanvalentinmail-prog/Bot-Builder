import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell.jsx';
import Home from './pages/Home.jsx';
import Register from './pages/Register.jsx';
import Bots from './pages/Bots.jsx';
import Metrics from './pages/Metrics.jsx';
import Catalog from './pages/Catalog.jsx';
import Terms from './pages/Terms.jsx';
import Links from './pages/Links.jsx';
import Commands from './pages/Commands.jsx';
import WhatsAppChannel from './pages/WhatsAppChannel.jsx';
import Connection from './pages/Connection.jsx';
import BotWorkspace from './pages/BotWorkspace.jsx';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/registrar" element={<Register />} />
        <Route path="/bots" element={<Bots />} />
        <Route path="/metricas" element={<Metrics />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/terminos" element={<Terms />} />
        <Route path="/links" element={<Links />} />
        <Route path="/comandos" element={<Commands />} />
        <Route path="/canal" element={<WhatsAppChannel />} />
        <Route path="/conexion" element={<Connection />} />
        <Route path="/bots/:botId/:tab?" element={<BotWorkspace />} />
        <Route
          path="*"
          element={
            <div className="page page-narrow">
              <div className="empty-card">
                <h3>Página no encontrada</h3>
                <p>La ruta que buscás no existe en este panel.</p>
                <Link className="btn btn-primary" to="/">
                  Volver al inicio
                </Link>
              </div>
            </div>
          }
        />
      </Routes>
    </Shell>
  );
}
