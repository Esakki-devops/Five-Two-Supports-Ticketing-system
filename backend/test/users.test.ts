import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { Role, UserStatus } from '../src/common/types/index';
import { clearDb, setupTestDb, teardownTestDb } from './helpers/db';
import { createDepartment, createUser } from './helpers/factories';

const app = createApp();
const API = '/api/v1';

beforeAll(setupTestDb);
afterAll(teardownTestDb);
afterEach(clearDb);

async function engineerToken(): Promise<string> {
  await createUser({ role: Role.Engineer, email: 'admin@example.com', password: 'AdminPass123' });
  const login = await request(app)
    .post(`${API}/auth/login`)
    .send({ email: 'admin@example.com', password: 'AdminPass123' });
  return login.body.data.accessToken;
}

describe('user administration (engineer-only)', () => {
  let token: string;
  beforeEach(async () => {
    token = await engineerToken();
  });

  it('lists users with pagination meta', async () => {
    const res = await request(app)
      .get(`${API}/users?limit=10`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.pagination).toMatchObject({ page: 1, limit: 10 });
  });

  it('admin-creates an active engineer account', async () => {
    const res = await request(app)
      .post(`${API}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'New Eng',
        email: 'neweng@example.com',
        password: 'Password123',
        role: 'engineer',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.user.status).toBe(UserStatus.Active);
    expect(res.body.data.user.role).toBe(Role.Engineer);
  });

  it('rejects a pending registration', async () => {
    const dept = await createDepartment();
    const reg = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Pending Pat',
        email: 'pat@example.com',
        password: 'Password123',
        department: String(dept._id),
      });
    const id: string = reg.body.data.user.id;

    const res = await request(app)
      .patch(`${API}/users/${id}/reject`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.status).toBe(UserStatus.Rejected);
  });

  it('filters by status', async () => {
    const dept = await createDepartment();
    await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Pendy',
        email: 'pendy@example.com',
        password: 'Password123',
        department: String(dept._id),
      });

    const res = await request(app)
      .get(`${API}/users?status=pending`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((u: { status: string }) => u.status === 'pending')).toBe(true);
  });
});
