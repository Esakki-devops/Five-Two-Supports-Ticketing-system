import type { Role } from '../../common/types/index';

/**
 * The authenticated principal attached to `req.auth` by the `authenticate`
 * middleware (implemented in Phase 2). Defined here so the request-type
 * augmentation and downstream modules have a stable contract to depend on.
 */
export interface AuthContext {
  userId: string;
  role: Role;
  email: string;
}
