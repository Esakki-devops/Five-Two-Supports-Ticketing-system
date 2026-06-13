import { z } from 'zod';

export const createTicketSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().min(1, 'Description is required').max(10000),
    department: z.string().min(1, 'Select a department'),
    category: z.string().min(1, 'Select a category'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    // Engineer-only:
    mode: z.enum(['self', 'onBehalf', 'internal']).optional(),
    requester: z.string().optional(),
  })
  .refine((data) => data.mode !== 'onBehalf' || Boolean(data.requester), {
    message: 'Select the employee this is for',
    path: ['requester'],
  });

export type CreateTicketForm = z.infer<typeof createTicketSchema>;
