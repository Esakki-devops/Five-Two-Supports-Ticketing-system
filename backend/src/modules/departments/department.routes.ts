import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';
import { validate } from '../../core/middleware/validate';
import { Role } from '../../common/types/index';
import * as ctrl from './department.controller';
import {
  createDepartmentSchema,
  departmentIdParamsSchema,
  listDepartmentsQuerySchema,
  updateDepartmentSchema,
} from './department.schemas';

export const departmentRouter: Router = Router();

// Public read: the registration form needs the active department list.
departmentRouter.get('/', validate({ query: listDepartmentsQuerySchema }), asyncHandler(ctrl.list));

// Writes are engineer/admin-only.
departmentRouter.post(
  '/',
  authenticate,
  authorize(Role.Engineer),
  validate({ body: createDepartmentSchema }),
  asyncHandler(ctrl.create),
);
departmentRouter.patch(
  '/:id',
  authenticate,
  authorize(Role.Engineer),
  validate({ params: departmentIdParamsSchema, body: updateDepartmentSchema }),
  asyncHandler(ctrl.update),
);
