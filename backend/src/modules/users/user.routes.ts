import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';
import { validate } from '../../core/middleware/validate';
import { Role } from '../../common/types/index';
import * as ctrl from './user.controller';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateStatusSchema,
  userIdParamsSchema,
} from './user.schemas';

export const userRouter: Router = Router();

// Entire surface is engineer/admin-only.
userRouter.use(authenticate, authorize(Role.Engineer));

userRouter.get('/', validate({ query: listUsersQuerySchema }), asyncHandler(ctrl.list));
userRouter.post('/', validate({ body: createUserSchema }), asyncHandler(ctrl.create));
userRouter.patch(
  '/:id/approve',
  validate({ params: userIdParamsSchema }),
  asyncHandler(ctrl.approve),
);
userRouter.patch(
  '/:id/reject',
  validate({ params: userIdParamsSchema }),
  asyncHandler(ctrl.reject),
);
userRouter.patch(
  '/:id/status',
  validate({ params: userIdParamsSchema, body: updateStatusSchema }),
  asyncHandler(ctrl.updateStatus),
);
