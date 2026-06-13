import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';
import type { AuthResult, User } from '@/types';
import type { ForgotPasswordInput, LoginInput, RegisterInput } from './schemas';

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) =>
      api.post<AuthResult>('/auth/login', input, { skipAuthRefresh: true }),
    onSuccess: (data) => {
      useAuthStore.getState().setSession(data.user, data.accessToken);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post<{ user: User }>('/auth/register', input, { skipAuthRefresh: true }),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      api.post<{ message: string }>('/auth/forgot-password', input, { skipAuthRefresh: true }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      api.post<{ message: string }>('/auth/reset-password', input, { skipAuthRefresh: true }),
  });
}
