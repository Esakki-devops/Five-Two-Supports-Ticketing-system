import { config } from '../../core/config/index';
import type { MailProvider, SendEmailInput } from './provider';
import { NoopMailProvider } from './noop-provider';

let providerPromise: Promise<MailProvider> | undefined;

/**
 * Lazily resolves the configured mail provider. SES is dynamically imported only
 * when selected, so the AWS SDK never loads in dev/test (NoopMailProvider).
 */
export function getMailProvider(): Promise<MailProvider> {
  if (!providerPromise) {
    providerPromise = (async (): Promise<MailProvider> => {
      if (config.mail.provider === 'ses') {
        const { SesMailProvider } = await import('./ses-provider');
        return new SesMailProvider();
      }
      return new NoopMailProvider();
    })();
  }
  return providerPromise;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const provider = await getMailProvider();
  await provider.send(input);
}

export type { MailProvider, SendEmailInput } from './provider';
