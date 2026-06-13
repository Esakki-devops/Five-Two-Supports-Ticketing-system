import { EventEmitter } from 'node:events';
import { logger } from '../logger/index';
import type { TicketStatus } from '../../common/types/index';

/**
 * In-process typed domain event bus. Modules emit domain events; cross-cutting
 * concerns (notifications, real-time pushes, audit) subscribe — without modules
 * importing each other. Phase 5 registers the notification/real-time handlers.
 */

export interface TicketEventPayload {
  ticketId: string;
  ticketNumber: string;
  title: string;
  actorId: string;
  requesterId: string;
  assigneeId: string | null;
  isInternal: boolean;
}

export interface TicketAssignedPayload extends TicketEventPayload {
  assigneeId: string;
}

export interface TicketStatusChangedPayload extends TicketEventPayload {
  from: TicketStatus;
  to: TicketStatus;
}

export interface TicketCommentedPayload extends TicketEventPayload {
  commentAuthorId: string;
  commentBody: string;
}

export interface UserEventPayload {
  userId: string;
  email: string;
  name: string;
}

export interface DomainEventMap {
  'ticket.created': TicketEventPayload;
  'ticket.assigned': TicketAssignedPayload;
  'ticket.statusChanged': TicketStatusChangedPayload;
  'ticket.commented': TicketCommentedPayload;
  'ticket.deleted': TicketEventPayload;
  'user.registered': UserEventPayload;
  'user.approved': UserEventPayload;
  'user.rejected': UserEventPayload;
}

export type DomainEventName = keyof DomainEventMap;
type Handler<K extends DomainEventName> = (payload: DomainEventMap[K]) => void | Promise<void>;

class DomainEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  on<K extends DomainEventName>(event: K, handler: Handler<K>): void {
    this.emitter.on(event, (payload: DomainEventMap[K]) => {
      // A failing subscriber must never break the request that emitted the event.
      Promise.resolve(handler(payload)).catch((err) =>
        logger.error({ err, event }, 'Domain event handler failed'),
      );
    });
  }

  emit<K extends DomainEventName>(event: K, payload: DomainEventMap[K]): void {
    this.emitter.emit(event, payload);
  }
}

export const eventBus = new DomainEventBus();
