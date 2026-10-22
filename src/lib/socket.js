import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const token =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('token')
        : null;
    socket = io({
      auth: token ? { token } : undefined,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
    });
  }
  return socket;
}

export function joinBotRoom(botId) {
  const s = getSocket();
  s.emit('bot:join', { botId });
  return s;
}
