import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/* ------------------------------- iconos -------------------------------- */

const ICONS = {
  bot: 'M12 2a2 2 0 0 1 2 2v1h1a4 4 0 0 1 4 4v2h1a1 1 0 1 1 0 2h-1v3a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-3H4a1 1 0 1 1 0-2h1V9a4 4 0 0 1 4-4h1V4a2 2 0 0 1 2-2Zm-2.5 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM9 17h6a3 3 0 0 1-6 0Z',
  plus: 'M12 5v14M5 12h14',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  command:
    'M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z',
  smile:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-4-9a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 8 12Zm8-1.25a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0ZM8.5 15a4.5 4.5 0 0 0 7 0',
  text: 'M5 6h14M5 11h14M5 16h8',
  image:
    'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 11h14l-4.5-6-3.5 4.5-2.5-3L5 16Zm3-6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5c0 .6-.06 1.2-.17 1.76l2 1.55-2 3.46-2.36-.95c-.9.74-1.94 1.3-3.07 1.62L14 22h-4l-.4-2.56a8.3 8.3 0 0 1-3.07-1.62l-2.36.95-2-3.46 2-1.55A8.6 8.6 0 0 1 4 12c0-.6.06-1.2.17-1.76l-2-1.55 2-3.46 2.36.95c.9-.74 1.94-1.3 3.07-1.62L10 2h4l.4 2.56a8.3 8.3 0 0 1 3.07 1.62l2.36-.95 2 3.46-2 1.55c.11.56.17 1.16.17 1.76Z',
  whatsapp:
    'M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2 22l5.36-1.4a9.8 9.8 0 0 0 4.68 1.2h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.47 2 12.04 2Zm5.76 14.02c-.24.68-1.4 1.3-1.94 1.34-.5.05-1.12.07-1.8-.11-.42-.11-.96-.3-1.65-.6-2.9-1.25-4.8-4.17-4.94-4.37-.15-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.77-.36l.55.01c.18 0 .41-.07.64.49.24.58.82 2 .89 2.14.07.15.12.32.02.51-.1.2-.15.32-.3.49l-.45.53c-.15.15-.3.31-.13.61.17.3.75 1.24 1.61 2.01 1.11.99 2.04 1.3 2.33 1.44.29.15.46.12.63-.07.18-.2.73-.85.93-1.14.2-.29.39-.24.66-.14.27.1 1.69.8 1.98.94.29.15.48.22.55.34.07.13.07.73-.17 1.41Z',
  play: 'M8 5.5v13l11-6.5-11-6.5Z',
  trash: 'M4 7h16M9 7V5h6v2m-8 0v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7',
  copy:
    'M9 3h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-2M6 7h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z',
  check: 'M4 12.5 9 17.5 20 6.5',
  x: 'M6 6l12 12M18 6 6 18',
  link: 'M9.5 14.5 14.5 9.5M7 12l-2 2a3.5 3.5 0 0 0 5 5l2-2m3-3 2-2a3.5 3.5 0 0 0-5-5l-2 2',
  stop: 'M7 7h10v10H7z',
  qr: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 3h3v3h-3v-3Zm3-3h3v3h-3v-3Z',
  key: 'M15 7a4 4 0 1 1-3.6 5.75L4 20H2v-3l8.25-8.25A4 4 0 0 1 15 7Z',
  send: 'M3 11.5 21 3l-8.5 18-2-7.5-7.5-2Z',
  refresh:
    'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  download: 'M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 19h16',
  upload: 'M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 20h16',
  warning: 'M12 3 2 21h20L12 3Zm0 6v6m0 3v.5',
  sparkles:
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z',
  chevron: 'M9 6l6 6-6 6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35',
  arrowLeft: 'M11 5l-7 7 7 7M4 12h17',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3.5 2',
  users:
    'M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 1a3 3 0 1 0 0-6m-8 1c-3.3 0-6 1.8-6 4v4h8M14 16h8v-3c0-1.6-1.6-3-4-3',
  monitor: 'M3 4h18v12H3V4Zm7 12v4m4-4v4M8 20h8',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 17h4',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h9',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v.5M12 11v6',
  home: 'M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.8Z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  crown: 'M3 8.5 7.5 11 12 5l4.5 6L21 8.5 19 19H5L3 8.5Z',
  shield: 'M12 3l8 3v5c0 5-3.5 8.6-8 10-4.5-1.4-8-5-8-10V6l8-3Z',
  terminal: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm2 5 3.5 3L6 15m6.5 0H17',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.8-3 2.8-15 0-18M3.4 9h17.2M3.4 15h17.2',
  menu: 'M4 7h16M4 12h16M4 17h16',
  moon: 'M20.5 14.2A8.2 8.2 0 1 1 9.8 3.5a6.6 6.6 0 0 0 10.7 10.7Z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-14v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4',
  flag: 'M5 21V4h9l1 2h5v9h-6l-1-2H5',
  lock: 'M6 11h12v10H6V11Zm3 0V8a3 3 0 0 1 6 0v3',
  bell: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6m4 9a2 2 0 0 0 4 0',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  users2: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1M17 11a3 3 0 1 0 0-6m1 15v-1a5 5 0 0 0-2-4',
  github: 'M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03a9.6 9.6 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z',
};

