import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth';
import { bootstrapSession } from '@/lib/auth/session';
import { FullPageSpinner } from '@/components/Spinner';

/** Restores the session (silent refresh) before rendering the router. */
export function SessionGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    void bootstrapSession();
  }, []);

  if (status === 'loading') return <FullPageSpinner />;
  return <>{children}</>;
}
