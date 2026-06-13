import { logger } from './core/logger/index';
import { connectMongo, disconnectMongo } from './core/db/mongoose';
import { redis, closeRedis } from './core/redis/index';
import { startWorkers, stopWorkers } from './jobs/workers';
import { closeQueues } from './jobs/queues';
import { captureException, initSentry } from './core/observability/sentry';

/**
 * Background worker process entrypoint. Runs the BullMQ workers (email, day-5
 * reminder, day-7 auto-close) in a separate process so API latency is unaffected.
 * Requires both MongoDB and Redis.
 */
async function main(): Promise<void> {
  initSentry();
  await connectMongo();
  await redis.connect();
  logger.info('Redis connected');

  startWorkers();
  logger.info('Worker process ready');

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Worker shutting down');
    await stopWorkers().catch((err) => logger.error({ err }, 'Error stopping workers'));
    await closeQueues().catch((err) => logger.error({ err }, 'Error closing queues'));
    await disconnectMongo().catch(() => undefined);
    await closeRedis().catch(() => undefined);
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

main().catch((err: unknown) => {
  logger.fatal({ err: err instanceof Error ? err.message : err }, 'Worker failed to start');
  process.exit(1);
});
