import type { PaginationMeta } from './envelope';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationInput {
  page?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Normalize page/limit query params into safe, bounded values. */
export function getPagination(
  input: PaginationInput = {},
  options: { defaultLimit?: number; maxLimit?: number } = {},
): PaginationParams {
  const maxLimit = options.maxLimit ?? MAX_LIMIT;
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(input.limit ?? defaultLimit)));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
