import { randomUUID } from 'node:crypto';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { config } from './core/config/index';
import { logger } from './core/logger/index';
import { requestId } from './core/middleware/requestId';
import { registerModules } from './core/registry/index';
import type { AppModule } from './core/registry/types';
import { errorHandler, notFoundHandler } from './core/errors/errorHandler';
import { authLimiter, generalLimiter } from './core/middleware/rate-limit';
import { metricsMiddleware } from './core/observability/metrics';
import { systemModule } from './modules/system/index';
import { authModule } from './modules/auth/index';
import { usersModule } from './modules/users/index';
import { departmentsModule } from './modules/departments/index';
import { categoriesModule } from './modules/categories/index';
import { ticketsModule } from './modules/tickets/index';
import { notificationsModule } from './modules/notifications/index';
import { registerNotificationSubscribers } from './modules/notifications/notification.subscribers';
import { registerJobSubscribers } from './jobs/subscribers';
import { dashboardModule } from './modules/dashboard/index';
import { exportModule } from './modules/export/index';
import { docsModule } from './docs/index';

/** The ordered list of feature modules mounted into the app. */
const modules: AppModule[] = [
  systemModule,
  authModule,
  usersModule,
  departmentsModule,
  categoriesModule,
  ticketsModule,
  notificationsModule,
  dashboardModule,
  exportModule,
  docsModule,
];

/**
 * Assembles the Express application (middleware + modules + error handling).
 * Does NOT open connections or call `listen` — that belongs to server.ts — so
 * the app can be exercised in tests without external dependencies.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Correlation id first, so it is available to every downstream layer.
  app.use(requestId);
  app.use(metricsMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as { requestId?: string }).requestId ?? randomUUID(),
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/ready' || req.url === '/metrics',
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.use(helmet());
  app.use(cors({ origin: config.cors.origins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Rate limiting (Redis-backed when available; skipped in tests for determinism).
  if (!config.isTest) {
    app.use(config.http.apiPrefix, generalLimiter);
    app.use(`${config.http.apiPrefix}/auth`, authLimiter);
  }

  // Wire domain-event subscribers (idempotent; safe in tests and across instances).
  registerNotificationSubscribers();
  registerJobSubscribers();

  registerModules(app, modules);

  // Terminal handlers (order matters: 404 before the error handler).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export { modules };
