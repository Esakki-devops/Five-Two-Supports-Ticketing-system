import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { Role } from '../src/common/types/index';
import { clearDb, setupTestDb, teardownTestDb } from './helpers/db';
import { createDepartment, createUser } from './helpers/factories';

const app = createApp();
const API = '/api/v1';

beforeAll(setupTestDb);
afterAll(teardownTestDb);
afterEach(clearDb);

let seq = 0;
const rand = (): string => `${Date.now()}_${seq++}`;

async function engineerToken(): Promise<string> {
  const email = `eng_${rand()}@example.com`;
  await createUser({ role: Role.Engineer, email, password: 'Password123' });
  const login = await request(app)
    .post(`${API}/auth/login`)
    .send({ email, password: 'Password123' });
  return login.body.data.accessToken;
}

async function employeeToken(): Promise<string> {
  const dept = await createDepartment(`Dept ${rand()}`);
  const email = `emp_${rand()}@example.com`;
  await createUser({ role: Role.Employee, email, password: 'Password123', department: dept._id });
  const login = await request(app)
    .post(`${API}/auth/login`)
    .send({ email, password: 'Password123' });
  return login.body.data.accessToken;
}

describe('departments', () => {
  it('lists only active departments publicly', async () => {
    await createDepartment('Procurement');
    const old = await createDepartment('Old Dept');
    old.isActive = false;
    await old.save();

    const res = await request(app).get(`${API}/departments`);
    expect(res.status).toBe(200);
    const names = res.body.data.departments.map((d: { name: string }) => d.name);
    expect(names).toContain('Procurement');
    expect(names).not.toContain('Old Dept');
  });

  it('lets an engineer create a department and enforces normalized uniqueness', async () => {
    const token = await engineerToken();

    const create = await request(app)
      .post(`${API}/departments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'IT' });
    expect(create.status).toBe(201);

    const dup = await request(app)
      .post(`${API}/departments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '  it ' }); // same after normalization
    expect(dup.status).toBe(409);
  });

  it('blocks unauthenticated and non-engineer writes', async () => {
    const unauth = await request(app).post(`${API}/departments`).send({ name: 'Nope' });
    expect(unauth.status).toBe(401);

    const empToken = await employeeToken();
    const forbidden = await request(app)
      .post(`${API}/departments`)
      .set('Authorization', `Bearer ${empToken}`)
      .send({ name: 'Nope' });
    expect(forbidden.status).toBe(403);
  });

  it('renames and deactivates a department', async () => {
    const token = await engineerToken();
    const dept = await createDepartment('Renameable');

    const patch = await request(app)
      .patch(`${API}/departments/${String(dept._id)}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed', isActive: false });
    expect(patch.status).toBe(200);
    expect(patch.body.data.department.name).toBe('Renamed');
    expect(patch.body.data.department.isActive).toBe(false);

    const activeList = await request(app).get(`${API}/departments`);
    expect(activeList.body.data.departments.map((d: { name: string }) => d.name)).not.toContain(
      'Renamed',
    );

    const allList = await request(app).get(`${API}/departments?includeInactive=true`);
    expect(allList.body.data.departments.map((d: { name: string }) => d.name)).toContain('Renamed');
  });
});

describe('categories', () => {
  it('creates categories and validates department references', async () => {
    const token = await engineerToken();

    const created = await request(app)
      .post(`${API}/categories`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hardware Issue' });
    expect(created.status).toBe(201);

    const badDept = await request(app)
      .post(`${API}/categories`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Scoped', department: '000000000000000000000000' }); // valid format, missing
    expect(badDept.status).toBe(400);

    const list = await request(app).get(`${API}/categories`);
    expect(list.body.data.categories.map((c: { name: string }) => c.name)).toContain(
      'Hardware Issue',
    );
  });

  it('scopes a category to a department', async () => {
    const token = await engineerToken();
    const dept = await createDepartment('Engineering');

    const res = await request(app)
      .post(`${API}/categories`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'CAD Support', department: String(dept._id) });
    expect(res.status).toBe(201);
    expect(res.body.data.category.department).toBeTruthy();
  });
});
