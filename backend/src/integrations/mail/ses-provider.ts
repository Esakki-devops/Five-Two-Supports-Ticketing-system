import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { config } from '../../core/config/index';
import type { MailProvider, SendEmailInput } from './provider';

/** Amazon SES transport (S3-style credential resolution; keys optional → default chain). */
export class SesMailProvider implements MailProvider {
  readonly name = 'ses';
  private readonly client: SESv2Client;

  constructor() {
    const { region, accessKeyId, secretAccessKey } = config.mail.aws;
    this.client = new SESv2Client({
      ...(region ? { region } : {}),
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: config.mail.from,
        Destination: { ToAddresses: [input.to] },
        Content: {
          Simple: {
            Subject: { Data: input.subject },
            Body: { Html: { Data: input.html }, Text: { Data: input.text } },
          },
        },
      }),
    );
  }
}
