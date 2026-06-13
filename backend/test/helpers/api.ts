import request from 'supertest';
import type { Types } from 'mongoose';
import { createApp } from '../../src/app';
import { Role } from '../../src/common/types/index';
import { createUser } from './factories';

export const app = createApp();
export const API = '/api/v1';
export const auth = (u: { token: string }): Record<string, string> => ({
  Authorization: `Bearer ${u.token}`,
});

export interface Principal {
  token: string;
  id: string;
}

let seq = 0;
const rand = (): string => `${Date.now()}_${seq++}`;

export async function login(email: string, password: string): Promise<string> {
  const res = await request(app).post(`${API}/auth/login`).send({ email, password });
  return res.body.data.accessToken;
}

export async function makeEngineer(): Promise<Principal> {
  const email = `eng_${rand()}@example.com`;
  const user = await createUser({ role: Role.Engineer, email, password: 'Password123' });
  return { token: await login(email, 'Password123'), id: String(user._id) };
}

export async function makeEmployee(department: Types.ObjectId): Promise<Principal> {
  const email = `emp_${rand()}@example.com`;
  const user = await createUser({
    role: Role.Employee,
    email,
    password: 'Password123',
    department,
  });
  return { token: await login(email, 'Password123'), id: String(user._id) };
}

export async function newTicket(
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

/** Polls an async condition until it returns a truthy value (for event-driven side effects). */
export async function waitFor<T>(
  fn: () => Promise<T | null | undefined | false>,
  timeout = 3000,
  interval = 25,
): Promise<T> {
  const start = Date.now();
  for (;;) {
    const result = await fn();
    if (result) return result;
    if (Date.now() - start > timeout) throw new Error('waitFor: condition not met within timeout');
    await new Promise((res) => setTimeout(res, interval));
  }
}
