# Frontend — Challengers Bet Web

Next.js 15 (App Router) + React 19 + Tailwind + shadcn/ui. The frontend is presentation-only: all data and auth go through the backend API at `NEXT_PUBLIC_API_URL`.

Default port: **3000**.

## Prerequisites

- Node.js 20+
- The backend running on `http://localhost:4000` (see [`../backend/README.md`](../backend/README.md))
- The shared package built once: `pnpm --filter @challengers-bet/shared build`

## Environment

Create `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

That's the only required variable. `lib/apiClient.ts` falls back to `http://localhost:4000` if it's missing, but setting it explicitly avoids surprises in production builds.

Authentication is handled entirely by the backend's Google OAuth flow — the frontend just reads the `auth_token` cookie set on the API origin, so the backend and frontend should be on origins that share cookies (`localhost` works out of the box).

## Scripts

```bash
pnpm dev      # next dev --turbopack on port 3000
pnpm build    # next build
pnpm start    # next start
pnpm lint
```

## Running it

From the repo root:

```bash
pnpm --filter frontend dev
```

Open <http://localhost:3000>. Click "Login" → Google to authenticate; the backend will redirect you back with an `auth_token` cookie.

## Source layout

```
app/
├── (auth)/             Login, register, verify, reset password screens
├── (landing)/          Public + authenticated pages (home, dashboard, matches, wagers, challenges, deposit)
└── globals.css
components/             UI primitives (shadcn/ui), feature components (bet rows, challenge slides, header, footer)
context/                React contexts (auth, wallet, socket, modal) wired up in Providers.tsx
hooks/                  Custom hooks (useModal, use-media-query, ...)
lib/
├── apiClient.ts        Typed wrapper around the backend REST API
├── formSchema.ts       Zod form schemas
└── utils.ts            cn helper, etc.
middleware.ts           Redirects unauthenticated requests on private routes to /auth/login
types/                  Local TS types
utils/                  axiosInstance and misc helpers
```

## Routing

Private route prefixes (defined in `middleware.ts`):

- `/dashboard`
- `/wagers`
- `/profile`
- `/settings`
- `/challenges`

If the `auth_token` cookie is absent, requests to these paths redirect to `/auth/login`.

## Real-time

`context/socket/SocketContext.tsx` opens a Socket.IO connection to the backend using the auth cookie. Components subscribe to events declared in `@challengers-bet/shared` (`SocketEvent`) — e.g. `WALLET_BALANCE_UPDATED`, `CHALLENGE_MATCHED`, `CHALLENGE_SETTLED`.

## Notes

- The shared package is consumed via `workspace:*`. If you change its source, rerun `pnpm --filter @challengers-bet/shared build` (or run `pnpm --filter @challengers-bet/shared dev` in a third terminal for watch mode).
- `next.config.ts` enables Turbopack via `--turbopack` in the `dev` script. If you hit a Turbopack-specific issue, drop the flag from `package.json`.
