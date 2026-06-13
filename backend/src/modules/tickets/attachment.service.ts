import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { Types } from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from '../../core/errors/AppError';
import type { AuthContext } from '../../core/middleware/auth-context';
import { AttachmentScanStatus } from '../../common/types/index';
import { getStorage } from '../../integrations/storage/index';
import { getExtension, validateFileContent } from '../../integrations/storage/file-validation';
import { enqueueAttachmentScan, isQueueReady } from '../../jobs/queues';
import { Ticket } from './ticket.model';
import { assertCanView, populateTicket } from './ticket.service';

type Serialized = Record<string, unknown>;
const serialize = (doc: { toJSON: () => unknown }): Serialized => doc.toJSON() as Serialized;

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
}

export async function uploadAttachments(
  actor: AuthContext,
  ticketId: string,
  files: UploadedFile[],
): Promise<Serialized> {
  if (files.length === 0) throw new BadRequestError('No files were uploaded.');

  const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: false });
  if (!ticket) throw new NotFoundError('Ticket not found.');
  assertCanView(actor, ticket);

  const storage = await getStorage();
  const queueReady = isQueueReady();

  for (const file of files) {
    const validation = await validateFileContent(file.originalname, file.buffer);
    if (!validation.ok) throw new BadRequestError(validation.reason ?? 'Invalid file.');

    const ext = getExtension(file.originalname);
    const storageKey = `tickets/${ticketId}/${randomUUID()}${ext ? `.${ext}` : ''}`;
    await storage.put(storageKey, file.buffer, validation.mime);

    ticket.attachments.push({
      fileName: file.originalname,
      mimeType: validation.mime,
      size: file.size,
      storageKey,
      // No worker/Redis means no scanner is running — don't block downloads in that case.
      scanStatus: queueReady ? AttachmentScanStatus.Pending : AttachmentScanStatus.Clean,
      uploadedBy: new Types.ObjectId(actor.userId),
      uploadedAt: new Date(),
    });
  }

  await ticket.save();

  if (queueReady) {
    for (const attachment of ticket.attachments.slice(-files.length)) {
      enqueueAttachmentScan({ ticketId, attachmentId: String(attachment._id) });
    }
  }

  return serialize(await populateTicket(ticket));
}

export async function getAttachmentForDownload(
  actor: AuthContext,
  ticketId: string,
  attachmentId: string,
): Promise<{ stream: Readable; mimeType: string; fileName: string }> {
  const ticket = await Ticket.findOne({ _id: ticketId, isDeleted: false });
  if (!ticket) throw new NotFoundError('Ticket not found.');
  assertCanView(actor, ticket);

  const attachment = ticket.attachments.id(attachmentId);
  if (!attachment) throw new NotFoundError('Attachment not found.');
  if (attachment.scanStatus !== AttachmentScanStatus.Clean) {
    throw new ConflictError('This attachment is still being scanned. Please try again shortly.');
  }

  const storage = await getStorage();
  const stream = await storage.getStream(attachment.storageKey);
  return { stream, mimeType: attachment.mimeType, fileName: attachment.fileName };
}
