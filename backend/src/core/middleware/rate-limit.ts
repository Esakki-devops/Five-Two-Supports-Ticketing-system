import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore, type SendCommandFn } from 'rate-limit-redis';
import type { Request, Response } from 'express';
import { config } from '../config/index';
import { redis } from '../redis/index';

const sendCommand: SendCommandFn = (...args: string[]) => {
  const [command, ...rest] = args;
  return redis.call(command ?? 'PING', ...rest) as ReturnType<SendCommandFn>;
};

/** 429 response in the standard envelope. Exported so it can be unit-tested. */
export function rateLimitExceeded(req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests — please slow down and try again shortly.',
      requestId: req.requestId,
    },
  });
}

function buildLimiter(windowMs: number, limit: number, prefix: string): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Use the Redis store (multi-instance safe) only when Redis is reachable;
    // otherwise skip limiting entirely (dev/test) rather than block on a dead store.
    skip: () => redis.status !== 'ready',
    store: new RedisStore({ sendCommand, prefix }),
    handler: rateLimitExceeded,
  });
}

export const generalLimiter = buildLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.max,
  'rl:gen:',
);

export const authLimiter = buildLimiter(
  config.rateLimit.authWindowMs,
  config.rateLimit.authMax,
  'rl:auth:',
);
