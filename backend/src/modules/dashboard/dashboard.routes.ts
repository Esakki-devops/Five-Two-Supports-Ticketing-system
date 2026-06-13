import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler';
import { authenticate } from '../../core/middleware/authenticate';
import * as ctrl from './dashboard.controller';

export const dashboardRouter: Router = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get('/summary', asyncHandler(ctrl.summary));
