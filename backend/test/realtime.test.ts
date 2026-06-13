import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ioClient, type Socket } from 'socket.io-client';
import { realtime } from '../src/core/realtime/gateway';
import { signAccessToken } from '../src/core/auth/tokens';
import { Role } from '../src/common/types/index';

let httpServer: Server;
let port: number;

beforeAll(async () => {
  httpServer = createServer();
  realtime.init(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as AddressInfo).port;
});

afterAll(async () => {
  await realtime.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

const connect = (opts: Record<string, unknown>): Socket =>
  ioClient(`http://localhost:${port}`, { transports: ['websocket'], reconnection: false, ...opts });

describe('realtime gateway', () => {
  it('rejects a handshake without a valid token', async () => {
    const client = connect({});
    const error = await new Promise<Error>((resolve) => {
      client.on('connect_error', resolve);
      client.on('connect', () => resolve(new Error('unexpected connect')));
    });
    client.close();
    expect(error.message).toMatch(/unauthorized/i);
  });

  it("delivers an event to the authenticated user's room", async () => {
    const userId = '64b7f00000000000000000aa';
    const token = signAccessToken({ sub: userId, role: Role.Employee, email: 'x@example.com' });
    const client = connect({ auth: { token } });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', reject);
    });

    const received = new Promise<{ message: string }>((resolve) => {
      client.on('notification:new', (payload: { message: string }) => resolve(payload));
    });

    // give the server-side room join a moment to complete
    await new Promise((r) => setTimeout(r, 50));
    realtime.pushToUser(userId, 'notification:new', { message: 'hello' });

    const payload = await received;
    client.close();
    expect(payload).toMatchObject({ message: 'hello' });
  });
});
