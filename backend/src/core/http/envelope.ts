import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type ResponseMeta = Record<string, unknown> | { pagination: PaginationMeta };

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorBody;
  meta?: ResponseMeta;
}

/** Send a successful, enveloped response. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { status?: number; meta?: ResponseMeta } = {},
): Response {
  const body: ApiResponse<T> = { success: true, data };
  if (options.meta) body.meta = options.meta;
  return res.status(options.status ?? 200).json(body);
}

/** Convenience for paginated list responses. */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  status = 200,
): Response {
  const body: ApiResponse<T[]> = { success: true, data, meta: { pagination } };
  return res.status(status).json(body);
}
