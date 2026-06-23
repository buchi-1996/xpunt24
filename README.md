# Challengers Bet

Peer-to-peer football betting platform. Users create challenges on real fixtures, opponents accept them, and a backend settlement engine resolves the wager against live match results.

## Repository layout

```
xpunt24/
├── backend/            Express 5 + Mongoose API server (port 4000)
├── frontend/           Next.js 15 App Router web app (port 3000)
├── packages/
│   └── shared/         Shared TypeScript enums, types, and socket event names
├── IMPLEMENTATION_PLAN.md
├── pnpm-workspace.yaml
└── package.json
```

This is a pnpm workspace. `backend` and `frontend` both consume `@challengers-bet/shared` via the `workspace:*` protocol.

## Tech stack

- **Frontend** — Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Socket.IO client
- **Backend** — Express 5, TypeScript, Mongoose 8, Socket.IO with Redis adapter, Google OAuth, JWT auth
- **Data** — MongoDB (replica set required for transactions), Redis (cache + Socket.IO pub/sub)
- **External** — API-Sports football API, PayRam crypto deposits (USDT/TRC20)

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- **MongoDB** running as a replica set — the wallet and settlement services use `session.withTransaction`, which is unsupported on standalone `mongod`. The easiest local options:
  - Atlas free tier (already a replica set)
  - `mongodb/mongodb-community` Docker image with `--replSet rs0` and `rs.initiate()`
- **Redis** 6+ (`redis-server` or `docker run -p 6379:6379 redis`)
- API keys for [api-sports.io](https://www.api-sports.io/) and Google OAuth credentials. PayRam credentials are only needed if you want to exercise the deposit flow.

## Setup

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Build the shared package once so backend and frontend can import it
pnpm --filter @challengers-bet/shared build

# 3. Copy and fill in env files
cp .env.example backend/.env       # see backend/README.md for the full list
cp .env.example frontend/.env      # only NEXT_PUBLIC_API_URL is required

# 4. Make sure MongoDB (replica set) and Redis are running
```

## Spinning up the app

Open two terminals.

```bash
# Terminal 1 — backend API on http://localhost:4000
pnpm --filter backend dev

# Terminal 2 — frontend on http://localhost:3000
pnpm --filter frontend dev
```

Open <http://localhost:3000>. Sign in with Google to get an `auth_token` cookie; the frontend's `lib/apiClient.ts` will use it to call the backend.

For service-specific details (env vars, scripts, route map), see:

- [`backend/README.md`](./backend/README.md)
- [`frontend/README.md`](./frontend/README.md)

## Useful workspace commands

```bash
pnpm --filter @challengers-bet/shared dev   # rebuild shared on change
pnpm --filter backend build                 # tsc → backend/dist
pnpm --filter frontend build                # next build
pnpm --filter frontend lint
```
