import { NotificationType, TicketStatus } from '../../common/types/index';
import { realtime } from '../../core/realtime/gateway';
import { Ticket } from '../../modules/tickets/ticket.model';
import { dispatchNotification } from '../../modules/notifications/notification.service';

/**
 * Day-5 reminder. Guarded: only acts if the ticket is still resolved (it may have
 * been confirmed/reopened in the meantime).
 */
export async function processResolutionReminder(ticketId: string): Promise<{ reminded: boolean }> {
  const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: false });
  if (!ticket || ticket.status !== TicketStatus.Resolved) return { reminded: false };

  await dispatchNotification(
    String(ticket.requester),
    NotificationType.Reminder,
    ticketId,
    `Reminder: ticket ${ticket.ticketNumber} is awaiting your confirmation and will auto-close soon if there is no response.`,
  );
  return { reminded: true };
}

/**
 * Day-7 auto-close. Guarded: only closes a ticket still in "resolved". Idempotent —
 * re-running after close is a no-op.
 */
export async function processAutoClose(ticketId: string): Promise<{ closed: boolean }> {
  const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: false });
  if (!ticket || ticket.status !== TicketStatus.Resolved) return { closed: false };

  ticket.status = TicketStatus.Closed;
  ticket.closedAt = new Date();
  ticket.activity.push({
    actor: ticket.assignee ?? ticket.requester, // attributed to the handler/requester
    action: 'auto_closed',
    from: TicketStatus.Resolved,
    to: TicketStatus.Closed,
    at: new Date(),
  });
  await ticket.save();

  await dispatchNotification(
    String(ticket.requester),
    NotificationType.Closure,
    ticketId,
    `Ticket ${ticket.ticketNumber} was automatically closed after no response.`,
  );
  realtime.pushToUser(String(ticket.requester), 'ticket:updated', { ticketId });
  return { closed: true };
}
