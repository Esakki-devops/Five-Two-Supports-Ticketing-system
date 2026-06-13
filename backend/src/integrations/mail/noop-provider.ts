import { logger } from '../../core/logger/index';
import type { MailProvider, SendEmailInput } from './provider';

/**
 * Development/test transport: records and logs emails instead of sending them.
 * Used whenever MAIL_PROVIDER is not 'ses'.
 */
export class NoopMailProvider implements MailProvider {
  readonly name = 'noop';
  readonly sent: SendEmailInput[] = [];

  async send(input: SendEmailInput): Promise<void> {
    this.sent.push(input);
    logger.info(
      { to: input.to, subject: input.subject },
      '[mail:noop] email captured (not sent — no provider configured)',
    );
  }
}
