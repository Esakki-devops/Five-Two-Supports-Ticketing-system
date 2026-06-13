import { api } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';
import type { AuthResult } from '@/types';

/**
 * Silent session restore on app load: the access token is gone after a reload, but
 * the httpOnly refresh cookie survives — so we try a refresh once at startup.
 */
export async function bootstrapSession(): Promise<void> {
  try {
    const data = await api.post<AuthResult>('/auth/refresh', undefined, { skipAuthRefresh: true });
    useAuthStore.getState().setSession(data.user, data.accessToken);
  } catch {
    useAuthStore.getState().setUnauthenticated();
  }
}

/** Best-effort server logout + local clear. */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout', undefined, { skipAuthRefresh: true });
  } catch {
    /* ignore network errors on logout */
  }
  useAuthStore.getState().clearSession();
}
