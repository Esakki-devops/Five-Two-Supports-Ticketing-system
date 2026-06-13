import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiGetWithMeta, type QueryParams } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { NotificationItem, Pagination } from '@/types';

export interface NotificationFilters {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
  pagination?: Pagination;
}

interface NotificationListData {
  notifications: NotificationItem[];
  unreadCount: number;
}

/** List notifications (+ unread count + pagination meta) for the current user. */
export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery({
    queryKey: queryKeys.notifications(filters),
    queryFn: () => apiGetWithMeta<NotificationListData>('/notifications', filters as QueryParams),
    placeholderData: keepPreviousData,
    select: (res): NotificationsResult => ({
      notifications: res.data.notifications,
      unreadCount: res.data.unreadCount,
      pagination: res.pagination,
    }),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ message: string }>(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch<{ updated: number }>('/notifications/read-all', {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** A notification's linked ticket id, whether the ref is populated or a raw id. */
export function notificationTicketId(notification: NotificationItem): string | null {
  const ticket = notification.ticket;
  if (!ticket) return null;
  return typeof ticket === 'string' ? ticket : ticket.id;
}
