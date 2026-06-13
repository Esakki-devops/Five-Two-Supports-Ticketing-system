import { z } from 'zod';
import { objectId, queryBoolean } from '../../common/schemas/index';

export const listCategoriesQuerySchema = z.object({
  includeInactive: queryBoolean,
  department: objectId.optional(),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  department: objectId.optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    department: objectId.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.department !== undefined || d.isActive !== undefined, {
    message: 'Provide a name, department, and/or isActive to update',
  });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryIdParamsSchema = z.object({ id: objectId });
export type CategoryIdParams = z.infer<typeof categoryIdParamsSchema>;
