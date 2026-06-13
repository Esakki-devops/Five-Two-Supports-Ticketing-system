import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { config } from '../config/index';
import { logger } from '../logger/index';
import type { ApiResponse } from '../http/envelope';
import { captureException } from '../observability/sentry';
import { AppError, NotFoundError } from './AppError';

interface NormalizedError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

function isDuplicateKeyError(
  err: unknown,
): err is { code: number; keyValue?: Record<string, unknown> } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  );
}

function normalize(err: unknown): NormalizedError {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }
  if (err && typeof err === 'object' && (err as { name?: string }).name === 'MulterError') {
    const code = (err as { code?: string }).code;
    if (code === 'LIMIT_FILE_SIZE') {
      return { statusCode: 413, code: 'FILE_TOO_LARGE', message: 'File exceeds the 20 MB limit.' };
    }
    return {
      statusCode: 400,
      code: 'UPLOAD_ERROR',
      message: err instanceof Error ? err.message : 'Upload error',
    };
  }
  if (err instanceof ZodError) {
    return {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    };
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    };
  }
  if (err instanceof mongoose.Error.CastError) {
    return { statusCode: 400, code: 'INVALID_ID', message: `Invalid value for '${err.path}'` };
  }
  if (isDuplicateKeyError(err)) {
    return {
      statusCode: 409,
      code: 'DUPLICATE_KEY',
      message: 'A resource with these details already exists',
      details: err.keyValue,
    };
  }
  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: err instanceof Error ? err.message : 'Internal server error',
  };
}

/** Terminal 404 handler — runs when no route matched. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

/** Central error handler: maps any thrown value to the standard error envelope. */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const normalized = normalize(err);
  const isServerError = normalized.statusCode >= 500;
  const { requestId } = req;

  if (isServerError) {
    logger.error({ err, requestId, statusCode: normalized.statusCode }, 'Unhandled error');
    captureException(err);
  } else {
    logger.warn(
      { requestId, statusCode: normalized.statusCode, code: normalized.code },
      normalized.message,
    );
  }

  // Never leak internal specifics of a 5xx in production.
  const expose = !(config.isProduction && isServerError);
  const body: ApiResponse = {
    success: false,
    error: {
      code: normalized.code,
      message: expose ? normalized.message : 'Internal server error',
      ...(expose && normalized.details !== undefined ? { details: normalized.details } : {}),
      requestId,
    },
  };

  res.status(normalized.statusCode).json(body);
};
