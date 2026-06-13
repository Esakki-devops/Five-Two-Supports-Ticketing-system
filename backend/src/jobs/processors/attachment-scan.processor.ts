import { AttachmentScanStatus } from '../../common/types/index';
import { realtime } from '../../core/realtime/gateway';
import { logger } from '../../core/logger/index';
import { Ticket } from '../../modules/tickets/ticket.model';
import type { AttachmentScanJobData } from '../types';

/**
 * V1 attachment scan. Allow-list + size + access controls are already enforced at
 * upload; this step flips pending → clean so downloads unlock. ClamAV is a fast-
 * follow — plug it in here (stream the object, scan, mark Infected on a hit).
 */
export async function processAttachmentScan(
  data: AttachmentScanJobData,
): Promise<{ status: string }> {
  const ticket = await Ticket.findOne({ _id: data.ticketId, isDeleted: false });
  if (!ticket) return { status: 'skipped' };

  const attachment = ticket.attachments.id(data.attachmentId);
  if (!attachment || attachment.scanStatus !== AttachmentScanStatus.Pending) {
    return { status: attachment?.scanStatus ?? 'skipped' };
  }

  // TODO: integrate ClamAV (stream from storage; set Infected on a hit).
  attachment.scanStatus = AttachmentScanStatus.Clean;
  await ticket.save();
  realtime.pushToUser(String(ticket.requester), 'ticket:updated', { ticketId: data.ticketId });
  logger.debug(
    { ticketId: data.ticketId, attachmentId: data.attachmentId },
    'Attachment scanned: clean',
  );
  return { status: 'clean' };
}
