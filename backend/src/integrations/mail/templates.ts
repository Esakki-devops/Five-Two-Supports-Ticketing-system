import { config } from '../../core/config/index';
import type { NotificationType } from '../../common/types/index';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const SUBJECTS: Record<string, string> = {
  assignment: 'A ticket has been assigned to you',
  status_change: 'Your ticket status has changed',
  resolution: 'Your ticket has been resolved',
  closure: 'Your ticket has been closed',
  comment: 'New comment on your ticket',
  registration: 'New registration awaiting approval',
  approval: 'Your account has been approved',
  rejection: 'Update on your registration',
  reminder: 'Action needed: confirm your resolved ticket',
  password_reset: 'Reset your password',
};

function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

function layout(title: string, body: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<p style="margin:24px 0"><a href="${cta.url}" style="background:#1f6feb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">${cta.label}</a></p>`
    : '';
  return [
    '<!doctype html><html><body style="margin:0;background:#f5f6f8;padding:24px">',
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">',
    `<h2 style="margin:0 0 12px">${escapeHtml(title)}</h2>`,
    `<p style="font-size:15px;line-height:1.5;color:#333">${body}</p>`,
    button,
    '<hr style="border:none;border-top:1px solid #eee;margin:24px 0">',
    '<small style="color:#888">Five Two Supports — Internal Ticketing</small>',
    '</div></body></html>',
  ].join('');
}

export function renderNotificationEmail(input: {
  type: NotificationType;
  message: string;
  ticketId?: string | null;
}): RenderedEmail {
  const subject = SUBJECTS[input.type] ?? 'Notification from Five Two Supports';
  const cta = input.ticketId
    ? { label: 'View ticket', url: `${config.mail.webUrl}/tickets/${input.ticketId}` }
    : undefined;
  return {
    subject,
    html: layout(subject, escapeHtml(input.message), cta),
    text: `${input.message}${cta ? `\n\n${cta.label}: ${cta.url}` : ''}`,
  };
}

export function renderPasswordResetEmail(input: { resetToken: string }): RenderedEmail {
  const url = `${config.mail.webUrl}/reset-password?token=${encodeURIComponent(input.resetToken)}`;
  const subject = SUBJECTS.password_reset ?? 'Reset your password';
  const body =
    'We received a request to reset your password. This link expires shortly. If you did not request this, you can safely ignore this email.';
  return {
    subject,
    html: layout(subject, body, { label: 'Reset password', url }),
    text: `${body}\n\nReset password: ${url}`,
  };
}
