import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { API, app, auth, makeEmployee, newTicket } from './helpers/api';
import { clearDb, setupTestDb, teardownTestDb } from './helpers/db';
import { createCategory, createDepartment } from './helpers/factories';
import { Ticket } from '../src/modules/tickets/ticket.model';
import { processAttachmentScan } from '../src/jobs/processors/attachment-scan.processor';

// A valid 1x1 PNG (so the magic-byte sniff detects image/png).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

beforeAll(setupTestDb);
afterAll(teardownTestDb);
afterEach(clearDb);

describe('attachments', () => {
  it('uploads a valid file, gates download until scanned, then streams it', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const ticketId = await newTicket(emp, String(dept._id), String(cat._id));

    const upload = await request(app)
      .post(`${API}/tickets/${ticketId}/attachments`)
      .set(auth(emp))
      .attach('files', PNG, 'photo.png');
    expect(upload.status).toBe(201);
    const attachments = upload.body.data.ticket.attachments;
    expect(attachments).toHaveLength(1);
    expect(attachments[0].mimeType).toBe('image/png');
    const attId: string = attachments[0]._id ?? attachments[0].id;

    // Force the scan-pending state to verify the gate.
    await Ticket.updateOne(
      { _id: ticketId, 'attachments._id': attId },
      { $set: { 'attachments.$.scanStatus': 'pending' } },
    );

    const blocked = await request(app)
      .get(`${API}/tickets/${ticketId}/attachments/${attId}`)
      .set(auth(emp));
    expect(blocked.status).toBe(409); // still being scanned

    const scan = await processAttachmentScan({ ticketId, attachmentId: attId });
    expect(scan.status).toBe('clean');

    const download = await request(app)
      .get(`${API}/tickets/${ticketId}/attachments/${attId}`)
      .set(auth(emp));
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('image/png');
    expect(download.headers['content-disposition']).toContain('photo.png');
  });

  it('rejects a disallowed file type', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const ticketId = await newTicket(emp, String(dept._id), String(cat._id));

    const res = await request(app)
      .post(`${API}/tickets/${ticketId}/attachments`)
      .set(auth(emp))
      .attach('files', Buffer.from('MZ fake executable'), 'malware.exe');
    expect(res.status).toBe(400);
  });

  it('does not let an employee upload to a ticket they cannot see', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const owner = await makeEmployee(dept._id);
    const other = await makeEmployee(dept._id);
    const ticketId = await newTicket(owner, String(dept._id), String(cat._id));

    const res = await request(app)
      .post(`${API}/tickets/${ticketId}/attachments`)
      .set(auth(other))
      .attach('files', PNG, 'photo.png');
    expect(res.status).toBe(404);
  });
});
