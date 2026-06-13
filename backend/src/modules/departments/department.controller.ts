import type { Request, Response } from 'express';
import { sendSuccess } from '../../core/http/envelope';
import { getBody, getParams, getQuery } from '../../core/middleware/validate';
import * as service from './department.service';
import type {
  CreateDepartmentInput,
  DepartmentIdParams,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
} from './department.schemas';

export async function list(req: Request, res: Response): Promise<Response> {
  const { includeInactive } = getQuery<ListDepartmentsQuery>(req);
  const departments = await service.listDepartments({ includeInactive });
  return sendSuccess(res, { departments });
}

export async function create(req: Request, res: Response): Promise<Response> {
  const department = await service.createDepartment(getBody<CreateDepartmentInput>(req));
  return sendSuccess(res, { department }, { status: 201 });
}

export async function update(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<DepartmentIdParams>(req);
  const department = await service.updateDepartment(id, getBody<UpdateDepartmentInput>(req));
  return sendSuccess(res, { department });
}
