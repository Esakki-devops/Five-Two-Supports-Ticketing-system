import { z } from 'zod';
import { objectId } from '../../common/schemas/index';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../../common/types/index';

export const createTicketSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  department: objectId,
  category: objectId,
  priority: z.enum(TICKET_PRIORITIES).optional(),
  // Engineer-only modifiers (ignored for employees):
  requester: objectId.optional(), // on-behalf-of
  isInternal: z.boolean().optional(), // internal ticket
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(10000).optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    department: objectId.optional(),
    category: objectId.optional(),
    isInternal: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const assignTicketSchema = z.object({
  assignee: objectId.nullable(),
});
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const addCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});
export type AddCommentInput = z.infer<typeof addCommentSchema>;

export const listTicketsQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  department: objectId.optional(),
  assignee: objectId.optional(),
  requester: objectId.optional(),
  q: z.string().trim().max(200).optional(),
  sort: z
    .enum(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'priority', '-priority'])
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const ticketIdParamsSchema = z.object({ id: objectId });
export type TicketIdParams = z.infer<typeof ticketIdParamsSchema>;

export const attachmentParamsSchema = z.object({ id: objectId, attId: objectId });
export type AttachmentParams = z.infer<typeof attachmentParamsSchema>;
