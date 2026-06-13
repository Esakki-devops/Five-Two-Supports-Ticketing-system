import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('system endpoints', () => {
  it('GET /health returns an ok envelope', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('ticketing-api');
  });

  it('echoes an x-request-id response header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('honors an inbound x-request-id', async () => {
    const res = await request(app).get('/health').set('x-request-id', 'abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
  });

  it('unknown routes return a 404 error envelope with a requestId', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toBeTruthy();
  });
});
