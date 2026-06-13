import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { API, app, auth, makeEmployee, makeEngineer, newTicket } from './helpers/api';
import { clearDb, setupTestDb, teardownTestDb } from './helpers/db';
import { createCategory, createDepartment } from './helpers/factories';

beforeAll(setupTestDb);
afterAll(teardownTestDb);
afterEach(clearDb);

describe('dashboard summary', () => {
  it('returns org-wide metrics for an engineer', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const eng = await makeEngineer();

    const t1 = await newTicket(emp, String(dept._id), String(cat._id));
    await newTicket(emp, String(dept._id), String(cat._id));
    await newTicket(emp, String(dept._id), String(cat._id));
    await request(app).patch(`${API}/tickets/${t1}`).set(auth(eng)).send({ status: 'resolved' });

    const res = await request(app).get(`${API}/dashboard/summary`).set(auth(eng));
    expect(res.status).toBe(200);
    expect(res.body.data.totals.total).toBe(3);
    expect(res.body.data.byStatus.new).toBe(2);
    expect(res.body.data.byStatus.resolved).toBe(1);
    expect(res.body.data.totals.unassigned).toBeGreaterThanOrEqual(2);
    expect(res.body.data.mttrHours).not.toBeNull();
    expect(res.body.data.byDepartment.length).toBeGreaterThanOrEqual(1);
  });

  it('scopes metrics to the requesting employee', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp1 = await makeEmployee(dept._id);
    const emp2 = await makeEmployee(dept._id);
    await newTicket(emp1, String(dept._id), String(cat._id));
    await newTicket(emp2, String(dept._id), String(cat._id));

    const res = await request(app).get(`${API}/dashboard/summary`).set(auth(emp1));
    expect(res.body.data.totals.total).toBe(1);
    expect(res.body.data.totals.unassigned).toBeUndefined(); // engineer-only field
  });
});
