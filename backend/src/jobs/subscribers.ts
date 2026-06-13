import { eventBus } from '../core/events/event-bus';
import { TicketStatus } from '../common/types/index';
import { scheduleResolutionFollowups } from './scheduler';

let registered = false;

/** Schedule reminder/auto-close jobs whenever a ticket transitions to resolved. */
export function registerJobSubscribers(): void {
  if (registered) return;
  registered = true;
  eventBus.on('ticket.statusChanged', (payload) => {
    if (payload.to === TicketStatus.Resolved) {
      scheduleResolutionFollowups(payload.ticketId);
    }
  });
}
