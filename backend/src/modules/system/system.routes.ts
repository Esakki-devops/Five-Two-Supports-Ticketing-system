import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler';
import { metricsHandler } from '../../core/observability/metrics';
import { getHealth, getReady } from './system.controller';

export const systemRouter: Router = Router();

systemRouter.get('/health', getHealth);
systemRouter.get('/ready', asyncHandler(getReady));
systemRouter.get('/metrics', asyncHandler(metricsHandler));
