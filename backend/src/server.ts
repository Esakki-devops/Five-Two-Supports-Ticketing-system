import { createServer } from 'node:http';
import { createApp, modules } from './app';
import { config } from './core/config/index';
import { logger } from './core/logger/index';
import { connectMongo, disconnectMongo } from './core/db/mongoose';
import { redis, closeRedis, createRedis } from './core/redis/index';
import { initModules } from './core/registry/index';
import { realtime } from './core/realtime/gateway';
import { getStorage } from './integrations/storage/index';
import { captureException, initSentry } from './core/observability/sentry';

/** Attach the Socket.IO Redis adapter once Redis is reachable (multi-instance scaling). */
function setupRealtimeAdapter(): void {
  const attach = (): void => {
    const pub = createRedis();
    const sub = createRedis();
    Promise.all([pub.connect(), sub.connect()])
      .then(() => realtime.attachRedisAdapter(pub, sub))
      .catch((err: unknown) =>
        logger.warn(
          { err: err instanceof Error ? err.message : err },
          'Socket.IO Redis adapter not attached (running single-instance)',
        ),
      );
  };
  if (redis.status === 'ready') attach();
  else redis.once('ready', attach);
}

async function bootstrap(): Promise<void> {
  initSentry();

  // MongoDB is essential: fail fast if it is unreachable at startup.
  await connectMongo();

  // Redis connects in the background. The app stays up; features that need it
  // (rate limiting, queues, real-time) recover automatically once it is reachable,
  // and GET /ready reflects its status.
  void redis.connect().catch(() => {
    logger.warn('Redis not reachable at startup — retrying in the background');
  });

  // Ensure the attachments bucket exists (no-op for the in-memory driver).
  await getStorage()
    .then((storage) => storage.ensureBucket())
    .catch((err: unknown) =>
      logger.warn(
        { err: err instanceof Error ? err.message : err },
        'Could not ensure storage bucket',
      ),
    );

  await initModules(modules);

  const app = createApp();
  const server = createServer(app);

  // Real-time gateway (Socket.IO) shares the HTTP server.
  realtime.init(server);
  setupRealtimeAdapter();

  await new Promise<void>((resolve) => {
    server.listen(config.http.port, config.http.host, resolve);
  });
  logger.info(
    `API listening on http://${config.http.host}:${config.http.port} (prefix ${config.http.apiPrefix})`,
  );

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown started');
    await realtime.close().catch((err) => logger.error({ err }, 'Error closing Socket.IO'));
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectMongo().catch((err) => logger.error({ err }, 'Error closing MongoDB'));
    await closeRedis().catch((err) => logger.error({ err }, 'Error closing Redis'));
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
    captureException(reason);
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — shutting down');
    captureException(err);
    void shutdown('uncaughtException');
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Fatal error during startup');
  process.exit(1);
});