const STROKE_ICONS = new Set([
  'plus', 'check', 'x', 'chevron', 'arrowLeft', 'clock', 'link', 'search',
  'download', 'upload', 'refresh', 'logout', 'eye', 'trash', 'text', 'qr',
  'copy', 'play', 'stop', 'smile', 'home', 'chart', 'crown', 'shield',
  'terminal', 'globe', 'menu', 'moon', 'sun', 'flag', 'lock', 'bell',
  'activity', 'users2', 'info',
]);

export function Icon({ name, size = 18, strokeWidth = 1.8, className = '' }) {
  const path = ICONS[name] || ICONS.grid;
  const stroke = STROKE_ICONS.has(name);
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={stroke ? 'none' : 'currentColor'}
      stroke={stroke ? 'currentColor' : 'none'}
      strokeWidth={stroke ? strokeWidth : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/* -------------------------------- toasts -------------------------------- */

const ToastContext = createContext({ notify: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <Icon name={toast.type === 'error' ? 'warning' : 'check'} size={16} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ------------------------------ controles ------------------------------- */

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  type = 'button',
  loading = false,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner" /> : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}

export function Field({ label, hint, children, align = 'stack', htmlFor }) {
  return (
    <label className={`field field-${align}`} htmlFor={htmlFor}>
      <span className="field-label">
        {label}
        {hint ? <span className="field-hint">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export const Input = React.forwardRef(function Input({ className = '', ...rest }, ref) {
  return <input ref={ref} className={`input ${className}`} {...rest} />;
});

export const Textarea = React.forwardRef(function Textarea(
  { className = '', rows = 4, ...rest },
  ref,
) {
  return <textarea ref={ref} className={`input textarea ${className}`} rows={rows} {...rest} />;
});

export const Select = React.forwardRef(function Select({ children, className = '', ...rest }, ref) {
  return (
    <select ref={ref} className={`input select ${className}`} {...rest}>
      {children}
    </select>
  );
});

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={`toggle-row ${disabled ? 'is-disabled' : ''}`}>
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        {description ? <span className="toggle-desc">{description}</span> : null}
      </span>
      <span className={`toggle ${checked ? 'is-on' : ''}`}>
        <input
          type="checkbox"
          checked={Boolean(checked)}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span className="toggle-knob" />
      </span>
    </label>
  );
}

export function Card({ children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, icon, actions, badge }) {
  return (
    <header className="card-header">
      <div className="card-heading">
        {icon ? <span className="card-icon"><Icon name={icon} size={18} /></span> : null}
        <div>
          <h3>
            {title} {badge}
          </h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="card-actions">{actions}</div> : null}
    </header>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function StatusDot({ status, label }) {
  const map = {
    connected: 'ok',
    ready: 'ok',
    qr: 'wait',
    pairing: 'wait',
    connecting: 'wait',
    disconnected: 'off',
    not_configured: 'off',
    error: 'bad',
  };
  return (
    <span className={`status status-${map[status] || 'off'}`}>
      <span className="status-dot" />
      {label || status}
    </span>
  );
}

export function EmptyState({ icon = 'sparkles', title, description, action }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name={icon} size={24} /></span>
      <h4>{title}</h4>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

const EMOJIS = [
  '👍', '❤️', '🔥', '👏', '😄', '😍', '🤩', '🙌', '✨', '💯',
  '👋', '🟢', '✅', '⚡', '🎉', '🎁', '💬', '🤖', '🧠', '🕘',
  '📋', '📌', '📦', '🛍️', '💳', '🚚', '📍', '🎟️', '🧾', '⚠️',
  '🙏', '💪', '😊', '🤝', '🧑‍💻', '👥', '🎧', '📅', '🌙', '☀️',
];

export function EmojiPicker({ value, onChange, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);
  return (
    <div className="emoji-pop" ref={ref}>
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={`emoji-btn ${value === emoji ? 'is-active' : ''}`}
          onClick={() => {
            onChange(emoji);
            onClose?.();
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = 'Copiar', size = 'sm', variant = 'ghost' }) {
  const [copied, setCopied] = useState(false);
  const { notify } = useToast();
  return (
    <Button
      size={size}
      variant={variant}
      icon={copied ? 'check' : 'copy'}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          notify('No se pudo copiar al portapapeles', 'error');
        }
      }}
    >
      {copied ? 'Copiado' : label}
    </Button>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={value === tab.id}
          className={`tab ${value === tab.id ? 'is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon ? <Icon name={tab.icon} size={16} /> : null}
          <span>{tab.label}</span>
          {tab.badge ? <span className="tab-badge">{tab.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function useLocalDraft(initial) {
  const [value, setValue] = useState(initial);
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  return { value, setValue, dirty, reset: () => setValue(initial) };
}
