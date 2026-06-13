import client from 'prom-client';
import type { Request, RequestHandler, Response } from 'express';
import { config } from '../config/index';

export const metricsRegistry = new client.Registry();

if (config.metrics.enabled) {
  client.collectDefaultMetrics({ register: metricsRegistry });
}

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status'] as const,
  registers: [metricsRegistry],
});

/** Counts every completed request by method + status code. */
export const metricsMiddleware: RequestHandler = (req, res, next) => {
  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, status: String(res.statusCode) });
  });
  next();
};

/** GET /metrics — Prometheus exposition format. */
export async function metricsHandler(_req: Request, res: Response): Promise<Response> {
  res.setHeader('Content-Type', metricsRegistry.contentType);
  return res.send(await metricsRegistry.metrics());
}
