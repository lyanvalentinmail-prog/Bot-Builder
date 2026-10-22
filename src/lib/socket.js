import { io } from 'socket.io-client';
import { AUTH_TOKEN, SOCKET_URL } from './config.js';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: AUTH_TOKEN ? { token: AUTH_TOKEN } : undefined,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
      // En un backend externo (Render) el socket cruza dominios.
      withCredentials: false,
    });
  }
  return socket;
}

export function joinBotRoom(botId) {
  const s = getSocket();
  s.emit('bot:join', { botId });
  return s;
}
