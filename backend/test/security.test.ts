import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { API, app } from './helpers/api';
import { clearDb, setupTestDb, teardownTestDb } from './helpers/db';
import { createUser } from './helpers/factories';
import { Role } from '../src/common/types/index';
import { rateLimitExceeded } from '../src/core/middleware/rate-limit';

beforeAll(setupTestDb);
afterAll(teardownTestDb);
afterEach(clearDb);

describe('rate limiting', () => {
  it('returns a 429 envelope once the limit is exceeded', async () => {
    const limited = express();
    limited.use((req, _res, next) => {
      req.requestId = 'test';
      next();
    });
    limited.use(
      rateLimit({
        windowMs: 60_000,
        limit: 2,
        standardHeaders: false,
        legacyHeaders: false,
        handler: rateLimitExceeded,
      }),
    );
    limited.get('/', (_req, res) => {
      res.json({ ok: true });
    });

    await request(limited).get('/');
    await request(limited).get('/');
    const third = await request(limited).get('/');
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});

describe('login lockout', () => {
  it('locks an account after repeated failed logins', async () => {
    await createUser({ role: Role.Engineer, email: 'lock@example.com', password: 'Correct123' });

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post(`${API}/auth/login`)
        .send({ email: 'lock@example.com', password: 'wrong-password' });
      expect(res.status).toBe(401);
    }

    // Even the correct password is now rejected with 429 until the lock expires.
    const locked = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'lock@example.com', password: 'Correct123' });
    expect(locked.status).toBe(429);
  });
});
