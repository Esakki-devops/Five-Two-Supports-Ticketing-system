import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../errors/AppError';
import { verifyAccessToken } from '../auth/tokens';

/**
 * Verifies the Bearer access token and attaches the principal to `req.auth`.
 * Stateless by design (no DB hit) — the short access-token TTL bounds staleness;
 * refresh/revocation is handled via the refresh-token version in the auth module.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing or malformed Authorization header'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const claims = verifyAccessToken(token);
    req.auth = { userId: claims.sub, role: claims.role, email: claims.email };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
};
