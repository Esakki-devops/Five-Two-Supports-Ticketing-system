import { Types } from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../core/errors/AppError';
import { getPagination } from '../../core/http/pagination';
import { eventBus } from '../../core/events/event-bus';
import type { AuthContext } from '../../core/middleware/auth-context';
import { Role, TicketPriority, TicketStatus, UserStatus } from '../../common/types/index';
import { Category } from '../categories/category.model';
import { Department } from '../departments/department.model';
import { User } from '../users/user.model';
import { Ticket, type TicketDocument } from './ticket.model';
import { nextTicketNumber } from './counter.model';
import { employeeCanTransition, isValidTransition } from './ticket.transitions';
import type {
  AddCommentInput,
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from './ticket.schemas';

type Serialized = Record<string, unknown>;
const serialize = (doc: { toJSON: () => unknown }): Serialized => doc.toJSON() as Serialized;

/** Employee may read a ticket only if it is theirs and not internal; else 404 (no existence leak). */
export function assertCanView(actor: AuthContext, ticket: TicketDocument): void {
  if (actor.role === Role.Engineer) return;
  if (String(ticket.requester) !== actor.userId || ticket.isInternal) {
    throw new NotFoundError('Ticket not found.');
  }
}

export async function populateTicket(ticket: TicketDocument): Promise<TicketDocument> {
  return ticket.populate([
    { path: 'requester', select: 'name email' },
    { path: 'assignee', select: 'name email' },
    { path: 'createdBy', select: 'name email' },
    { path: 'department', select: 'name' },
    { path: 'category', select: 'name' },
    { path: 'comments.author', select: 'name email' },
    { path: 'activity.actor', select: 'name email' },
  ]);
}

function toEventPayload(
  ticket: TicketDocument,
  actorId: string,
): {
  ticketId: string;
  ticketNumber: string;
  title: string;
  actorId: string;
  requesterId: string;
  assigneeId: string | null;
  isInternal: boolean;
} {
  return {
    ticketId: String(ticket._id),
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    actorId,
    requesterId: String(ticket.requester),
    assigneeId: ticket.assignee ? String(ticket.assignee) : null,
    isInternal: ticket.isInternal,
  };
}

function parseSort(sort?: string): Record<string, 1 | -1> {
  switch (sort) {
    case 'createdAt':
      return { createdAt: 1 };
    case 'updatedAt':
      return { updatedAt: 1 };
    case '-updatedAt':
      return { updatedAt: -1 };
    case 'priority':
      return { priority: 1 };
    case '-priority':
      return { priority: -1 };
    default:
      return { createdAt: -1 };
  }
}

export async function createTicket(
  actor: AuthContext,
  input: CreateTicketInput,
): Promise<Serialized> {
  const [departmentExists, categoryExists] = await Promise.all([
    Department.exists({ _id: input.department, isActive: true }),
    Category.exists({ _id: input.category, isActive: true }),
  ]);
  if (!departmentExists) throw new BadRequestError('The selected department does not exist.');
  if (!categoryExists) throw new BadRequestError('The selected category does not exist.');

  let requesterId = actor.userId;
  let isInternal = false;

  if (actor.role === Role.Engineer) {
    isInternal = input.isInternal ?? false;
    if (!isInternal && input.requester) {
      const target = await User.findById(input.requester);
      if (!target) throw new BadRequestError('The specified requester does not exist.');
      requesterId = String(target._id);
    }
  }

  const ticketNumber = await nextTicketNumber();
  const ticket = await Ticket.create({
    ticketNumber,
    title: input.title,
    description: input.description,
    createdBy: new Types.ObjectId(actor.userId),
    requester: new Types.ObjectId(requesterId),
    department: new Types.ObjectId(input.department),
    category: new Types.ObjectId(input.category),
    priority: input.priority ?? TicketPriority.Medium,
    status: TicketStatus.New,
    isInternal,
    activity: [{ actor: new Types.ObjectId(actor.userId), action: 'created', at: new Date() }],
  });

  eventBus.emit('ticket.created', toEventPayload(ticket, actor.userId));
  return serialize(await populateTicket(ticket));
}

export async function listTickets(
  actor: AuthContext,
  query: ListTicketsQuery,
): Promise<{ items: Serialized[]; total: number; page: number; limit: number }> {
  const { page, limit, skip } = getPagination(query);

  const filter: Record<string, unknown> = { isDeleted: false };
  if (actor.role === Role.Engineer) {
    if (query.requester) filter.requester = query.requester;
    if (query.assignee) filter.assignee = query.assignee;
  } else {
    // Employee scope is enforced before any other filter.
    filter.requester = actor.userId;
    filter.isInternal = false;
  }
  if (query.department) filter.department = query.department;
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.q) filter.$text = { $search: query.q };

  const [items, total] = await Promise.all([
    Ticket.find(filter)
      .select('-comments -activity -attachments') // never return heavy arrays in lists
      .populate('requester', 'name email')
      .populate('assignee', 'name email')
      .populate('department', 'name')
      .populate('category', 'name')
      .sort(parseSort(query.sort))
      .skip(skip)
      .limit(limit),
    Ticket.countDocuments(filter),
  ]);

  return { items: items.map(serialize), total, page, limit };
}

export async function getTicket(actor: AuthContext, id: string): Promise<Serialized> {
  const ticket = await Ticket.findOne({ _id: id, isDeleted: false });
  if (!ticket) throw new NotFoundError('Ticket not found.');
  assertCanView(actor, ticket);
  return serialize(await populateTicket(ticket));
}

