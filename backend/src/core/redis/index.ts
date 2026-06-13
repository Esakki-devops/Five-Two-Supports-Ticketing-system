import { Redis, type RedisOptions } from 'ioredis';
import { config } from '../config/index';
import { logger } from '../logger/index';

/**
 * Factory for Redis clients. The shared `redis` client below is lazy (it does not
 * open a socket until first use), which keeps unit tests free of background
 * connections. BullMQ and the Socket.IO adapter create their own dedicated
 * connections (with their own options) in later phases.
 */
export function createRedis(options: RedisOptions = {}): Redis {
  const client = new Redis(config.redis.url, {
    lazyConnect: true,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 200, 5000),
    ...options,
  });

  // Log the first error, then stay quiet until a successful (re)connect, so a
  // Redis outage does not flood the logs with one line per retry.
  let errorLogged = false;
  client.on('error', (err: Error & { code?: string }) => {
    if (errorLogged) return;
    errorLogged = true;
    // ioredis connection errors sometimes carry an empty `message`; fall back to
    // the code/name so the log is always actionable for ops.
    logger.error(
      { err: err.message || err.code || err.name || String(err), code: err.code },
      'Redis connection error (suppressing repeats until reconnect)',
    );
  });
  client.on('ready', () => {
    errorLogged = false;
    logger.info('Redis ready');
  });

  return client;
}

export const redis = createRedis();

/** Lightweight readiness probe used by GET /ready. */
export async function pingRedis(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redis.status === 'end' || redis.status === 'close') return;
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
}
