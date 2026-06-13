import pino, { type LoggerOptions } from 'pino';
import { config } from '../config/index';

const baseOptions: LoggerOptions = {
  level: config.log.level,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Never let secrets/PII reach the logs.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
    ],
    remove: true,
  },
};

export const logger = config.isDev
  ? pino({
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      },
    })
  : pino(baseOptions);

export type Logger = typeof logger;
