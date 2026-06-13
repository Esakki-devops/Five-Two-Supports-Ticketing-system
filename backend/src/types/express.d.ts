import type { AuthContext } from '../core/middleware/auth-context';

declare global {
  namespace Express {
    interface Request {
      /** Correlation id assigned by the requestId middleware. */
      requestId: string;
      /** Authenticated principal, populated by the `authenticate` middleware. */
      auth?: AuthContext;
      /** Zod-validated request data, populated by the `validate` middleware. */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
