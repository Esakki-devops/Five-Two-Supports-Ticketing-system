export const QueueName = {
  Email: 'email',
  TicketReminder: 'ticketReminder',
  TicketAutoClose: 'ticketAutoClose',
  AttachmentScan: 'attachmentScan',
} as const;
export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export interface EmailJobData {
  /** Explicit recipient address, or … */
  to?: string;
  /** … a user id whose email is resolved by the worker. */
  recipientId?: string;
  subject: string;
  html: string;
  text: string;
}

export interface TicketJobData {
  ticketId: string;
}

export interface AttachmentScanJobData {
  ticketId: string;
  attachmentId: string;
}
