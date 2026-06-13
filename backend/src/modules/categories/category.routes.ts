import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';
import { validate } from '../../core/middleware/validate';
import { Role } from '../../common/types/index';
import * as ctrl from './category.controller';
import {
  categoryIdParamsSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from './category.schemas';

export const categoryRouter: Router = Router();

// Public read: ticket-creation forms need the active category list.
categoryRouter.get('/', validate({ query: listCategoriesQuerySchema }), asyncHandler(ctrl.list));

// Writes are engineer/admin-only.
categoryRouter.post(
  '/',
  authenticate,
  authorize(Role.Engineer),
  validate({ body: createCategorySchema }),
  asyncHandler(ctrl.create),
);
categoryRouter.patch(
  '/:id',
  authenticate,
  authorize(Role.Engineer),
  validate({ params: categoryIdParamsSchema, body: updateCategorySchema }),
  asyncHandler(ctrl.update),
);
