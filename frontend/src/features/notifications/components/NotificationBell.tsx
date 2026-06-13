import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import {
  Button,
  NotificationItem as NotificationRow,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from '@/design-system';
import type { NotificationItem } from '@/types';
import {
  notificationTicketId,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../api';

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotifications({ limit: 8 });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleSelect = (notification: NotificationItem) => {
    if (!notification.isRead) markRead.mutate(notification.id);
    const ticketId = notificationTicketId(notification);
    setOpen(false);
    if (ticketId) navigate(`/tickets/${ticketId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 ? (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto p-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                type={notification.type}
                message={notification.message}
                createdAt={notification.createdAt}
                isRead={notification.isRead}
                onClick={() => handleSelect(notification)}
              />
            ))
          )}
        </div>

        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
          >
            View all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
