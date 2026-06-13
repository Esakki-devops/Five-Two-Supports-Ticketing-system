import { create } from 'zustand';
import type { Role, User } from '@/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  // Access token is kept in memory only; the refresh token lives in an httpOnly cookie.
  accessToken: string | null;
  setSession: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  setUnauthenticated: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
  setUser: (user) => set({ user }),
  setUnauthenticated: () => set({ status: 'unauthenticated', user: null, accessToken: null }),
  clearSession: () => set({ status: 'unauthenticated', user: null, accessToken: null }),
}));

/** Selector helpers. */
export const useCurrentUser = (): User | null => useAuthStore((s) => s.user);
export const useIsRole = (role: Role): boolean => useAuthStore((s) => s.user?.role === role);
