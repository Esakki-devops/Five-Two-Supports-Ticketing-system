import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { DashboardSummary } from '@/types';

/** Role-scoped dashboard metrics (backend scopes employees to their own tickets). */
export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
    staleTime: 60_000,
  });
}
