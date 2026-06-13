import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { clearDb, setupTestDb, teardownTestDb } from './helpers/db';
import { createCategory, createDepartment, createUser } from './helpers/factories';
import { Role, TicketStatus } from '../src/common/types/index';
import { Ticket } from '../src/modules/tickets/ticket.model';
import { Notification } from '../src/modules/notifications/notification.model';
import { nextTicketNumber } from '../src/modules/tickets/counter.model';
import {
  processAutoClose,
  processResolutionReminder,
} from '../src/jobs/processors/ticket-lifecycle.processor';
import { processEmail } from '../src/jobs/processors/email.processor';
import { getMailProvider } from '../src/integrations/mail/index';
import { NoopMailProvider } from '../src/integrations/mail/noop-provider';

beforeAll(setupTestDb);
afterAll(teardownTestDb);
afterEach(clearDb);

let n = 0;
async function resolvedTicket() {
  const dept = await createDepartment(`Dept ${n++}`);
  const cat = await createCategory(`Cat ${n++}`);
  const emp = await createUser({
    role: Role.Employee,
    email: `emp${n++}@x.com`,
    department: dept._id,
  });
  const eng = await createUser({ role: Role.Engineer, email: `eng${n++}@x.com` });
  const ticket = await Ticket.create({
    ticketNumber: await nextTicketNumber(),
    title: 'T',
    description: 'd',
    createdBy: emp._id,
    requester: emp._id,
    assignee: eng._id,
    department: dept._id,
    category: cat._id,
    status: TicketStatus.Resolved,
    resolvedAt: new Date(Date.now() - 7 * 86_400_000),
  });
  return { ticket, empId: String(emp._id) };
}

describe('lifecycle job processors', () => {
  it('auto-closes a stale resolved ticket and notifies the requester', async () => {
    const { ticket, empId } = await resolvedTicket();
    const result = await processAutoClose(String(ticket._id));
    expect(result.closed).toBe(true);

    const reloaded = await Ticket.findById(ticket._id);
    expect(reloaded?.status).toBe(TicketStatus.Closed);
    expect(reloaded?.closedAt).toBeTruthy();
    expect(await Notification.findOne({ recipient: empId, type: 'closure' })).toBeTruthy();
  });

  it('does not auto-close a ticket that left "resolved" (status re-check guard)', async () => {
    const { ticket } = await resolvedTicket();
    ticket.status = TicketStatus.Reopened;
    await ticket.save();

    const result = await processAutoClose(String(ticket._id));
    expect(result.closed).toBe(false);
    expect((await Ticket.findById(ticket._id))?.status).toBe(TicketStatus.Reopened);
  });

  it('sends a reminder while the ticket is still resolved', async () => {
    const { ticket, empId } = await resolvedTicket();
    const result = await processResolutionReminder(String(ticket._id));
    expect(result.reminded).toBe(true);
    expect(await Notification.findOne({ recipient: empId, type: 'reminder' })).toBeTruthy();
  });
});

describe('email processor', () => {
  it('resolves the recipient by id and hands off to the mail provider', async () => {
    const provider = await getMailProvider();
    expect(provider).toBeInstanceOf(NoopMailProvider);
    const noop = provider as NoopMailProvider;
    noop.sent.length = 0;

    const user = await createUser({ role: Role.Engineer, email: 'mailbox@x.com' });
    await processEmail({
      recipientId: String(user._id),
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
    });

    expect(noop.sent.at(-1)?.to).toBe('mailbox@x.com');
  });
});
