import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { API, app, auth, makeEmployee, makeEngineer, newTicket, waitFor } from './helpers/api';
import { clearDb, setupTestDb, teardownTestDb } from './helpers/db';
import { createCategory, createDepartment } from './helpers/factories';

beforeAll(setupTestDb);
afterAll(teardownTestDb);
afterEach(clearDb);

describe('notifications (domain events → in-app records)', () => {
  it('notifies the requester when their ticket is resolved', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const eng = await makeEngineer();
    const id = await newTicket(emp, String(dept._id), String(cat._id));

    await request(app).patch(`${API}/tickets/${id}`).set(auth(eng)).send({ status: 'resolved' });

    const found = await waitFor(async () => {
      const res = await request(app).get(`${API}/notifications`).set(auth(emp));
      return (
        res.body.data.notifications.find((n: { type: string }) => n.type === 'resolution') ?? null
      );
    });
    expect(found.message).toMatch(/resolved/i);
  });

  it('marks notifications read and tracks the unread count', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const eng = await makeEngineer();
    const id = await newTicket(emp, String(dept._id), String(cat._id));

    await request(app).patch(`${API}/tickets/${id}`).set(auth(eng)).send({ status: 'resolved' });

    await waitFor(async () => {
      const res = await request(app).get(`${API}/notifications`).set(auth(emp));
      return res.body.data.unreadCount > 0 ? res.body : null;
    });

    const list = await request(app).get(`${API}/notifications`).set(auth(emp));
    const notifId: string = list.body.data.notifications[0].id;

    expect(
      (await request(app).patch(`${API}/notifications/${notifId}/read`).set(auth(emp))).status,
    ).toBe(200);
    expect((await request(app).patch(`${API}/notifications/read-all`).set(auth(emp))).status).toBe(
      200,
    );

    const after = await request(app).get(`${API}/notifications`).set(auth(emp));
    expect(after.body.data.unreadCount).toBe(0);
  });

  it('notifies engineers when a new user registers', async () => {
    const eng = await makeEngineer();
    const dept = await createDepartment();

    await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'New Person',
        email: `np_${Date.now()}@example.com`,
        password: 'Password123',
        department: String(dept._id),
      });

    const found = await waitFor(async () => {
      const res = await request(app).get(`${API}/notifications`).set(auth(eng));
      return (
        res.body.data.notifications.find((n: { type: string }) => n.type === 'registration') ?? null
      );
    });
    expect(found.message).toMatch(/awaiting approval/i);
  });
});
