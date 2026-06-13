export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Pluggable mail transport. SES is the default implementation; swap freely. */
export interface MailProvider {
  readonly name: string;
  send(input: SendEmailInput): Promise<void>;
}
