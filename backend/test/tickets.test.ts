import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Types } from 'mongoose';
import { createApp } from '../src/app';
import { Role } from '../src/common/types/index';
import { clearDb, setupTestDb, teardownTestDb } from './helpers/db';
import { createCategory, createDepartment, createUser } from './helpers/factories';

const app = createApp();
const API = '/api/v1';

beforeAll(setupTestDb);
afterAll(teardownTestDb);
afterEach(clearDb);

let seq = 0;
const rand = (): string => `${Date.now()}_${seq++}`;
const auth = (u: { token: string }) => ({ Authorization: `Bearer ${u.token}` });

interface Principal {
  token: string;
  id: string;
}

async function login(email: string, password: string): Promise<string> {
  const res = await request(app).post(`${API}/auth/login`).send({ email, password });
  return res.body.data.accessToken;
}

async function makeEngineer(): Promise<Principal> {
  const email = `eng_${rand()}@example.com`;
  const user = await createUser({ role: Role.Engineer, email, password: 'Password123' });
  return { token: await login(email, 'Password123'), id: String(user._id) };
}

async function makeEmployee(department: Types.ObjectId): Promise<Principal> {
  const email = `emp_${rand()}@example.com`;
  const user = await createUser({
    role: Role.Employee,
    email,
    password: 'Password123',
    department,
  });
  return { token: await login(email, 'Password123'), id: String(user._id) };
}

async function newTicket(
  actor: Principal,
  deptId: string,
  catId: string,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const res = await request(app)
    .post(`${API}/tickets`)
    .set(auth(actor))
    .send({
      title: 'Issue',
      description: 'Details',
      department: deptId,
      category: catId,
      ...extra,
    });
  return res.body.data.ticket.id;
}

describe('tickets: creation & scoping', () => {
  it('lets an employee create a ticket for self with a TKT number', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);

    const res = await request(app)
      .post(`${API}/tickets`)
      .set(auth(emp))
      .send({
        title: 'Printer broken',
        description: 'No power',
        department: String(dept._id),
        category: String(cat._id),
        priority: 'high',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.ticket.ticketNumber).toMatch(/^TKT-\d{6}$/);
    expect(res.body.data.ticket.status).toBe('new');
    expect(res.body.data.ticket.priority).toBe('high');
  });

  it("hides other employees' and internal tickets from an employee", async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp1 = await makeEmployee(dept._id);
    const emp2 = await makeEmployee(dept._id);
    const eng = await makeEngineer();

    const ownId = await newTicket(emp1, String(dept._id), String(cat._id));
    const internalId = await newTicket(eng, String(dept._id), String(cat._id), {
      isInternal: true,
    });

    // Another employee cannot read it
    expect((await request(app).get(`${API}/tickets/${ownId}`).set(auth(emp2))).status).toBe(404);
    // Employee cannot read an internal ticket
    expect((await request(app).get(`${API}/tickets/${internalId}`).set(auth(emp1))).status).toBe(
      404,
    );

    const empList = await request(app).get(`${API}/tickets`).set(auth(emp1));
    expect(empList.body.data.every((t: { isInternal: boolean }) => !t.isInternal)).toBe(true);
    expect(empList.body.meta.pagination.total).toBe(1);

    const engList = await request(app).get(`${API}/tickets`).set(auth(eng));
    expect(engList.body.meta.pagination.total).toBeGreaterThanOrEqual(2);
  });

  it('lets an engineer raise a ticket on behalf of an employee', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const eng = await makeEngineer();

    const res = await request(app)
      .post(`${API}/tickets`)
      .set(auth(eng))
      .send({
        title: 'On behalf',
        description: 'x',
        department: String(dept._id),
        category: String(cat._id),
        requester: emp.id,
      });
    expect(res.status).toBe(201);
    const requesterId = res.body.data.ticket.requester.id ?? res.body.data.ticket.requester;
    expect(requesterId).toBe(emp.id);
    // and the employee can now see it
    const empView = await request(app)
      .get(`${API}/tickets/${res.body.data.ticket.id}`)
      .set(auth(emp));
    expect(empView.status).toBe(200);
  });
});

describe('tickets: lifecycle & permissions', () => {
  it('drives valid transitions and rejects invalid jumps', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const eng = await makeEngineer();
    const id = await newTicket(emp, String(dept._id), String(cat._id));

    const invalid = await request(app)
      .patch(`${API}/tickets/${id}`)
      .set(auth(eng))
      .send({ status: 'reopened' }); // new -> reopened is invalid
    expect(invalid.status).toBe(400);

    await request(app).patch(`${API}/tickets/${id}`).set(auth(eng)).send({ status: 'open' });
    await request(app).patch(`${API}/tickets/${id}`).set(auth(eng)).send({ status: 'in_progress' });
    const resolved = await request(app)
      .patch(`${API}/tickets/${id}`)
      .set(auth(eng))
      .send({ status: 'resolved' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.ticket.resolvedAt).toBeTruthy();

    // employee confirms resolution -> closed
    const confirm = await request(app)
      .patch(`${API}/tickets/${id}`)
      .set(auth(emp))
      .send({ status: 'closed' });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.ticket.status).toBe('closed');
  });

  it('prevents employees from changing priority or making arbitrary transitions', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const id = await newTicket(emp, String(dept._id), String(cat._id));

    expect(
      (await request(app).patch(`${API}/tickets/${id}`).set(auth(emp)).send({ priority: 'urgent' }))
        .status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch(`${API}/tickets/${id}`)
          .set(auth(emp))
          .send({ status: 'in_progress' })
      ).status,
    ).toBe(403);
  });

  it('assigns only to active engineers', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const eng = await makeEngineer();
    const id = await newTicket(eng, String(dept._id), String(cat._id));

    const toEmployee = await request(app)
      .patch(`${API}/tickets/${id}/assign`)
      .set(auth(eng))
      .send({ assignee: emp.id });
    expect(toEmployee.status).toBe(400);

    const toEngineer = await request(app)
      .patch(`${API}/tickets/${id}/assign`)
      .set(auth(eng))
      .send({ assignee: eng.id });
    expect(toEngineer.status).toBe(200);
    expect(toEngineer.body.data.ticket.assignee).toBeTruthy();
  });
});

describe('tickets: comments, projection & soft delete', () => {
  it('adds comments and keeps heavy arrays out of list responses', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const id = await newTicket(emp, String(dept._id), String(cat._id));

    const comment = await request(app)
      .post(`${API}/tickets/${id}/comments`)
      .set(auth(emp))
      .send({ body: 'Any update?' });
    expect(comment.status).toBe(201);
    expect(comment.body.data.ticket.comments).toHaveLength(1);

    const list = await request(app).get(`${API}/tickets`).set(auth(emp));
    expect(list.body.data[0].comments).toBeUndefined();
    expect(list.body.data[0].activity).toBeUndefined();
  });

  it('soft-deletes (engineer only) and hides the ticket afterward', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const eng = await makeEngineer();
    const id = await newTicket(emp, String(dept._id), String(cat._id));

    expect((await request(app).delete(`${API}/tickets/${id}`).set(auth(emp))).status).toBe(403);

    const del = await request(app).delete(`${API}/tickets/${id}`).set(auth(eng));
    expect(del.status).toBe(200);
    expect((await request(app).get(`${API}/tickets/${id}`).set(auth(eng))).status).toBe(404);
  });
});
