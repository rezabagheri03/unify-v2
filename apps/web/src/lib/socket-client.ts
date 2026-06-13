/**
 * src/lib/socket-client.ts — Singleton Socket.io client for live updates.
 * Subscribes to notification events and exposes a typed API.
 */

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/stores/auth.store';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;
const listeners = new Map<string, Set<(payload: unknown) => void>>();

export interface LiveNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  timestamp: string;
}

export function connectSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (socket && socket.connected) return socket;
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('notification', (payload: LiveNotification) => {
    const set = listeners.get('notification');
    if (set) for (const fn of set) fn(payload);
  });

  socket.on('message', (payload: unknown) => {
    const set = listeners.get('message');
    if (set) for (const fn of set) fn(payload);
  });

  socket.on('connect_error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('Socket.io connect error:', err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  listeners.clear();
}

export function onSocketEvent<T = unknown>(event: 'notification' | 'message', cb: (payload: T) => void): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(cb as (payload: unknown) => void);
  return () => {
    listeners.get(event)?.delete(cb as (payload: unknown) => void);
  };
}
