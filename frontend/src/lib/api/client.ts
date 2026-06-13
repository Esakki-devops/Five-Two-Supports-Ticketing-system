import { useAuthStore } from '@/stores/auth';
import type { AuthResult, Pagination } from '@/types';

const BASE = import.meta.env.VITE_API_URL || '/api/v1';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, opts: { code?: string; status?: number; details?: unknown } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = opts.code ?? 'ERROR';
    this.status = opts.status ?? 0;
    this.details = opts.details;
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: QueryParams;
  /** Skip the transparent 401→refresh→retry (used by the refresh/login calls themselves). */
  skipAuthRefresh?: boolean;
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = `${BASE}${path}`;
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

function buildHeaders(custom: HeadersInit | undefined, body: unknown): Headers {
  const headers = new Headers(custom);
  const token = useAuthStore.getState().accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');
  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

// ── Single-flight refresh ──────────────────────────────────────────────────
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const res = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { success?: boolean; data?: AuthResult };
      if (json.success && json.data?.accessToken) {
        useAuthStore.getState().setSession(json.data.user, json.data.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  })();

  const result = await refreshPromise;
  refreshPromise = null;
  return result;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (res.ok) return undefined as T;
    throw new ApiError(res.statusText || 'Request failed', {
      code: 'HTTP_ERROR',
      status: res.status,
    });
  }
  const json = (await res.json()) as {
    success?: boolean;
    data?: T;
    error?: { code?: string; message?: string; details?: unknown };
  };
  if (!res.ok || json.success === false) {
    throw new ApiError(json.error?.message ?? 'Request failed', {
      code: json.error?.code ?? 'ERROR',
      status: res.status,
      details: json.error?.details,
    });
  }
  return json.data as T;
}

const NO_REFRESH_PATHS = new Set(['/auth/refresh', '/auth/login', '/auth/register']);

/** Send a request with the auth header + transparent 401→refresh→retry. Returns the raw Response. */
async function executeRequest(path: string, options: RequestOptions): Promise<Response> {
  const { body, params, skipAuthRefresh, headers, ...rest } = options;
  const url = buildUrl(path, params);

  const send = (): Promise<Response> =>
    fetch(url, {
      ...rest,
      credentials: 'include',
      headers: buildHeaders(headers, body),
      ...(body !== undefined
        ? { body: body instanceof FormData ? body : JSON.stringify(body) }
        : {}),
    });

  let res = await send();

  if (res.status === 401 && !skipAuthRefresh && !NO_REFRESH_PATHS.has(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await send(); // retry with the new access token
    } else {
      useAuthStore.getState().clearSession();
      throw new ApiError('Your session has expired. Please log in again.', {
        code: 'UNAUTHORIZED',
        status: 401,
      });
    }
  }
  return res;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return parseResponse<T>(await executeRequest(path, options));
}

export interface Paginated<T> {
  items: T[];
  pagination?: Pagination;
}

/** GET a list endpoint, capturing both the items and the pagination meta. */
export async function apiGetPaginated<T>(
  path: string,
  params?: QueryParams,
): Promise<Paginated<T>> {
  const res = await executeRequest(path, { method: 'GET', params });
  const json = (await res.json()) as {
    success?: boolean;
    data?: T[];
    error?: { code?: string; message?: string; details?: unknown };
    meta?: { pagination?: Pagination };
  };
  if (!res.ok || json.success === false) {
    throw new ApiError(json.error?.message ?? 'Request failed', {
      code: json.error?.code ?? 'ERROR',
      status: res.status,
      details: json.error?.details,
    });
  }
  return { items: json.data ?? [], pagination: json.meta?.pagination };
}

export interface WithMeta<T> {
  data: T;
  pagination?: Pagination;
}

/**
 * GET an endpoint whose `data` is an object (not a bare array) while still
 * capturing `meta.pagination` — e.g. notifications, which return
 * `{ notifications, unreadCount }` alongside pagination.
 */
export async function apiGetWithMeta<T>(path: string, params?: QueryParams): Promise<WithMeta<T>> {
  const res = await executeRequest(path, { method: 'GET', params });
  const json = (await res.json()) as {
    success?: boolean;
    data?: T;
    error?: { code?: string; message?: string; details?: unknown };
    meta?: { pagination?: Pagination };
  };
  if (!res.ok || json.success === false) {
    throw new ApiError(json.error?.message ?? 'Request failed', {
      code: json.error?.code ?? 'ERROR',
      status: res.status,
      details: json.error?.details,
    });
  }
  return { data: json.data as T, pagination: json.meta?.pagination };
}

/** Download a file (e.g. an attachment) honoring auth + the 401→refresh path. */
export async function downloadFile(path: string, fileName: string): Promise<void> {
  const res = await executeRequest(path, { method: 'GET', headers: { Accept: '*/*' } });
  if (!res.ok) {
    throw new ApiError('Download failed', { status: res.status, code: 'DOWNLOAD_FAILED' });
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => apiRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
