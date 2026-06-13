import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { API, app, auth, makeEmployee, makeEngineer, newTicket } from './helpers/api';
import { clearDb, setupTestDb, teardownTestDb } from './helpers/db';
import { createCategory, createDepartment } from './helpers/factories';

beforeAll(setupTestDb);
afterAll(teardownTestDb);
afterEach(clearDb);

describe('export & docs', () => {
  it('streams a CSV export for an engineer', async () => {
    const dept = await createDepartment();
    const cat = await createCategory();
    const emp = await makeEmployee(dept._id);
    const eng = await makeEngineer();
    await newTicket(emp, String(dept._id), String(cat._id));

    const res = await request(app).get(`${API}/export?format=csv`).set(auth(eng));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Ticket #');
    expect(res.text).toMatch(/TKT-\d{6}/);
  });

  it('streams an XLSX export for an engineer', async () => {
    const eng = await makeEngineer();
    const res = await request(app).get(`${API}/export?format=xlsx`).set(auth(eng));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  it('forbids employees from exporting', async () => {
    const dept = await createDepartment();
    const emp = await makeEmployee(dept._id);
    const res = await request(app).get(`${API}/export`).set(auth(emp));
    expect(res.status).toBe(403);
  });

  it('serves the OpenAPI document at /docs/openapi.json', async () => {
    const res = await request(app).get('/docs/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths).toBeTruthy();
  });
});
