import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

/** Shared Zod fragments reused across module request schemas. */

export const objectId = z.string().refine((v) => isValidObjectId(v), 'Invalid id');

/** Parses a query-string flag ("true"/anything-else) into a boolean. */
export const queryBoolean = z
  .string()
  .optional()
  .transform((v) => v === 'true');
