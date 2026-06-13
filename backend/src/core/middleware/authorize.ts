import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';
import type { Role } from '../../common/types/index';

/**
 * Role gate. Must run after `authenticate`. With no roles passed, it simply
 * requires an authenticated principal.
 */
export function authorize(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new UnauthorizedError());
      return;
    }
    if (roles.length > 0 && !roles.includes(req.auth.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
