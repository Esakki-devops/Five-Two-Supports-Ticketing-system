import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler';
import { authenticate } from '../../core/middleware/authenticate';
import { validate } from '../../core/middleware/validate';
import * as ctrl from './auth.controller';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schemas';

export const authRouter: Router = Router();

// Rate limiting on these write routes is added in Phase 9 (Hardening).
authRouter.post('/register', validate({ body: registerSchema }), asyncHandler(ctrl.postRegister));
authRouter.post('/login', validate({ body: loginSchema }), asyncHandler(ctrl.postLogin));
authRouter.post('/refresh', asyncHandler(ctrl.postRefresh));
authRouter.post('/logout', ctrl.postLogout);
authRouter.get('/me', authenticate, asyncHandler(ctrl.getMe));
authRouter.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema }),
  asyncHandler(ctrl.postForgotPassword),
);
authRouter.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  asyncHandler(ctrl.postResetPassword),
);
