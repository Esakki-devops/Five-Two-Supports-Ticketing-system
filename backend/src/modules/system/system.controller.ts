import type { Request, Response } from 'express';
import { sendSuccess } from '../../core/http/envelope';
import { pingMongo } from '../../core/db/mongoose';
import { pingRedis } from '../../core/redis/index';
import { pingStorage } from '../../integrations/storage/index';

/** Liveness: the process is up and serving. Cheap; no dependency checks. */
export function getHealth(_req: Request, res: Response): Response {
  return sendSuccess(res, {
    status: 'ok',
    service: 'ticketing-api',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

/** Readiness: all critical dependencies are reachable. Used by orchestration. */
export async function getReady(_req: Request, res: Response): Promise<Response> {
  const [mongo, redisReady, storage] = await Promise.all([pingMongo(), pingRedis(), pingStorage()]);
  const checks = { mongo, redis: redisReady, storage };
  const ready = Object.values(checks).every(Boolean);
  return res.status(ready ? 200 : 503).json({
    success: ready,
    data: { status: ready ? 'ready' : 'degraded', checks },
  });
}
