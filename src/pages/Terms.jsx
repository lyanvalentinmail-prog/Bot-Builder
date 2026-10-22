import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Icon } from '../components/ui.jsx';
import { useApi } from '../lib/useApi.js';

const SECTIONS = [
  {
    icon: 'shield',
    title: 'Uso aceptable',
    body: [
      'BotForge está pensado para automatizar grupos de WhatsApp de equipos, comunidades y negocios. El bot ignora los chats privados por diseño.',
      'No está permitido usar el servicio para envío masivo de publicidad no solicitada, suplantación de identidad, acoso o cualquier actividad que viole los términos de WhatsApp.',
    ],
  },
  {
    icon: 'lock',
    title: 'Tus datos',
    body: [
      'La configuración de los bots, las plantillas de texto y las sesiones de WhatsApp se guardan en el servidor donde desplegás este proyecto, no en servicios de terceros de BotForge.',
      'El contenido de los mensajes no se envía a ningún servicio externo: el motor procesa el texto localmente y responde con lo que configuraste.',
    ],
  },
  {
    icon: 'whatsapp',
    title: 'Integración con WhatsApp',
    body: [
      'La vinculación se hace con Baileys, una implementación no oficial de WhatsApp Web. El número puede ser suspendido si se usa para spam.',
      'Recomendamos usar un número dedicado al equipo, mantener un volumen de mensajes moderado y revisar periódicamente la sesión.',
    ],
  },
  {
    icon: 'warning',
    title: 'Responsabilidad',
    body: [
      'El software se entrega «tal cual», sin garantías de disponibilidad continua. Si el servidor se apaga, duerme o se reinicia sin disco persistente, el bot deja de responder.',
      'Vos sos responsable del contenido configurado en los comandos y de los permisos que le des al número dentro del grupo.',
    ],
  },
];

export default function Terms() {
  const { data: meta } = useApi('/meta');

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <div>
          <span className="eyebrow">Términos</span>
          <h1>Términos y privacidad</h1>
          <p>
            Resumen claro de cómo funciona BotForge {meta?.version ? `v${meta.version}` : ''} y qué se
            espera de quien lo usa.
          </p>
        </div>
      </header>

      <div className="terms-list">
        {SECTIONS.map((section) => (
          <Card key={section.title} className="term-card">
            <span className="panel-icon">
              <Icon name={section.icon} size={18} />
            </span>
            <div>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="term-footer">
        <p>
          Al registrar un bot aceptás estos términos. Si tenés dudas, revisá la{' '}
          <Link to="/conexion">configuración del servidor</Link> o los{' '}
          <Link to="/links">enlaces oficiales</Link>.
        </p>
        <p className="muted small">Última actualización: octubre de 2026.</p>
      </Card>
    </div>
  );
}
