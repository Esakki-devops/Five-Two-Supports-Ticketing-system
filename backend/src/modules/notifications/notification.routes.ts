import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler';
import { authenticate } from '../../core/middleware/authenticate';
import { validate } from '../../core/middleware/validate';
import * as ctrl from './notification.controller';
import { listNotificationsQuerySchema, notificationIdParamsSchema } from './notification.schemas';

export const notificationRouter: Router = Router();

notificationRouter.use(authenticate);

notificationRouter.get(
  '/',
  validate({ query: listNotificationsQuerySchema }),
  asyncHandler(ctrl.list),
);
notificationRouter.patch('/read-all', asyncHandler(ctrl.readAll));
notificationRouter.patch(
  '/:id/read',
  validate({ params: notificationIdParamsSchema }),
  asyncHandler(ctrl.read),
);
