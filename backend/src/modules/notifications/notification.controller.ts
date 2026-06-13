import type { Request, Response } from 'express';
import { sendSuccess } from '../../core/http/envelope';
import { buildPaginationMeta } from '../../core/http/pagination';
import { getParams, getQuery } from '../../core/middleware/validate';
import * as service from './notification.service';
import type { ListNotificationsQuery, NotificationIdParams } from './notification.schemas';

export async function list(req: Request, res: Response): Promise<Response> {
  const { items, total, unreadCount, page, limit } = await service.listNotifications(
    req.auth!.userId,
    getQuery<ListNotificationsQuery>(req),
  );
  return sendSuccess(
    res,
    { notifications: items, unreadCount },
    { meta: { pagination: buildPaginationMeta(total, page, limit) } },
  );
}

export async function read(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<NotificationIdParams>(req);
  await service.markRead(req.auth!.userId, id);
  return sendSuccess(res, { message: 'Notification marked as read.' });
}

export async function readAll(req: Request, res: Response): Promise<Response> {
  const updated = await service.markAllRead(req.auth!.userId);
  return sendSuccess(res, { updated });
}
