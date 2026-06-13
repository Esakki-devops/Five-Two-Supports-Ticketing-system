import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import type { Role } from '@/types';

/** Gate for authenticated routes — redirects to login when not signed in. */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'authenticated') return <Outlet />;
  return <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

/** Gate for guest-only routes (login/register) — redirects signed-in users away. */
export function RequireGuest() {
  const status = useAuthStore((s) => s.status);
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/** Role gate for engineer/admin sections. */
export function RequireRole({ role }: { role: Role }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role === role) return <Outlet />;
  return <Navigate to="/dashboard" replace />;
}
