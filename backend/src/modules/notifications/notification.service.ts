import { Types } from 'mongoose';
import { NotFoundError } from '../../core/errors/AppError';
import { getPagination } from '../../core/http/pagination';
import type { NotificationType } from '../../common/types/index';
import { realtime } from '../../core/realtime/gateway';
import { renderNotificationEmail } from '../../integrations/mail/templates';
import { enqueueEmail } from '../../jobs/queues';
import { Notification } from './notification.model';
import type { ListNotificationsQuery } from './notification.schemas';

type Serialized = Record<string, unknown>;
const serialize = (doc: { toJSON: () => unknown }): Serialized => doc.toJSON() as Serialized;

export interface CreateNotificationInput {
  recipient: string;
  type: NotificationType;
  ticket?: string | null;
  message: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<Serialized> {
  const notification = await Notification.create({
    recipient: new Types.ObjectId(input.recipient),
    type: input.type,
    ticket: input.ticket ? new Types.ObjectId(input.ticket) : null,
    message: input.message,
  });
  return serialize(notification);
}

/**
 * Full notification dispatch: write the in-app record, push it to the recipient's
 * socket room, and enqueue the transactional email. Used by event subscribers and
 * by scheduled jobs (reminder/auto-close).
 */
export async function dispatchNotification(
  recipientId: string,
  type: NotificationType,
  ticketId: string | null,
  message: string,
): Promise<Serialized> {
  const notification = await createNotification({
    recipient: recipientId,
    type,
    ticket: ticketId,
    message,
  });
  realtime.pushToUser(recipientId, 'notification:new', notification);
  const email = renderNotificationEmail({ type, message, ticketId });
  enqueueEmail({ recipientId, subject: email.subject, html: email.html, text: email.text });
  return notification;
}

export async function listNotifications(
  userId: string,
  query: ListNotificationsQuery,
): Promise<{
  items: Serialized[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}> {
  const { page, limit, skip } = getPagination(query);

  const filter: Record<string, unknown> = { recipient: userId };
  if (query.unreadOnly) filter.isRead = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('ticket', 'ticketNumber title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return { items: items.map(serialize), total, unreadCount, page, limit };
}

export async function markRead(userId: string, id: string): Promise<void> {
  const result = await Notification.updateOne(
    { _id: id, recipient: userId },
    { $set: { isRead: true } },
  );
  if (result.matchedCount === 0) throw new NotFoundError('Notification not found.');
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true } },
  );
  return result.modifiedCount;
}
