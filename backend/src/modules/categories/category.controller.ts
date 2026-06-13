import type { Request, Response } from 'express';
import { sendSuccess } from '../../core/http/envelope';
import { getBody, getParams, getQuery } from '../../core/middleware/validate';
import * as service from './category.service';
import type {
  CategoryIdParams,
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from './category.schemas';

export async function list(req: Request, res: Response): Promise<Response> {
  const { includeInactive, department } = getQuery<ListCategoriesQuery>(req);
  const categories = await service.listCategories({ includeInactive, department });
  return sendSuccess(res, { categories });
}

export async function create(req: Request, res: Response): Promise<Response> {
  const category = await service.createCategory(getBody<CreateCategoryInput>(req));
  return sendSuccess(res, { category }, { status: 201 });
}

export async function update(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<CategoryIdParams>(req);
  const category = await service.updateCategory(id, getBody<UpdateCategoryInput>(req));
  return sendSuccess(res, { category });
}
