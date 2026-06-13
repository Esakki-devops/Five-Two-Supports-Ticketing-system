import { eventBus } from '../../core/events/event-bus';
import type {
  TicketAssignedPayload,
  TicketCommentedPayload,
  TicketStatusChangedPayload,
  UserEventPayload,
} from '../../core/events/event-bus';
import { realtime } from '../../core/realtime/gateway';
import { logger } from '../../core/logger/index';
import { NotificationType, Role, TicketStatus, UserStatus } from '../../common/types/index';
import { User } from '../users/user.model';
import { dispatchNotification } from './notification.service';

/**
 * The notification rules: which domain events notify whom, with what message and
 * type. Each handler dispatches an in-app record + socket push + queued email.
 */

/** Live-refresh hint for everyone involved in a ticket. */
function pushTicketUpdate(payload: {
  ticketId: string;
  requesterId: string;
  assigneeId: string | null;
}): void {
  const ids = new Set<string>([payload.requesterId]);
  if (payload.assigneeId) ids.add(payload.assigneeId);
  for (const id of ids) realtime.pushToUser(id, 'ticket:updated', { ticketId: payload.ticketId });
}

function statusNotification(payload: TicketStatusChangedPayload): {
  type: NotificationType;
  message: string;
} {
  switch (payload.to) {
    case TicketStatus.Resolved:
      return {
        type: NotificationType.Resolution,
        message: `Ticket ${payload.ticketNumber} has been resolved. Please confirm or reopen it.`,
      };
    case TicketStatus.Closed:
      return {
        type: NotificationType.Closure,
        message: `Ticket ${payload.ticketNumber} has been closed.`,
      };
    default:
      return {
        type: NotificationType.StatusChange,
        message: `Ticket ${payload.ticketNumber} is now "${payload.to.replace(/_/g, ' ')}".`,
      };
  }
}

let registered = false;

/** Idempotently wire the domain-event → notification handlers. Safe to call repeatedly. */
export function registerNotificationSubscribers(): void {
  if (registered) return;
  registered = true;

  eventBus.on('ticket.assigned', async (p: TicketAssignedPayload) => {
    if (p.assigneeId !== p.actorId) {
      await dispatchNotification(
        p.assigneeId,
        NotificationType.Assignment,
        p.ticketId,
        `You were assigned ticket ${p.ticketNumber}: ${p.title}`,
      );
    }
    pushTicketUpdate(p);
  });

  eventBus.on('ticket.statusChanged', async (p: TicketStatusChangedPayload) => {
    if (p.requesterId !== p.actorId) {
      const { type, message } = statusNotification(p);
      await dispatchNotification(p.requesterId, type, p.ticketId, message);
    }
    pushTicketUpdate(p);
  });

  eventBus.on('ticket.commented', async (p: TicketCommentedPayload) => {
    const recipients = new Set<string>();
    if (p.requesterId !== p.commentAuthorId) recipients.add(p.requesterId);
    if (p.assigneeId && p.assigneeId !== p.commentAuthorId) recipients.add(p.assigneeId);
    for (const recipient of recipients) {
      await dispatchNotification(
        recipient,
        NotificationType.Comment,
        p.ticketId,
        `New comment on ticket ${p.ticketNumber}.`,
      );
    }
    pushTicketUpdate(p);
  });

  eventBus.on('user.registered', async (p: UserEventPayload) => {
    const engineers = await User.find({ role: Role.Engineer, status: UserStatus.Active }).select(
      '_id',
    );
    for (const engineer of engineers) {
      await dispatchNotification(
        String(engineer._id),
        NotificationType.Registration,
        null,
        `New registration from ${p.name} (${p.email}) is awaiting approval.`,
      );
    }
  });

  eventBus.on('user.approved', async (p: UserEventPayload) => {
    await dispatchNotification(
      p.userId,
      NotificationType.Approval,
      null,
      'Your account has been approved. You can now log in.',
    );
  });

  eventBus.on('user.rejected', async (p: UserEventPayload) => {
    await dispatchNotification(
      p.userId,
      NotificationType.Rejection,
      null,
      'Your registration was not approved. Please contact IT support.',
    );
  });

  logger.debug('Notification subscribers registered');
}
