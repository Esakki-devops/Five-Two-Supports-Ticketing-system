import type { Request, Response } from 'express';
import { getQuery } from '../../core/middleware/validate';
import * as exportService from './export.service';
import type { ExportQuery } from './export.schemas';

export async function exportTickets(req: Request, res: Response): Promise<void> {
  const { format } = getQuery<ExportQuery>(req);
  if (format === 'xlsx') {
    await exportService.streamXlsx(res);
  } else {
    await exportService.streamCsv(res);
  }
}
