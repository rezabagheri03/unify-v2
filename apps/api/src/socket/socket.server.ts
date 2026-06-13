/**
 * src/socket/socket.server.ts — Socket.io server for real-time notifications.
 * Fallback channel when Pushe is unavailable or for in-app delivery.
 */

import { Server as HTTPServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Role } from '@unify/shared-types';

let io: IOServer | null = null;

export interface SocketUser {
  userId: string;
  username: string;
  role: Role;
  socketIds: Set<string>;
}

const connectedUsers = new Map<string, SocketUser>();

export function initSocketServer(httpServer: HTTPServer): IOServer {
  io = new IOServer(httpServer, {
    cors: {
      origin: config.cors.allowedOrigins,
      credentials: true,
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.substring(7)
        : null);
    if (!token) return next(new Error('AUTH_REQUIRED'));
    try {
      const payload = verifyAccessToken(token);
      (socket as Socket & { data: { user: typeof payload } }).data.user = payload;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as Socket & { data: { user: { userId: string; username: string; role: Role } } }).data.user;
    if (!user) {
      socket.disconnect();
      return;
    }

    let entry = connectedUsers.get(user.userId);
    if (!entry) {
      entry = {
        userId: user.userId,
        username: user.username,
        role: user.role,
        socketIds: new Set(),
      };
      connectedUsers.set(user.userId, entry);
    }
    entry.socketIds.add(socket.id);

    logger.info({ userId: user.userId, socketId: socket.id }, 'Socket connected');

    socket.on('disconnect', () => {
      entry?.socketIds.delete(socket.id);
      if (entry && entry.socketIds.size === 0) {
        connectedUsers.delete(user.userId);
      }
      logger.info({ userId: user.userId, socketId: socket.id }, 'Socket disconnected');
    });
  });

  return io;
}

/** Emit an event to specific user IDs. */
export function emitToUsers(userIds: string[], event: string, payload: unknown): void {
  if (!io) return;
  for (const uid of userIds) {
    const entry = connectedUsers.get(uid);
    if (!entry) continue;
    for (const sid of entry.socketIds) {
      io.to(sid).emit(event, payload);
    }
  }
}

/** Broadcast to all connected users (admin broadcasts only). */
export function broadcastAll(event: string, payload: unknown): void {
  io?.emit(event, payload);
}

export function getIO(): IOServer | null {
  return io;
}

export function getConnectedUserCount(): number {
  return connectedUsers.size;
}
