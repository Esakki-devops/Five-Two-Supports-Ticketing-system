import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';
import { validate } from '../../core/middleware/validate';
import { Role } from '../../common/types/index';
import * as ctrl from './export.controller';
import { exportQuerySchema } from './export.schemas';

export const exportRouter: Router = Router();

exportRouter.use(authenticate, authorize(Role.Engineer));
exportRouter.get('/', validate({ query: exportQuerySchema }), asyncHandler(ctrl.exportTickets));
