# Five Two Supports — Ticketing Frontend

The web client for the Five Two Supports internal IT ticketing platform. A
single-page React application that talks to the [`backend`](../backend) REST API
and its Socket.IO gateway.

Built for two roles:

- **Employees** raise and track their own support tickets.
- **Engineers** (IT / admin) triage every ticket, manage users and reference
  data, and view organization-wide metrics.

---

## Tech stack

| Concern            | Choice                                                     |
| ------------------ | ---------------------------------------------------------- |
| Framework          | React 19 + TypeScript (strict) + Vite                      |
| Styling            | Tailwind CSS v4 (CSS-first `@theme`, 3-tier design tokens) |
| Routing            | React Router v7 (data router, lazy routes, role guards)    |
| Server state       | TanStack Query v5                                          |
| Client state       | Zustand v5 (auth session, theme)                           |
| Forms + validation | React Hook Form + Zod                                      |
| UI primitives      | Radix UI (owned, shadcn-style components)                  |
| Real-time          | socket.io-client                                           |
| Toasts / icons     | sonner / lucide-react                                      |
| Testing            | Vitest + React Testing Library                             |

---

## Prerequisites

- **Node.js 22+** and npm
- The **backend** running (locally on `http://localhost:4000`, or reachable in
  production). See [`../backend/README`](../backend).

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional in dev — defaults work with the proxy)
cp .env.example .env

# 3. Start the dev server (http://localhost:5173)
npm run dev
```

In development, Vite proxies `/api` and `/socket.io` to the backend on
`http://localhost:4000` (see `vite.config.ts`). This keeps requests same-origin
so the refresh-token cookie works without CORS headaches. Start the backend
first, or run only its infra via `../backend/docker-compose.yml`.

### Environment variables

All client env vars must be prefixed with `VITE_`.

| Variable          | Default   | Purpose                                                            |
| ----------------- | --------- | ------------------------------------------------------------------ |
| `VITE_API_URL`    | `/api/v1` | Base path of the REST API. Relative keeps cookies same-origin.     |
| `VITE_SOCKET_URL` | _(empty)_ | Socket.IO origin. Empty = same origin (proxied in dev / by nginx). |

---

## Scripts

| Script               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Start the Vite dev server with HMR               |
| `npm run build`      | Typecheck (`tsc --noEmit`) then production build |
| `npm run preview`    | Serve the production build locally               |
| `npm run typecheck`  | TypeScript check only                            |
| `npm run lint`       | ESLint                                           |
| `npm run format`     | Prettier write                                   |
| `npm run test`       | Run the Vitest suite once                        |
| `npm run test:watch` | Vitest in watch mode                             |

The CI gate is: **`typecheck` → `lint` → `build` → `test`**, all green.

---

## Architecture

```
src/
├── app/                # App shell, router, guards, layouts, providers
│   ├── router.tsx        # createBrowserRouter — lazy routes + role guards
│   ├── guards.tsx        # RequireAuth / RequireGuest / RequireRole
│   ├── layouts/          # AppShell (authed) + AuthLayout (guest)
│   ├── SessionGate.tsx   # Silent refresh on load before first paint
│   └── SocketManager.tsx # Socket.IO lifecycle → React Query cache bridge
├── design-system/      # Owned UI library
│   ├── primitives/       # Button, Input, Dialog, Select, … (Radix-based)
│   ├── patterns/         # DataTable, FormField, CommentThread, …
│   └── index.ts          # Barrel export
├── features/           # Vertical slices (api hooks + pages per domain)
│   ├── auth/  tickets/  notifications/  dashboard/
│   ├── users/  departments/  categories/  reports/  profile/
├── lib/                # api client, query keys, socket, auth session, utils
├── stores/             # Zustand stores (auth, theme)
├── types/              # Shared domain types mirroring the API contract
└── index.css           # Design tokens + Tailwind theme mapping
```

### Key patterns

- **Response envelope** — every API response is `{ success, data?, error?, meta? }`.
  The `lib/api/client.ts` helpers unwrap it: `api.get/post/patch/delete` return
  `data`; `apiGetPaginated` returns `{ items, pagination }`; `apiGetWithMeta`
  returns `{ data, pagination }`; `downloadFile` streams binary (exports,
  attachments) with auth.
- **Auth** — the access token lives in memory (Zustand); the refresh token is an
  httpOnly cookie. A single-flight `401 → refresh → retry` interceptor in the api
  client transparently renews expired sessions.
- **Feature slices** — each domain owns its `api.ts` (Query hooks + mutations)
  and `pages/`. Mutations invalidate or patch the relevant query keys
  (`lib/query/keys.ts`) to keep the cache consistent.
- **Real-time** — `SocketManager` listens for `notification:new` (refresh the
  notification queries + toast) and `ticket:updated` (refetch that ticket + the
  lists), so changes by one user appear live for others.
- **Role-aware UI** — routing (`RequireRole`), navigation, table columns, and
  page affordances all scope to `employee` vs `engineer`.

### Design tokens

`index.css` defines a **three-tier token system**: primitive ramps → semantic
light/dark variables → `@theme inline` mapping that binds Tailwind utilities to
the active theme. Components reference tokens/utilities only — never raw hex or
pixel values. Theme (light/dark) is applied pre-paint via an inline script in
`index.html` to avoid a flash, and persisted in `localStorage`.

---

## Testing

```bash
npm run test
```

React Testing Library + Vitest (jsdom). Coverage focuses on behavior at the
wiring level: auth forms, the ticket create→comment→resolve flow, notification
mark-read/navigation, and admin CRUD. Network is stubbed at `fetch`; no backend
is required to run the suite.

---

## Production build & Docker

### Static build

```bash
npm run build      # outputs hashed assets to dist/
npm run preview    # smoke-test the build locally
```

The build is vendor-split (react, radix, router, tanstack, forms, socket) into
separately-cacheable chunks; the application code is a small entry chunk.

### Container

A multi-stage `Dockerfile` builds the app and serves it with nginx. The bundled
`nginx.conf` provides SPA history fallback, long-cache headers for hashed
assets, and reverse-proxies `/api` and `/socket.io` to the backend service
(`api:4000` on the shared Docker network).

```bash
# Build (API/socket default to same-origin, proxied by nginx)
docker build -t fts-ticketing-frontend .

# Run against a backend reachable as `api` on the same Docker network
docker run --rm -p 8080:80 --network five-two-ticketing_default fts-ticketing-frontend
# → http://localhost:8080
```

To point the bundle at a different API origin at build time:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com/api/v1 \
  --build-arg VITE_SOCKET_URL=https://api.example.com \
  -t fts-ticketing-frontend .
```

> The backend stack (MongoDB, Redis, MinIO, API, worker) is orchestrated by
> [`../backend/docker-compose.yml`](../backend/docker-compose.yml). Run the
> frontend container on that compose network so the `api` upstream resolves.

---

## License

UNLICENSED — internal to Five Two Supports / Five Two Digitals.
