import { z } from 'zod';
import { objectId, queryBoolean } from '../../common/schemas/index';

export const listDepartmentsQuerySchema = z.object({
  includeInactive: queryBoolean,
});
export type ListDepartmentsQuery = z.infer<typeof listDepartmentsQuerySchema>;

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.isActive !== undefined, {
    message: 'Provide a name and/or isActive to update',
  });
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const departmentIdParamsSchema = z.object({ id: objectId });
export type DepartmentIdParams = z.infer<typeof departmentIdParamsSchema>;
