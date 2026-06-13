import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
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

describe('auth: registration & approval', () => {
  it('registers an employee as pending and blocks login until approved', async () => {
    const dept = await createDepartment();

    const reg = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'Password123',
        department: String(dept._id),
      });
    expect(reg.status).toBe(201);
    expect(reg.body.data.user.status).toBe(UserStatus.Pending);
    expect(reg.body.data.user.passwordHash).toBeUndefined();

    const login = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'alice@example.com', password: 'Password123' });
    expect(login.status).toBe(403); // awaiting approval
  });

  it('rejects duplicate email and missing department', async () => {
    const dept = await createDepartment();
    await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Carl',
        email: 'carl@example.com',
        password: 'Password123',
        department: String(dept._id),
      });

    const dup = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Carl Two',
        email: 'carl@example.com',
        password: 'Password123',
        department: String(dept._id),
      });
    expect(dup.status).toBe(409);

    const missingDept = await request(app)
      .post(`${API}/auth/register`)
      .send({ name: 'Dora', email: 'dora@example.com', password: 'Password123' });
    expect(missingDept.status).toBe(422);
  });

  it('runs the full approve → login → me → refresh flow', async () => {
    const dept = await createDepartment();
    await createUser({ role: Role.Engineer, email: 'eng@example.com', password: 'EngPass123' });

    const reg = await request(app)
      .post(`${API}/auth/register`)
      .send({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'Password123',
        department: String(dept._id),
      });
    const employeeId: string = reg.body.data.user.id;

    const engLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'eng@example.com', password: 'EngPass123' });
    expect(engLogin.status).toBe(200);
    const engToken: string = engLogin.body.data.accessToken;

    const approve = await request(app)
      .patch(`${API}/users/${employeeId}/approve`)
      .set('Authorization', `Bearer ${engToken}`);
    expect(approve.status).toBe(200);
    expect(approve.body.data.user.status).toBe(UserStatus.Active);

    const agent = request.agent(app);
    const empLogin = await agent
      .post(`${API}/auth/login`)
      .send({ email: 'bob@example.com', password: 'Password123' });
    expect(empLogin.status).toBe(200);
    expect(empLogin.headers['set-cookie']).toBeDefined();
    const empToken: string = empLogin.body.data.accessToken;

    const me = await agent.get(`${API}/auth/me`).set('Authorization', `Bearer ${empToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('bob@example.com');

    const refresh = await agent.post(`${API}/auth/refresh`); // refresh cookie sent by the jar
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.accessToken).toBeTruthy();
  });
});

describe('auth: authorization scoping', () => {
  it('forbids employees from the admin /users surface', async () => {
    const dept = await createDepartment();
    await createUser({
      role: Role.Employee,
      email: 'emp@example.com',
      password: 'EmpPass123',
      department: dept._id,
    });

    const login = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'emp@example.com', password: 'EmpPass123' });
    const token: string = login.body.data.accessToken;

    const res = await request(app).get(`${API}/users`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('requires authentication for protected routes', async () => {
    const res = await request(app).get(`${API}/auth/me`);
    expect(res.status).toBe(401);
  });
});

describe('auth: password reset', () => {
  it('resets the password and allows login with the new one', async () => {
    const dept = await createDepartment();
    await createUser({
      role: Role.Employee,
      email: 'reset@example.com',
      password: 'OldPass123',
      department: dept._id,
    });

    const forgot = await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({ email: 'reset@example.com' });
    expect(forgot.status).toBe(200);
    const token: string = forgot.body.data.resetToken; // exposed only outside production
    expect(token).toBeTruthy();

    const reset = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token, password: 'NewPass456' });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'reset@example.com', password: 'OldPass123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'reset@example.com', password: 'NewPass456' });
    expect(newLogin.status).toBe(200);
  });
});
