import { logger } from '../../core/logger/index';
import { sendEmail } from '../../integrations/mail/index';
import { User } from '../../modules/users/user.model';
import type { EmailJobData } from '../types';

/** Resolve the recipient (by id if needed) and hand off to the mail provider. */
export async function processEmail(data: EmailJobData): Promise<void> {
  let to = data.to;
  if (!to && data.recipientId) {
    const user = await User.findById(data.recipientId).select('email');
    to = user?.email;
  }
  if (!to) {
    logger.warn({ subject: data.subject }, 'Email job has no resolvable recipient; skipping');
    return;
  }
  await sendEmail({ to, subject: data.subject, html: data.html, text: data.text });
}
