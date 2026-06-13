import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Redis } from 'ioredis';
import { config } from '../config/index';
import { logger } from '../logger/index';
import { verifyAccessToken } from '../auth/tokens';
import type { Role } from '../../common/types/index';

interface SocketData {
  userId: string;
  role: Role;
}

function extractToken(socket: Socket): string | undefined {
  const auth = socket.handshake.auth as { token?: string } | undefined;
  if (auth?.token) return auth.token;
  const header = socket.handshake.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const queryToken = socket.handshake.query.token;
  return typeof queryToken === 'string' ? queryToken : undefined;
}

/**
 * Socket.IO gateway: authenticates the handshake with the access token and joins
 * each user to a private room (`user:<id>`). Notifications are emitted to these
 * rooms. The Redis adapter (attached when Redis is available) makes this safe
 * across multiple API instances; without it, the gateway runs single-instance.
 *
 * A singleton with a no-op `pushToUser` until `init()` runs — so services can
 * emit safely even when sockets aren't initialized (e.g. in unit tests).
 */
class RealtimeGateway {
  private io?: Server;

  init(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
      cors: { origin: config.cors.origins, credentials: true },
    });

    io.use((socket, next) => {
      try {
        const token = extractToken(socket);
        if (!token) {
          next(new Error('Unauthorized'));
          return;
        }
        const claims = verifyAccessToken(token);
        const data = socket.data as SocketData;
        data.userId = claims.sub;
        data.role = claims.role;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });

    io.on('connection', (socket) => {
      const { userId } = socket.data as SocketData;
      void socket.join(`user:${userId}`);
      logger.debug({ userId, socketId: socket.id }, 'Socket connected');
      socket.on('disconnect', () =>
        logger.debug({ userId, socketId: socket.id }, 'Socket disconnected'),
      );
    });

    this.io = io;
    logger.info('Socket.IO gateway initialized');
    return io;
  }

  attachRedisAdapter(pubClient: Redis, subClient: Redis): void {
    if (!this.io) return;
    this.io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter attached (multi-instance ready)');
  }

  /** Emit an event to a specific user's room. No-op until the gateway is initialized. */
  pushToUser(userId: string, event: string, payload: unknown): void {
    this.io?.to(`user:${userId}`).emit(event, payload);
  }

  get isReady(): boolean {
    return Boolean(this.io);
  }

  async close(): Promise<void> {
    if (this.io) {
      await this.io.close();
      this.io = undefined;
    }
  }
}

export const realtime = new RealtimeGateway();
