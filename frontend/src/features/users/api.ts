import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiGetPaginated, type QueryParams } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { Role, User, UserStatus } from '@/types';

export interface UserFilters {
  status?: string;
  role?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  department?: string;
}

/** Engineer-only: list/search users (admin + ticket assignment/on-behalf selects). */
export function useUsers(filters: UserFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.users(filters),
    queryFn: () => apiGetPaginated<User>('/users', filters as QueryParams),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

function useUserMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCreateUser() {
  return useUserMutation((input: CreateUserInput) => api.post<{ user: User }>('/users', input));
}

export function useApproveUser() {
  return useUserMutation((id: string) => api.patch<{ user: User }>(`/users/${id}/approve`));
}

export function useRejectUser() {
  return useUserMutation((id: string) => api.patch<{ user: User }>(`/users/${id}/reject`));
}

export interface UpdateUserStatusInput {
  id: string;
  status?: Extract<UserStatus, 'active' | 'disabled'>;
  role?: Role;
}

export function useUpdateUserStatus() {
  return useUserMutation(({ id, ...body }: UpdateUserStatusInput) =>
    api.patch<{ user: User }>(`/users/${id}/status`, body),
  );
}
