/** Centralized React Query keys, so invalidation stays consistent across features. */
export const queryKeys = {
  me: ['me'] as const,
  departments: ['departments'] as const,
  categories: (department?: string) => ['categories', department ?? 'all'] as const,
  adminDepartments: (includeInactive?: boolean) =>
    ['departments', 'admin', { includeInactive: includeInactive ?? false }] as const,
  adminCategories: (filters?: object) => ['categories', 'admin', filters ?? {}] as const,
  tickets: (filters?: object) => ['tickets', filters ?? {}] as const,
  ticket: (id: string) => ['ticket', id] as const,
  notifications: (filters?: object) => ['notifications', filters ?? {}] as const,
  users: (filters?: object) => ['users', filters ?? {}] as const,
  dashboard: ['dashboard', 'summary'] as const,
};
