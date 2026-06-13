import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

/** Connect (or reconnect) the socket using the current access token. */
export function connectSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;

  const url = import.meta.env.VITE_SOCKET_URL;
  const options = {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
  };

  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = url ? io(url, options) : io(options);
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
