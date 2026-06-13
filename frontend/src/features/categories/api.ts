import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { Category } from '@/types';

/** Active categories — public endpoint, used by the ticket-creation form. */
export function usePublicCategories(department?: string) {
  return useQuery({
    queryKey: queryKeys.categories(department),
    queryFn: () =>
      api.get<{ categories: Category[] }>('/categories', {
        params: department ? { department } : undefined,
      }),
    select: (data) => data.categories,
    staleTime: 5 * 60_000,
  });
}

/** Engineer-only: full category list including inactive ones (admin management). */
export function useCategories(department?: string, includeInactive = true) {
  return useQuery({
    queryKey: queryKeys.adminCategories({ department: department ?? 'all', includeInactive }),
    queryFn: () =>
      api.get<{ categories: Category[] }>('/categories', {
        params: {
          ...(includeInactive ? { includeInactive: true } : {}),
          ...(department ? { department } : {}),
        },
      }),
    select: (data) => data.categories,
  });
}

export interface CategoryInput {
  name: string;
  department?: string;
}
export interface UpdateCategoryInput {
  name?: string;
  department?: string | null;
  isActive?: boolean;
}

function useCategoryMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useCreateCategory() {
  return useCategoryMutation((input: CategoryInput) =>
    api.post<{ category: Category }>('/categories', input),
  );
}

export function useUpdateCategory() {
  return useCategoryMutation(({ id, ...body }: UpdateCategoryInput & { id: string }) =>
    api.patch<{ category: Category }>(`/categories/${id}`, body),
  );
}
