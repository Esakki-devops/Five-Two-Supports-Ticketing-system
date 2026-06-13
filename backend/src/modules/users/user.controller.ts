import type { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '../../core/http/envelope';
import { buildPaginationMeta } from '../../core/http/pagination';
import { getBody, getParams, getQuery } from '../../core/middleware/validate';
import * as userService from './user.service';
import type {
  CreateUserInput,
  ListUsersQuery,
  UpdateStatusInput,
  UserIdParams,
} from './user.schemas';

export async function list(req: Request, res: Response): Promise<Response> {
  const { items, total, page, limit } = await userService.listUsers(getQuery<ListUsersQuery>(req));
  return sendPaginated(res, items, buildPaginationMeta(total, page, limit));
}

export async function create(req: Request, res: Response): Promise<Response> {
  const user = await userService.createUser(getBody<CreateUserInput>(req));
  return sendSuccess(res, { user }, { status: 201 });
}

export async function approve(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<UserIdParams>(req);
  return sendSuccess(res, { user: await userService.approveUser(id) });
}

export async function reject(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<UserIdParams>(req);
  return sendSuccess(res, { user: await userService.rejectUser(id) });
}

export async function updateStatus(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<UserIdParams>(req);
  const user = await userService.updateUserStatus(id, getBody<UpdateStatusInput>(req));
  return sendSuccess(res, { user });
}
