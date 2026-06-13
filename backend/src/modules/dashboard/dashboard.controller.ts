import type { Request, Response } from 'express';
import { sendSuccess } from '../../core/http/envelope';
import { getSummary } from './dashboard.service';

export async function summary(req: Request, res: Response): Promise<Response> {
  return sendSuccess(res, await getSummary(req.auth!));
}
