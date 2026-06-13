import { z } from 'zod';
import { objectId, queryBoolean } from '../../common/schemas/index';

export const listNotificationsQuerySchema = z.object({
  unreadOnly: queryBoolean,
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export const notificationIdParamsSchema = z.object({ id: objectId });
export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>;
