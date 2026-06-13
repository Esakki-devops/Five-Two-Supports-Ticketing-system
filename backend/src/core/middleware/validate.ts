import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validates request parts against Zod schemas at the edge. Parsed (and coerced)
 * values are stored on `req.validated` — note Express 5 makes `req.query`
 * read-only, so we never mutate it. A failure throws a ZodError, which the
 * central error handler renders as a 422 with field details.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      const validated: { body?: unknown; query?: unknown; params?: unknown } = {};
      if (schemas.body) validated.body = schemas.body.parse(req.body);
      if (schemas.query) validated.query = schemas.query.parse(req.query);
      if (schemas.params) validated.params = schemas.params.parse(req.params);
      req.validated = validated;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const getBody = <T>(req: Request): T => req.validated?.body as T;
export const getQuery = <T>(req: Request): T => req.validated?.query as T;
export const getParams = <T>(req: Request): T => req.validated?.params as T;