function applyTransition(
  ticket: TicketDocument,
  to: TicketStatus,
  actorId: string,
  isEmployee: boolean,
): void {
  const from = ticket.status as TicketStatus;
  if (!isValidTransition(from, to)) {
    throw new BadRequestError(`Cannot change status from '${from}' to '${to}'.`);
  }
  if (isEmployee && !employeeCanTransition(from, to)) {
    throw new ForbiddenError('You can only confirm or reopen your own tickets.');
  }
  ticket.status = to;
  if (to === TicketStatus.Resolved) ticket.resolvedAt = new Date();
  else if (to === TicketStatus.Closed) ticket.closedAt = new Date();
  else if (to === TicketStatus.Reopened) {
    ticket.resolvedAt = null;
    ticket.closedAt = null;
  }
  ticket.activity.push({
    actor: new Types.ObjectId(actorId),
    action: 'status_changed',
    from,
    to,
    at: new Date(),
  });
}

export async function updateTicket(
  actor: AuthContext,
  id: string,
  input: UpdateTicketInput,
): Promise<Serialized> {
  const ticket = await Ticket.findOne({ _id: id, isDeleted: false });
  if (!ticket) throw new NotFoundError('Ticket not found.');
  assertCanView(actor, ticket);

  let statusChange: { from: TicketStatus; to: TicketStatus } | null = null;

  if (actor.role === Role.Employee) {
    const keys = Object.keys(input);
    if (keys.length !== 1 || keys[0] !== 'status' || !input.status) {
      throw new ForbiddenError('You can only confirm or reopen your own tickets.');
    }
    if (input.status !== ticket.status) {
      const from = ticket.status as TicketStatus;
      applyTransition(ticket, input.status, actor.userId, true);
      statusChange = { from, to: input.status };
    }
  } else {
    if (input.title !== undefined) ticket.title = input.title;
    if (input.description !== undefined) ticket.description = input.description;
    if (input.isInternal !== undefined) ticket.isInternal = input.isInternal;
    if (input.department !== undefined) {
      if (!(await Department.exists({ _id: input.department, isActive: true }))) {
        throw new BadRequestError('The selected department does not exist.');
      }
      ticket.department = new Types.ObjectId(input.department);
    }
    if (input.category !== undefined) {
      if (!(await Category.exists({ _id: input.category, isActive: true }))) {
        throw new BadRequestError('The selected category does not exist.');
      }
      ticket.category = new Types.ObjectId(input.category);
    }
    if (input.priority !== undefined && input.priority !== ticket.priority) {
      ticket.activity.push({
        actor: new Types.ObjectId(actor.userId),
        action: 'priority_changed',
        from: ticket.priority,
        to: input.priority,
        at: new Date(),
      });
      ticket.priority = input.priority;
    }
    if (input.status !== undefined && input.status !== ticket.status) {
      const from = ticket.status as TicketStatus;
      applyTransition(ticket, input.status, actor.userId, false);
      statusChange = { from, to: input.status };
    }
  }

  await ticket.save();

  if (statusChange) {
    eventBus.emit('ticket.statusChanged', {
      ...toEventPayload(ticket, actor.userId),
      from: statusChange.from,
      to: statusChange.to,
    });
  }
  return serialize(await populateTicket(ticket));
}

export async function assignTicket(
  actor: AuthContext,
  id: string,
  input: AssignTicketInput,
): Promise<Serialized> {
  const ticket = await Ticket.findOne({ _id: id, isDeleted: false });
  if (!ticket) throw new NotFoundError('Ticket not found.');

  let assigneeId: string | null = null;
  if (input.assignee) {
    const assignee = await User.findById(input.assignee);
    if (!assignee || assignee.role !== Role.Engineer || assignee.status !== UserStatus.Active) {
      throw new BadRequestError('Tickets can only be assigned to an active engineer.');
    }
    assigneeId = String(assignee._id);
    ticket.assignee = new Types.ObjectId(assigneeId);
  } else {
    ticket.assignee = null;
  }

  ticket.activity.push({
    actor: new Types.ObjectId(actor.userId),
    action: assigneeId ? 'assigned' : 'unassigned',
    to: assigneeId ?? undefined,
    at: new Date(),
  });
  await ticket.save();

  if (assigneeId) {
    eventBus.emit('ticket.assigned', { ...toEventPayload(ticket, actor.userId), assigneeId });
  }
  return serialize(await populateTicket(ticket));
}

export async function addComment(
  actor: AuthContext,
  id: string,
  input: AddCommentInput,
): Promise<Serialized> {
  const ticket = await Ticket.findOne({ _id: id, isDeleted: false });
  if (!ticket) throw new NotFoundError('Ticket not found.');
  assertCanView(actor, ticket);

  ticket.comments.push({
    author: new Types.ObjectId(actor.userId),
    body: input.body,
    createdAt: new Date(),
  });
  await ticket.save();

  eventBus.emit('ticket.commented', {
    ...toEventPayload(ticket, actor.userId),
    commentAuthorId: actor.userId,
    commentBody: input.body,
  });
  return serialize(await populateTicket(ticket));
}

export async function deleteTicket(actor: AuthContext, id: string): Promise<void> {
  const ticket = await Ticket.findOne({ _id: id, isDeleted: false });
  if (!ticket) throw new NotFoundError('Ticket not found.');

  ticket.isDeleted = true;
  ticket.activity.push({
    actor: new Types.ObjectId(actor.userId),
    action: 'deleted',
    at: new Date(),
  });
  await ticket.save();

  eventBus.emit('ticket.deleted', toEventPayload(ticket, actor.userId));
}
