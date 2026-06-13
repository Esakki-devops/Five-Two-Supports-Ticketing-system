import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, CheckCheck } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  NotificationItem as NotificationRow,
  PageHeader,
  Pagination,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/design-system';
import type { NotificationItem } from '@/types';
import {
  notificationTicketId,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationFilters,
} from '../api';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);

  const filters: NotificationFilters = {
    page,
    limit: 20,
    ...(tab === 'unread' ? { unreadOnly: true } : {}),
  };
  const { data, isLoading } = useNotifications(filters);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const pagination = data?.pagination;

  const handleSelect = (notification: NotificationItem) => {
    if (!notification.isRead) markRead.mutate(notification.id);
    const ticketId = notificationTicketId(notification);
    if (ticketId) navigate(`/tickets/${ticketId}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Notifications"
        description="Stay on top of ticket activity."
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as 'all' | 'unread');
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            description={
              tab === 'unread'
                ? "You're all caught up."
                : 'Ticket activity and updates will appear here.'
            }
          />
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                type={notification.type}
                message={notification.message}
                createdAt={notification.createdAt}
                isRead={notification.isRead}
                onClick={() => handleSelect(notification)}
              />
            ))}
          </div>
        )}
      </Card>

      {pagination && pagination.total > 0 ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
