import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { ROLES, Role, USER_STATUSES } from '../../common/types/index';

const objectId = z.string().refine((v) => isValidObjectId(v), 'Invalid id');

export const listUsersQuerySchema = z.object({
  status: z.enum(USER_STATUSES).optional(),
  role: z.enum(ROLES).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.email().max(254),
    password: z.string().min(8).max(128),
    role: z.enum(ROLES),
    department: objectId.optional(),
  })
  .refine((d) => d.role !== Role.Employee || Boolean(d.department), {
    message: 'Department is required for employees',
    path: ['department'],
  });
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const userIdParamsSchema = z.object({ id: objectId });
export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export const updateStatusSchema = z
  .object({
    status: z.enum(['active', 'disabled']).optional(),
    role: z.enum(ROLES).optional(),
  })
  .refine((d) => d.status !== undefined || d.role !== undefined, {
    message: 'Provide a status and/or role to update',
  });
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
