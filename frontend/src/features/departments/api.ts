import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { Department } from '@/types';

/** Active departments — public endpoint, used by registration and ticket creation. */
export function usePublicDepartments() {
  return useQuery({
    queryKey: queryKeys.departments,
    queryFn: () => api.get<{ departments: Department[] }>('/departments'),
    select: (data) => data.departments,
    staleTime: 5 * 60_000,
  });
}

/** Engineer-only: full department list including inactive ones (admin management). */
export function useDepartments(includeInactive = true) {
  return useQuery({
    queryKey: queryKeys.adminDepartments(includeInactive),
    queryFn: () =>
      api.get<{ departments: Department[] }>('/departments', {
        params: includeInactive ? { includeInactive: true } : undefined,
      }),
    select: (data) => data.departments,
  });
}

export interface DepartmentInput {
  name: string;
}
export interface UpdateDepartmentInput {
  name?: string;
  isActive?: boolean;
}

function useDepartmentMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useCreateDepartment() {
  return useDepartmentMutation((input: DepartmentInput) =>
    api.post<{ department: Department }>('/departments', input),
  );
}

export function useUpdateDepartment() {
  return useDepartmentMutation(({ id, ...body }: UpdateDepartmentInput & { id: string }) =>
    api.patch<{ department: Department }>(`/departments/${id}`, body),
  );
}
