import * as Sentry from '@sentry/node';
import { config } from '../config/index';
import { logger } from '../logger/index';

let initialized = false;

/** Initialize Sentry if a DSN is configured (otherwise a no-op). Call once at boot. */
export function initSentry(): void {
  if (!config.sentry.dsn) return;
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.env,
    tracesSampleRate: config.sentry.tracesSampleRate,
  });
  initialized = true;
  logger.info('Sentry initialized');
}

export function captureException(err: unknown): void {
  if (initialized) Sentry.captureException(err);
}
