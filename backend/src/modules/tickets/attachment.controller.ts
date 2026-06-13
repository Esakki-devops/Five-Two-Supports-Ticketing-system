import type { Request, Response } from 'express';
import { sendSuccess } from '../../core/http/envelope';
import { getParams } from '../../core/middleware/validate';
import * as attachmentService from './attachment.service';
import type { AttachmentParams, TicketIdParams } from './ticket.schemas';

export async function upload(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<TicketIdParams>(req);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const ticket = await attachmentService.uploadAttachments(
    req.auth!,
    id,
    files.map((f) => ({ originalname: f.originalname, buffer: f.buffer, size: f.size })),
  );
  return sendSuccess(res, { ticket }, { status: 201 });
}

export async function download(req: Request, res: Response): Promise<void> {
  const { id, attId } = getParams<AttachmentParams>(req);
  const { stream, mimeType, fileName } = await attachmentService.getAttachmentForDownload(
    req.auth!,
    id,
    attId,
  );
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  stream.on('error', () => {
    if (!res.headersSent) res.status(500);
    res.end();
  });
  stream.pipe(res);
}
