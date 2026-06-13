import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '@/lib/socket/socket';
import { queryKeys } from '@/lib/query/keys';
import { toast } from '@/design-system';
import type { NotificationItem } from '@/types';

/**
 * Owns the Socket.IO connection for the authenticated app shell and bridges
 * server events into the React Query cache:
 *   • `notification:new`  → refresh notification queries + surface a toast
 *   • `ticket:updated`    → refetch the affected ticket + the ticket lists
 */
export function SocketManager() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return; // never open sockets in unit tests
    const socket = connectSocket();
    if (!socket) return;

    const handleNotification = (notification: NotificationItem) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (notification?.message) toast(notification.message);
    };

    const handleTicketUpdated = (payload: { ticketId: string }) => {
      if (payload?.ticketId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.ticket(payload.ticketId) });
      }
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    };

    socket.on('notification:new', handleNotification);
    socket.on('ticket:updated', handleTicketUpdated);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('ticket:updated', handleTicketUpdated);
      disconnectSocket();
    };
  }, [queryClient]);

  return null;
}
