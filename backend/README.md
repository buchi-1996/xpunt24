# Backend — Challengers Bet API

Express 5 + Mongoose API server. Owns all domain logic: auth, wallet ledger, challenge matching, settlement, notifications, and real-time events over Socket.IO.

Default port: **4000**.

## Prerequisites

- Node.js 20+
- MongoDB running **as a replica set** (standalone `mongod` will fail on `session.withTransaction` calls in `wallet.service` and `settlement.service`)
- Redis 6+ (used by Socket.IO's Redis adapter and the fixture cache)
- The shared package built once: `pnpm --filter @challengers-bet/shared build`

## Environment

Copy `.env.example` from the repo root into `backend/.env` and fill in the values below. Startup validates these with Zod (`src/config/env.ts`) and exits if anything is missing.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Mongo connection string (replica set) |
| `JWT_SECRET` | yes | Signs the `auth_token` cookie (5-day TTL) |
| `PORT` | no | Defaults to `4000` |
| `GOOGLE_CLIENT_ID` | yes | Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | yes | Google OAuth client |
| `GOOGLE_CALLBACK_URL` | yes | Must match the URI registered in Google Cloud (default: `http://localhost:4000/auth/callback/google`) |
| `FOOTBALL_API_KEY` | yes | api-sports.io key |
| `REDIS_URL` | yes | e.g. `redis://localhost:6379` |
| `CRON_SECRET` | yes | Bearer token for `/cron/*` endpoints |
| `PLATFORM_FEE_PERCENT` | no | Default `5` |
| `MIN_STAKE` | no | Default `100` |
| `MAX_STAKE` | yes | Hard cap per challenge |
| `MIN_DEPOSIT` | yes | |
| `MIN_WITHDRAWAL` | yes | |
| `WITHDRAWAL_REVIEW_THRESHOLD` | yes | Withdrawals at or above this go to `UNDER_REVIEW` instead of auto-processing |
| `PAYRAM_API_URL` | no | Defaults to `http://localhost:7000` |
| `PAYRAM_API_KEY` | yes | |
| `PAYRAM_WEBHOOK_SECRET` | yes | Verified against the `X-Payram-Secret` header |
| `ALLOWED_ORIGINS` | no | Comma-separated. Default `http://localhost:3000`. First entry is used as the post-Google-login redirect target. |
| `NODE_ENV` | no | `development` / `production` / `test` |

## Scripts

```bash
pnpm dev      # tsx watch — hot reload
pnpm build    # tsc → backend/dist
pnpm start    # node dist/index.js (production)
```

## Running it

From the repo root:

```bash
pnpm --filter backend dev
```

Health check:

```bash
curl http://localhost:4000/health
```

## Route map

All routes are mounted in `src/index.ts`.

| Mount | Auth | Purpose |
|---|---|---|
| `/health` | none | Liveness probe |
| `/auth` | cookie/JWT (except `/google`, `/callback/google`) | Google OAuth flow, `/me`, `/logout` |
| `/wallet` | JWT | Balance, transactions, create deposit intent, withdraw |
| `/fixtures` | JWT | List/get fixtures, live data, leagues |
| `/challenges` | JWT | Create, list, accept, cancel, get-by-id, mine |
| `/users` | JWT | Profile, stats, settings, follow/unfollow |
| `/notifications` | JWT | List, mark read |
| `/admin` | JWT + `ADMIN`/`SUPER_ADMIN` role | Manual challenge settlement |
| `/cron` | `Authorization: Bearer <CRON_SECRET>` | `process-results`, `expire-challenges` |
| `/webhooks` | shared secret header | PayRam deposit callbacks |

## Auth flow

1. Frontend sends user to `GET /auth/google`.
2. Google redirects back to `GET /auth/callback/google`, the route issues a JWT and sets it as an httpOnly cookie (`auth_token`, SameSite=Lax, 5-day TTL).
3. All authenticated routes accept the cookie or `Authorization: Bearer <token>` as a fallback.
4. Socket.IO uses the same cookie via `src/middleware/socketAuth.ts`.

## Real-time

Socket.IO listens on the same HTTP server and uses a Redis pub/sub adapter so multiple backend instances stay in sync. Each connected user joins a private room `user:<userId>`; services emit to that room via `socketService.emitToUser`.

Event names live in `@challengers-bet/shared` (`SocketEvent`).

## Cron endpoints

Trigger these from your scheduler of choice (Vercel Cron, GitHub Actions, k8s CronJob) with the bearer token:

```bash
curl -X POST http://localhost:4000/cron/process-results \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST http://localhost:4000/cron/expire-challenges \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Source layout

```
src/
├── config/env.ts            Zod-validated env
├── db/
│   ├── connection.ts
│   └── models/              Mongoose schemas (User, Challenge, Wager, WalletAccount, LedgerEntry, ...)
├── gateways/payram.adapter.ts
├── middleware/              auth, rbac, requestId, errorHandler, socketAuth, cronSecret
├── routes/                  one router per resource
├── services/                challenge, wallet, settlement, fixture, notification, socket
├── utils/                   AppError, decimal, paginate
└── index.ts                 Express + Socket.IO bootstrap
```
