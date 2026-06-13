export type ErrorDetails = unknown;

export interface AppErrorOptions {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  details?: ErrorDetails;
  cause?: unknown;
}

/**
 * Base class for all known/operational errors. The central error handler maps
 * these to HTTP responses. Anything that is NOT an AppError is treated as an
 * unexpected 500 (and reported to Sentry in production).
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational: boolean;
  readonly details?: ErrorDetails;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: ErrorDetails) {
    super(message, { statusCode: 400, code: 'BAD_REQUEST', details });
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: ErrorDetails) {
    super(message, { statusCode: 422, code: 'VALIDATION_ERROR', details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: ErrorDetails) {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED', details });
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = 'You do not have permission to perform this action',
    details?: ErrorDetails,
  ) {
    super(message, { statusCode: 403, code: 'FORBIDDEN', details });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: ErrorDetails) {
    super(message, { statusCode: 404, code: 'NOT_FOUND', details });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: ErrorDetails) {
    super(message, { statusCode: 409, code: 'CONFLICT', details });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', details?: ErrorDetails) {
    super(message, { statusCode: 429, code: 'TOO_MANY_REQUESTS', details });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details?: ErrorDetails) {
    super(message, { statusCode: 503, code: 'SERVICE_UNAVAILABLE', details });
  }
}
