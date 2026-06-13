# Five Two Supports — Ticketing Backend

Production-grade internal ticketing platform API for **Five Two Supports**, owned and operated by **Five Two Digitals**. Node.js + TypeScript + Express + MongoDB, with Redis, BullMQ, MinIO/S3, Amazon SES, and Socket.IO.

> This is the backend service. The React web client lives in a separate `frontend/` project and consumes this `/api/v1` REST API + the Socket.IO gateway.

## Tech stack

| Concern                                      | Choice                                                      |
| -------------------------------------------- | ----------------------------------------------------------- |
| Language / runtime                           | Node.js (LTS) + TypeScript (strict)                         |
| Web framework                                | Express 5                                                   |
| Database                                     | MongoDB + Mongoose                                          |
| Cache / queues / rate-limit / socket adapter | Redis (ioredis)                                             |
| Background jobs                              | BullMQ (separate worker process)                            |
| Object storage                               | MinIO / AWS S3 (pluggable; in-memory driver for dev/test)   |
| Email                                        | Amazon SES behind a `MailProvider` interface (no-op in dev) |
| Real-time                                    | Socket.IO + Redis adapter                                   |
| Validation                                   | Zod (one schema per request)                                |
| Auth                                         | JWT access + rotating refresh, bcrypt                       |
| Logging / errors / metrics                   | pino · Sentry (opt-in) · prom-client                        |
| API docs                                     | OpenAPI + Swagger UI at `/docs`                             |
| Tests                                        | Vitest + Supertest (+ mongodb-memory-server)                |

## Architecture

Modular, feature-oriented clean architecture. Each feature module exposes a router mounted by a central registry; modules communicate through services and a typed domain **event bus**, never by importing each other's internals.

```
route → controller → service → model
```

```
src/
  app.ts          Express app assembly (no listen) — testable in isolation
  server.ts       HTTP + Socket.IO bootstrap, DB/Redis connect, listen, shutdown
  worker.ts       BullMQ worker process entrypoint
  core/           config, logger, db, redis, errors, http, middleware,
                  registry, events, realtime, auth (tokens), observability
  modules/        system, auth, users, tickets, departments, categories,
                  notifications, dashboard, export
  integrations/   storage (MinIO/S3), mail (SES)
  jobs/           queues, workers, scheduler, processors
  common/         shared types/enums, zod fragments
  docs/           OpenAPI document + Swagger UI
test/             unit + integration tests
```

**Extensibility:** adding a feature = a new `modules/<x>` folder registered in `app.ts`. Cross-feature behavior flows through the event bus (`ticket.created`, `ticket.statusChanged`, `user.registered`, …) so notifications, real-time pushes, and scheduled jobs subscribe without coupling.

## Prerequisites

- Node.js ≥ 20 (developed on 24)
- MongoDB, Redis, MinIO — via Docker, your own instances, or cloud (e.g. MongoDB Atlas). Redis/MinIO are optional in dev (see graceful degradation below).

## Getting started

```bash
npm install
cp .env.example .env                      # then fill in JWT secrets + MONGODB_URI

# Option A — full local stack:
docker compose up -d mongo redis minio    # infra only
npm run seed                              # 9 departments, categories, bootstrap admin
npm run dev                               # API → http://localhost:4000
npm run dev:worker                        # background worker (needs Redis)

# Option B — point MONGODB_URI at Atlas, skip Docker:
#   the API boots on Mongo alone; Redis/MinIO features degrade gracefully.

curl http://localhost:4000/health         # liveness
curl http://localhost:4000/ready          # Mongo/Redis/storage readiness
open  http://localhost:4000/docs          # Swagger UI
```

Run the whole stack (API + worker + infra) in containers: `docker compose up -d --build`.

### Graceful degradation (dev without all infra)

- **Mongo** is required (fail-fast at boot).
- **Redis** connects in the background; rate limiting, queues, and the socket adapter activate when it's reachable and are skipped otherwise — a missing Redis never blocks a request.
- **Storage** defaults to an in-memory driver; set `STORAGE_DRIVER=s3` (+ MinIO) for persistent attachments.
- **Email** defaults to a no-op transport that logs instead of sending; set `MAIL_PROVIDER=ses`.

## Scripts

| Script                                  | Purpose                                       |
| --------------------------------------- | --------------------------------------------- |
| `npm run dev` / `dev:worker`            | API / worker in watch mode (tsx)              |
| `npm run build`                         | Bundle to `dist/` (tsup, ESM)                 |
| `npm start` / `start:worker`            | Run the built API / worker                    |
| `npm run typecheck` · `lint` · `format` | `tsc --noEmit` · ESLint · Prettier            |
| `npm test` · `test:watch`               | Vitest                                        |
| `npm run seed`                          | Seed departments, categories, bootstrap admin |
| `npm run db:check`                      | Verify MongoDB connectivity                   |

## API surface (`/api/v1`)

`auth` (register/login/refresh/logout/me/forgot/reset) · `users` (admin + approvals) · `tickets` (CRUD, assign, comments, transitions, attachments) · `departments` · `categories` · `notifications` · `dashboard/summary` · `export` (CSV/XLSX). System: `/health`, `/ready`, `/metrics`, `/docs`.

Every response uses the envelope `{ success, data?, error?, meta? }`; protected routes require a Bearer access token; the refresh token rides in an httpOnly cookie.

## Real-time

Socket.IO authenticates the handshake with the access token and joins each user to a private room (`user:<id>`). Notifications emit `notification:new`; ticket changes emit `ticket:updated`. The REST `GET /notifications` endpoint remains the reconciliation/initial-load path.

## Security

JWT access + rotating refresh (versioned revocation) · bcrypt · per-route `authenticate`/`authorize` · Zod validation at the edge · helmet + CORS · **rate limiting** (Redis store) on the API + stricter on auth · **login brute-force lockout** · upload validation (MIME-sniff + extension allow-list + 20 MB) with **scan-gated downloads** · signed/streamed attachments · soft deletes with audit trail · secrets validated at boot · no stack traces in production responses.

## Observability

Structured pino logs with a per-request `requestId` · `/metrics` (Prometheus via prom-client) · opt-in Sentry (`SENTRY_DSN`) · `/health` + `/ready` probes · graceful shutdown (drains server, closes Mongo/Redis/queues/sockets) · `unhandledRejection`/`uncaughtException` handlers.

## Testing

`npm test` runs Vitest + Supertest against an in-memory MongoDB (`mongodb-memory-server`) — no external infra needed. Coverage spans auth/approval, role scoping, ticket lifecycle + transitions, notifications, real-time, jobs (auto-close/reminder), attachments (scan gating), dashboard, export/docs, and security (rate limit + lockout).

## Deployment

Multi-stage non-root Dockerfile (api + worker share the image; the worker overrides the command). Twelve-factor: env-driven config, logs to stdout, disposable processes. CI (`.github/workflows/backend-ci.yml`) runs typecheck + lint + test + build on every push. Move to AWS S3 by swapping `STORAGE_DRIVER`/env — no code change.
