# Challengers Bet — Implementation Plan
Version 1.0 | Based on PRD v1.0 | April 2026

---

## 1. Stack Decision & Architecture

### The Problem
The PRD specifies a MERN stack (Vite + React Router + Express + Mongoose). The current codebase is Next.js 15 with Prisma + MongoDB. The stakeholder constraint is **UI/UX stays the same**.

### Decision: Hybrid Architecture — Keep Next.js Frontend, Add Express API Server

Migrating the frontend to Vite + React Router while keeping UI/UX identical would mean copying every component with zero user-facing benefit. The recommended approach:

```
┌────────────────────────────────────────────────┐
│                  FRONTEND                      │
│  Next.js 15 (App Router)                       │
│  React 19, TypeScript, Tailwind CSS, shadcn/ui │
│  TanStack Query (replaces current fetch calls) │
│  Socket.IO client                              │
└─────────────────┬──────────────────────────────┘
                  │ HTTP / WebSocket
┌─────────────────▼──────────────────────────────┐
│               BACKEND (NEW)                    │
│  Express + Node.js + TypeScript                │
│  Mongoose (MongoDB)                            │
│  Socket.IO server                              │
│  BullMQ queues (Redis-backed)                  │
└────────────┬──────────────────┬────────────────┘
             │                  │
      ┌──────▼──────┐    ┌──────▼──────┐
      │  MongoDB    │    │    Redis    │
      │  (primary)  │    │  (queues +  │
      └─────────────┘    │  sockets)   │
                         └─────────────┘
```

**Frontend stays:** Next.js handles all pages, routing, and visual components — unchanged.
**Backend is new:** A separate Express API server handles all domain logic.
**Current Next.js API routes are removed** — the frontend calls the Express API instead.
**Socket.IO** runs on the Express server (no Next.js custom server workaround needed).
**Redis** is added for BullMQ job queues and the Socket.IO Redis adapter.

### Monorepo Structure
```
xpunt24/
├── apps/
│   ├── web/          ← Current Next.js app (frontend only, UI untouched)
│   └── api/          ← New Express server (all domain logic)
├── packages/
│   └── shared/       ← Canonical TypeScript types, enums, socket event names
├── workers/          ← Background job workers (settlement, expiry, reconciliation)
└── package.json      ← pnpm workspace root
```

---

## 2. What Stays vs What Changes vs What's New

### STAYS — No change
| Item | Notes |
|------|-------|
| All React UI components | Header, footer, hero, cards, modals, all shadcn/ui components |
| Tailwind CSS config and styling | All class names, CSS variables, dark mode |
| Page routes and layouts | `/dashboard`, `/matches`, `/wagers`, `/auth/*` etc. |
| Auth pages (login, register, verify, reset) | Visual layout identical |
| Landing page | Identical |
| Football fixture browsing UI | Identical |
| Google OAuth flow | NextAuth stays for auth only |
| Email verification flow | Resend + existing templates stay |

### CHANGES — Significant refactor needed
| Item | What Changes |
|------|-------------|
| Auth session | Add `role`, `accountStatus`; remove `walletBalance` from session |
| Dashboard | Show `availableBalance` + `lockedBalance` breakdown instead of single balance |
| Wallet page | Same layout, new data layer |
| Wagers/Challenges pages | New status labels matching PRD lifecycle |
| Market selection UI | Narrow to v1 enums only; clean display labels |
| Notification model | Add `priority`, `channel`, `deliveryStatus` |
| All API calls from frontend | Point to Express API instead of Next.js `/api/*` routes |
| Next.js `/api/*` routes | All removed after migration |

### REBUILT — Complete overhaul
| Item | Reason |
|------|--------|
| Database schema | Split `Bet` into `Challenge` + `Wager`; add Ledger, WalletAccount, Settlement, AdminAction, Dispute |
| Wallet system | Replace `User.walletBalance` float with immutable ledger-backed wallet |
| Settlement engine | Full market evaluator with snapshots, idempotency, early settlement |
| Real-time layer | Full Socket.IO infrastructure (currently a non-functional placeholder) |
| Admin system | Full RBAC with 5 roles, 10 dashboard modules, immutable audit log |

### NEW — Greenfield builds
| Item | Notes |
|------|-------|
| Auto-match engine | Deterministic FIFO compatibility matching |
| USDT/TRC20 gateway adapter | Provider-agnostic interface; PayRam as v1 implementation |
| Deposit webhook handler | Idempotent ingestion with fallback reconciliation job |
| Withdrawal review flow | Admin approval queue with ledger-backed fund return |
| Direct/targeted challenges | `targetUserId` field, invisible in public lobby |
| Dispute management | Categories, statuses, resolution workflow |
| Immutable audit log | Every admin financial/account action |
| Risk flags and velocity checks | Auto-flagging for suspicious patterns |
| Reconciliation jobs | Gateway vs internal ledger mismatch detection |
| BullMQ job queues | Settlement, expiry, notifications, reconciliation |

---

## 3. Database Schema Changes

### Models to REMOVE
| Model | Replaced By |
|-------|------------|
| `Bet` | `Challenge` + `Wager` |
| `DepositRequest` | `Deposit` |
| `WithdrawalRequest` | `Withdrawal` |
| `Transaction` | `LedgerEntry` |

### Models to MODIFY
| Model | Changes |
|-------|---------|
| `User` | Add `role`, `accountStatus`, `riskFlags`, `walletAccountId`; remove `walletBalance` |
| `Notification` | Add `priority`, `channel`, `status`, `deliveredAt` |

### New Models

**WalletAccount**
```
userId                    ref User (unique)
availableBalance          Decimal
lockedBalance             Decimal
pendingDepositBalance     Decimal
pendingWithdrawalBalance  Decimal
currency                  String (default "USDT")
lastReconciledAt          Date
```

**LedgerEntry** (immutable — no updates ever)
```
userId       ref User
type         DEPOSIT_PENDING | DEPOSIT_CONFIRMED | DEPOSIT_CREDIT |
             STAKE_HOLD | STAKE_RELEASE | PAYOUT_CREDIT | REFUND_CREDIT |
             WITHDRAWAL_PENDING | WITHDRAWAL_DEBIT |
             WITHDRAWAL_FAILED_REFUND | PLATFORM_FEE_DEBIT | ADMIN_ADJUSTMENT
amount       Decimal
currency     String
direction    CREDIT | DEBIT
sourceType   "CHALLENGE" | "WAGER" | "DEPOSIT" | "WITHDRAWAL" | "ADMIN"
sourceId     String
providerRef  String (nullable)
status       PENDING | CONFIRMED | FAILED
metadata     Object
createdAt    Date (immutable, no updatedAt)
```

**Challenge**
```
creatorUserId   ref User
targetUserId    ref User (nullable — only set for direct challenges)
fixtureId       String
market          MarketEnum
pick            PickEnum
oppositePick    PickEnum
stake           Decimal
currency        String
visibility      PUBLIC | DIRECT
status          DRAFT | OPEN | MATCHED | EXPIRED | CANCELED
expiresAt       Date
matchedAt       Date (nullable)
canceledAt      Date (nullable)
createdAt       Date
```

**Wager**
```
challengeId         ref Challenge
challengerUserId    ref User
opponentUserId      ref User
fixtureId           String
market              MarketEnum
challengerPick      PickEnum
opponentPick        PickEnum
stakePerUser        Decimal
totalPot            Decimal
currency            String
platformFee         Decimal
status              PENDING_KICKOFF | LIVE | SETTLING | SETTLED | VOIDED | REFUNDED
result              CHALLENGER_WIN | OPPONENT_WIN | REFUNDED | VOIDED (nullable)
winnerUserId        ref User (nullable)
createdAt           Date
liveAt              Date (nullable)
settledAt           Date (nullable)
voidedAt            Date (nullable)
```

**Settlement**
```
wagerId           ref Wager (unique)
providerSnapshot  Object (provider name, fixture ID, status, scores, elapsed, timestamp)
evaluatedOutcome  String
finalDecision     SETTLED | REFUNDED | VOIDED | UNDER_REVIEW
overriddenBy      ref User/AdminUser (nullable)
overrideReason    String (nullable)
originalOutcome   String (nullable — preserved when admin overrides)
createdAt         Date
updatedAt         Date
```

**Deposit**
```
userId                ref User
provider              String
network               String (default "TRC20")
address               String
requestedAmount       Decimal
receivedAmount        Decimal (nullable)
confirmations         Int (default 0)
requiredConfirmations Int
status                INITIATED | PENDING_CONFIRMATION | CONFIRMED | CREDITED | FAILED | EXPIRED
providerReference     String (unique — idempotency key)
txHash                String (nullable)
webhookPayload        Object (nullable — raw payload stored for audit)
createdAt             Date
updatedAt             Date
```

**Withdrawal**
```
userId            ref User
network           String (default "TRC20")
address           String
amount            Decimal
fee               Decimal
status            REQUESTED | UNDER_REVIEW | APPROVED | PROCESSING | COMPLETED | REJECTED | FAILED
provider          String (nullable)
providerReference String (nullable)
reviewReason      String (nullable)
reviewedBy        ref User (nullable)
rejectionReason   String (nullable)
createdAt         Date
updatedAt         Date
```

**AdminAction** (immutable audit log — no updates ever)
```
adminUserId   ref User
actionType    String (WITHDRAWAL_APPROVED | WAGER_VOIDED | ACCOUNT_FROZEN | ...)
targetType    USER | WAGER | WITHDRAWAL | DEPOSIT | WALLET
targetId      String
reason        String (required)
beforeState   Object (nullable)
afterState    Object (nullable)
metadata      Object
createdAt     Date (immutable)
```

**Dispute**
```
userId              ref User
category            SETTLEMENT | DEPOSIT | WITHDRAWAL | CHALLENGE | ACCOUNT | OTHER
status              OPEN | UNDER_REVIEW | WAITING_ON_USER | ESCALATED | RESOLVED | REJECTED
priority            LOW | NORMAL | HIGH | CRITICAL
relatedEntityType   String
relatedEntityId     String
description         String
resolution          String (nullable)
assignedTo          ref User (nullable)
createdAt           Date
resolvedAt          Date (nullable)
```

### Canonical Market Enums (v1 scope — locked)
```typescript
// markets
MATCH_WINNER, NO_DRAW, BTTS, TOTAL_GOALS

// picks
HOME, AWAY, DRAW, NO_DRAW,
BTTS_YES, BTTS_NO,
OVER_0_5, UNDER_0_5,
OVER_1_5, UNDER_1_5,
OVER_2_5, UNDER_2_5

// opposite pairs (matching logic)
HOME ↔ AWAY
DRAW ↔ NO_DRAW
BTTS_YES ↔ BTTS_NO
OVER_0_5 ↔ UNDER_0_5
OVER_1_5 ↔ UNDER_1_5
OVER_2_5 ↔ UNDER_2_5
```

**Removed from scope:** `double chance`, `gg`/`ng` (old naming), `over 0.5`/`over 1.5` (old format), any string-based markets from current codebase.

---

## 4. Epics

---

### Epic 1 — Platform Foundation & Monorepo Setup

**Goal:** Establish the monorepo structure, shared types, new Express API skeleton, and Redis/MongoDB connections.

**Tasks:**
1. Convert repo to pnpm workspace monorepo (`apps/web`, `apps/api`, `packages/shared`, `workers/`)
2. Move current Next.js app into `apps/web/` with zero changes to any file
3. Scaffold `apps/api/` — Express 5 + TypeScript + Mongoose
4. Create `packages/shared/` — all canonical enums, TypeScript interfaces, and socket event name constants
5. Add Redis (ioredis) and configure BullMQ queues: `settlement`, `expiry`, `notification`, `reconciliation`
6. Define all new Mongoose schemas with correct indexes and validation
7. Migrate existing User, Notification, Follow, Comment, UserStats from Prisma to Mongoose in `apps/api/`
8. Centralized config service — env variable validation via Zod on server startup (fail hard on missing vars)
9. Express error handler, request logger, and request ID middleware
10. Add `role` (default `BETTOR`) and `accountStatus` (default `ACTIVE`) and `riskFlags` to User schema
11. Health check endpoint `GET /health`
12. Remove Prisma from `apps/web` — all DB access moves to the API server

**Acceptance Criteria:**
- `apps/web`, `apps/api`, and `workers/` all start independently
- Shared types are importable from both web and api packages without circular deps
- API returns structured `{ error, code, message }` responses consistently
- Server refuses to start if required env vars are missing

---

### Epic 2 — Wallet, Ledger & Treasury

**Goal:** Replace the single `User.walletBalance` float with an immutable ledger-backed wallet. All money movements go through `LedgerEntry` records.

**Tasks:**
1. `WalletService.getBalance(userId)` — project `WalletAccount` fields from summing `LedgerEntry` records (CREDIT minus DEBIT per category)
2. `WalletService.holdStake(userId, amount, challengeId)` — move `available → locked`, create `STAKE_HOLD` entry, atomic MongoDB session
3. `WalletService.releaseStake(userId, amount, sourceId)` — move `locked → available`, create `STAKE_RELEASE` entry
4. `WalletService.creditPayout(userId, amount, wagerId)` — create `PAYOUT_CREDIT` entry
5. `WalletService.debitFee(amount, wagerId)` — create `PLATFORM_FEE_DEBIT` entry (platform treasury record)
6. `WalletService.refund(userId, amount, sourceId)` — create `REFUND_CREDIT` entry
7. `WalletService.adminAdjust(userId, amount, reason, adminId)` — create `ADMIN_ADJUSTMENT` + `AdminAction` audit record; requires FINANCE_ADMIN or SUPER_ADMIN role
8. All wallet mutations inside MongoDB sessions — no partial state possible
9. Idempotency key on `LedgerEntry` (composite index on `sourceId + type`) — duplicate operations return existing record
10. API endpoints: `GET /wallet/balance`, `GET /wallet/ledger` (paginated transaction history)
11. Data migration: create `WalletAccount` records for all existing users using current `User.walletBalance` as an opening `ADMIN_ADJUSTMENT` credit entry
12. Treasury reconciliation primitive: `ReconciliationService.checkLedgerVsGateway()` — detects mismatches between gateway records and internal ledger

**Acceptance Criteria:**
- `User.walletBalance` is no longer read anywhere in the codebase after migration
- `getBalance()` always returns the same result as summing raw `LedgerEntry` records
- `holdStake()` fails if `availableBalance < amount` (no negative available balance possible)
- Calling `holdStake()` twice with the same `sourceId` returns the first entry, not a duplicate
- Every money movement has a corresponding immutable `LedgerEntry` with a `sourceId` linking it to the originating record

---

### Epic 3 — Market Standardization & Sports Data Service

**Goal:** Lock down v1 market enums across the entire stack. Wrap API-Football in a formal service layer.

**Tasks:**
1. Define canonical `Market` and `Pick` enums in `packages/shared/` — these are the single source of truth for frontend, backend, matching, and settlement
2. Build `SportsDataService` in `apps/api/`:
   - `getFixtures(leagueId, date)` → normalized `Fixture[]`
   - `getFixture(fixtureId)` → normalized `Fixture`
   - `getLiveFixtures()` → normalized `Fixture[]`
   - Normalize all API-Football status codes to internal `FixtureStatus` enum
3. Cache normalized `Fixture` records in MongoDB — avoids redundant API calls and rate limit burn
4. Fixture sync worker (BullMQ, every 60s): poll live fixtures, upsert to DB, emit socket events for score/status changes
5. Remove from frontend market selection UI: `double chance`, `gg`/`ng` (old labels), `over 0.5`/`over 1.5` (old format)
6. Update frontend market display labels to clean PRD-standard strings:
   - `HOME` → "Home Win" / `AWAY` → "Away Win"
   - `DRAW` → "Draw" / `NO_DRAW` → "No Draw"
   - `BTTS_YES` → "Both Teams to Score" / `BTTS_NO` → "Clean Sheet"
   - `OVER_X_X` → "Over X.X Goals" / `UNDER_X_X` → "Under X.X Goals"

**Acceptance Criteria:**
- Only 12 v1 picks are selectable when creating a challenge — no others reach the server
- Server rejects any challenge with an unrecognised market or pick enum value
- Provider failures degrade gracefully — stale fixture data shown with a visible warning banner, no crash
- No raw API-Football response object ever reaches wallet, matching, or settlement logic

---

### Epic 4 — Challenge System

**Goal:** Full challenge lifecycle — creation, direct targeting, cancellation, and expiry.

**Tasks:**
1. `ChallengeService.create(userId, payload)`:
   - Validate: user `ACTIVE`, not `wageringBlocked`, fixture not past kickoff, market in v1 scope, stake within configured min/max, `availableBalance >= stake`
   - Call `WalletService.holdStake()` — stake is reserved immediately
   - Create `Challenge` with status `OPEN`
   - If `visibility = PUBLIC`: emit `challenge.created` on `challenge:lobby` socket room
   - Immediately trigger auto-match (Epic 5)
2. `ChallengeService.cancel(challengeId, userId)`:
   - Validate: status `OPEN`, user is creator, before kickoff
   - `WalletService.releaseStake()`
   - Status → `CANCELED`
   - If was PUBLIC: emit `challenge.removed` on `challenge:lobby`
3. `ChallengeService.expire(challengeId)`:
   - Status → `EXPIRED`
   - `WalletService.releaseStake()`
   - Emit `challenge.removed` on lobby
4. BullMQ expiry worker: on challenge creation, schedule a delayed job at `expiresAt` to call `expire()`
5. Direct challenge: if `targetUserId` is set, `visibility = DIRECT` — not published to lobby, not auto-matchable
6. API endpoints:
   - `POST /challenges` — create
   - `GET /challenges` — lobby (PUBLIC + OPEN only, paginated, sorted by createdAt DESC)
   - `GET /challenges/:id` — detail (creator or target user only for DIRECT)
   - `POST /challenges/:id/cancel` — cancel

**Acceptance Criteria:**
- Stake is held at creation moment — not at match kickoff
- Challenge with insufficient balance returns 422 with no ledger mutation
- Challenge cannot be created within 1 minute of kickoff (configurable buffer)
- Expiry job fires reliably at `expiresAt` even if server restarts (BullMQ persistence via Redis)
- DIRECT challenges return 404 for any user other than creator or target

---

### Epic 5 — Auto-Match Engine & Wager Lifecycle

**Goal:** Auto-match compatible open challenges into wagers. Support manual acceptance. Implement the full wager state machine.

**Tasks:**

**Matching Engine:**
1. `MatchingService.findCompatible(challenge)` — Mongoose query for:
   - Same `fixtureId`, `market`, `stake`, `currency`
   - `pick === OPPOSITE_PICK_MAP[challenge.pick]`
   - Status `OPEN`, `expiresAt > now`
   - `creatorUserId !== challenge.creatorUserId`
   - `visibility = PUBLIC` (direct challenges excluded from auto-match)
   - Order by `createdAt ASC` (FIFO — oldest open challenge matched first)
2. `MatchingService.matchTogether(challengeA, challengeB)` — inside MongoDB session:
   - Both challenges → `MATCHED`, set `matchedAt`
   - Create `Wager` with status `PENDING_KICKOFF`
   - Both `STAKE_HOLD` ledger entries remain (stakes stay locked until wager settles)
   - Emit `challenge.matched` to `user:{challengerUserId}` and `user:{opponentUserId}`
   - Emit `challenge.removed` to `challenge:lobby` for both challenges
3. Auto-match runs: immediately after a new PUBLIC challenge is created; also as reconciliation sweep every 5 minutes for unmatched open challenges
4. Self-match impossible: enforced at both query level AND application level (double check before `matchTogether`)

**Manual Acceptance:**
5. `ChallengeService.accept(challengeId, userId)`:
   - Validate: status `OPEN`, user ≠ creator, before kickoff, `availableBalance >= stake`, user `ACTIVE`
   - For DIRECT: `userId === challenge.targetUserId`
   - `WalletService.holdStake()` for accepter
   - Call `MatchingService.matchTogether()` atomically — if any step fails, full rollback
6. `POST /challenges/:id/accept` endpoint

**Wager State Machine:**
7. `PENDING_KICKOFF → LIVE`: fixture sync worker detects fixture status changed to LIVE → `WagerService.transitionToLive(wagerId)` → emit `wager.live`
8. `LIVE → SETTLING`: fixture reaches settlement-eligible condition → `WagerService.transitionToSettling(wagerId)` → emit `wager.settling`
9. `SETTLING → SETTLED | REFUNDED`: settlement engine resolves (Epic 6)
10. `ANY → VOIDED`: admin action only (Epic 9)
11. Fixture sync worker (Epic 3) drives state transitions for all active wagers on each poll cycle
12. API endpoints: `GET /wagers` (user's own wagers, paginated), `GET /wagers/:id`

**Acceptance Criteria:**
- Self-matching returns 400 with no state change
- Wager creation is atomic — no wager record exists if either `holdStake()` call fails
- Manual accept on an already-matched challenge returns 409
- Manual accept with insufficient balance returns 422 with no ledger mutation
- DIRECT challenge accept by wrong user returns 403
- All wager status transitions emit the correct socket event after DB write completes

---

### Epic 6 — Settlement Engine

**Goal:** Deterministic market evaluation with early settlement, provider snapshots, idempotency, and admin override support.

**Tasks:**

**Market Evaluator:**
1. `SettlementEvaluator.evaluate(wager, normalizedFixture)` → `EvaluationResult`:
   - `MATCH_WINNER`: final only. HOME wins if `home > away`. AWAY wins if `away > home`. Any other finish → `UNDER_REVIEW`
   - `NO_DRAW`: final only. DRAW wins if scores equal. NO_DRAW wins if not equal
   - `BTTS`:
     - `BTTS_YES` — early settle once both teams have scored ≥1 goal (irreversible)
     - `BTTS_NO` — final only; wins if either team has 0 goals at FT
   - `TOTAL_GOALS`:
     - OVER markets — early settle once threshold is irreversibly crossed (e.g. OVER_1_5 once totalGoals ≥ 2)
     - UNDER markets — final only
     - `totalGoals = homeScore + awayScore`
2. Normalize provider fixture status to internal enum: `NOT_STARTED | LIVE | HALFTIME | FINISHED | POSTPONED | CANCELED | ABANDONED | SUSPENDED`
3. Only `FINISHED` status triggers final-only market settlement without admin review
4. `POSTPONED | CANCELED | ABANDONED` → auto-route to `REFUNDED` path

**Settlement Execution:**
5. `SettlementService.settle(wagerId)`:
   - Check wager status is `SETTLING` and not already `SETTLED` (idempotency guard)
   - Acquire Redis distributed lock on `wagerId` (prevent concurrent execution)
   - Fetch latest normalized fixture data
   - Store `providerSnapshot` on `Settlement` record before any financial writes
   - Run `SettlementEvaluator.evaluate()`
   - If winner determined:
     - MongoDB session: `WalletService.creditPayout(winner)` + `WalletService.debitFee()` + update Wager status + update Settlement record
     - Emit `wager.settled` + `wallet.balance_updated` for both users
   - If ambiguous/incomplete → Wager → `UNDER_REVIEW`, emit for admin ops
   - If refund → `WalletService.refund(both)` → Wager → `REFUNDED`
   - Release Redis lock in `finally` block
6. BullMQ settlement worker: triggered by fixture sync worker on status change; also sweeps `SETTLING` wagers every 5 minutes as reconciliation
7. Retry on provider failure: exponential backoff, max 5 attempts; after 5 failures → `UNDER_REVIEW`

**Admin Override:**
8. `AdminSettlementService.override(wagerId, decision, winnerId, reason, adminId)`:
   - Allowed: `SETTLED` (requires explicit `winnerId`), `REFUNDED`, `VOIDED`
   - Preserve original `providerSnapshot` and `evaluatedOutcome` in `Settlement` record
   - Store `overriddenBy`, `overrideReason`, and original `evaluatedOutcome` before applying override
   - Execute corresponding financial operations inside MongoDB session
   - Create `AdminAction` record
   - Emit `wager.settled` (or equivalent) + `wallet.balance_updated`

**Acceptance Criteria:**
- `settle()` called twice on the same wagerId produces identical result — second call is a no-op (Redis lock + status guard)
- Early settlement fires only for `BTTS_YES` and `OVER_*` markets, never for final-only markets
- `POSTPONED`/`CANCELED`/`ABANDONED` fixtures auto-refund without admin intervention
- `providerSnapshot` is written to DB before any `WalletService` calls — snapshot exists even if payout fails
- Admin override stores the original automated `evaluatedOutcome` alongside the override reason
- Platform fee is always recorded as a separate `PLATFORM_FEE_DEBIT` ledger entry

---

### Epic 7 — Crypto Payment Gateway (USDT/TRC20)

**Goal:** USDT deposits and withdrawals via a provider-agnostic gateway adapter. Initial implementation: PayRam.

**Tasks:**

**Gateway Adapter Interface** (in `packages/shared`):
```typescript
interface CryptoGatewayAdapter {
  createDepositIntent(params): Promise<DepositIntent>
  verifyWebhook(payload, signature, secret): boolean
  getDepositStatus(providerRef): Promise<DepositStatusResponse>
  createPayout(params): Promise<PayoutResult>
  getPayoutStatus(providerRef): Promise<PayoutStatusResponse>
}
```
PayRam implementation in `apps/api/gateways/payram.adapter.ts`.

**Deposit Flow:**
1. `POST /wallet/deposits` — user requests deposit:
   - Create `Deposit` record (status `INITIATED`)
   - Call `adapter.createDepositIntent()` — get TRC20 address, amount, expiry
   - Store `providerReference` as idempotency key
   - Create `DEPOSIT_PENDING` ledger entry
   - Return TRC20 address + instructions to user
2. `POST /webhooks/crypto/payram` — receive webhook:
   - Verify signature: `adapter.verifyWebhook()` — reject with 401 if invalid
   - Find `Deposit` by `providerReference`
   - If already `CREDITED` → return 200 immediately (idempotency — no double credit)
   - If `CONFIRMED` or `CREDITED` event: Deposit status → `CONFIRMED` → `CREDITED`
   - MongoDB session: `WalletService.credit()` → `DEPOSIT_CREDIT` ledger entry
   - Emit `deposit.updated` + `wallet.balance_updated` to `user:{userId}`
3. Fallback reconciliation job (BullMQ, every 15 min): call `adapter.getDepositStatus()` for all deposits in `PENDING_CONFIRMATION` state older than 10 min; apply same credit logic if confirmed

**Withdrawal Flow:**
4. `POST /wallet/withdrawals` — user requests withdrawal:
   - Validate: TRC20 address format, `availableBalance >= amount + fee`, not `withdrawalsBlocked`
   - Create `Withdrawal` record (status `REQUESTED`)
   - `WalletService.holdWithdrawal()` → `WITHDRAWAL_PENDING` ledger entry (funds reserved)
   - Auto-route to `UNDER_REVIEW` if: amount > threshold, new account, account flagged
5. `POST /admin/withdrawals/:id/approve` (FINANCE_ADMIN+):
   - Withdrawal → `APPROVED` → `PROCESSING`
   - Call `adapter.createPayout()` — store `providerReference`
   - On payout confirmed: Withdrawal → `COMPLETED` → `WITHDRAWAL_DEBIT` ledger entry
   - Emit `withdrawal.updated` + `wallet.balance_updated`
6. `POST /admin/withdrawals/:id/reject` (FINANCE_ADMIN+):
   - Withdrawal → `REJECTED`
   - `WalletService.releaseWithdrawal()` → `WITHDRAWAL_FAILED_REFUND` ledger entry
   - Emit `withdrawal.updated` + `wallet.balance_updated`
7. Payout failure path: Withdrawal → `FAILED` → `WalletService.releaseWithdrawal()` — funds always return

**Acceptance Criteria:**
- Duplicate webhook with same `providerReference` never credits wallet more than once
- Withdrawal request that would exceed `availableBalance` returns 422 with no ledger mutation
- `lockedBalance` (stake in active challenge/wager) cannot be withdrawn
- Failed payout restores full withdrawal amount to `availableBalance` via ledger entry — no silent loss
- Swapping PayRam for another provider requires only changing the adapter implementation, not any service logic

---

### Epic 8 — Real-Time (Socket.IO)

**Goal:** Replace the non-functional WebSocket placeholder with a full Socket.IO server implementing the PRD room model and event contract.

**Tasks:**

**Server Setup:**
1. Socket.IO server attached to the Express HTTP server
2. `@socket.io/redis-adapter` — Redis pub/sub for horizontal scale-out
3. Auth middleware: validate JWT on socket `handshake.auth.token`, attach `userId` and `role`; reject with auth error on invalid token

**Room Management:**
4. On connection: auto-join `user:{userId}`; admin users also auto-join `admin:ops`
5. Client emits `join:fixture` / `leave:fixture` → server joins/leaves `fixture:{fixtureId}`
6. Client emits `join:challenge-lobby` → server joins `challenge:lobby`
7. Client emits `join:challenge` / `leave:challenge` with `challengeId` → joins `challenge:{challengeId}`

**Event Emission** (all events fire after the source DB write succeeds):
8. `challenge.created` → `challenge:lobby`
9. `challenge.updated` → `challenge:lobby` + `challenge:{id}`
10. `challenge.removed` → `challenge:lobby`
11. `challenge.matched` → `user:{challengerUserId}` + `user:{opponentUserId}`
12. `wager.live` → `user:{challengerUserId}` + `user:{opponentUserId}`
13. `wager.settling` → same two users
14. `wager.settled` → same two users
15. `fixture.score_updated` → `fixture:{fixtureId}`
16. `fixture.status_updated` → `fixture:{fixtureId}`
17. `wallet.balance_updated` → `user:{userId}`
18. `deposit.updated` → `user:{userId}`
19. `withdrawal.updated` → `user:{userId}`
20. `notification.created` → `user:{userId}`

**Client Integration (Next.js `apps/web`):**
21. Socket.IO client singleton in `apps/web/lib/socket.ts` — single connection per tab
22. `useSocket()` hook: handles connect, disconnect, reconnect
23. On reconnect: invalidate TanStack Query cache for active pages (REST is always source of truth)
24. Replace current polling `live-time/[fixtureId]` route with socket subscription to `fixture:{fixtureId}`

**Acceptance Criteria:**
- Challenge lobby updates without any manual page refresh
- Live score appears on fixture detail page via socket without polling
- Wallet balance reflects settlement/deposit within 1 second of the DB write
- Reconnect re-fetches current state correctly — no stale data displayed
- Duplicate socket events (network noise) do not cause duplicate UI mutations (events carry IDs, client checks before applying)
- Socket connection with expired JWT is rejected cleanly

---

### Epic 9 — Admin System (RBAC, Audit, Disputes, Risk)

**Goal:** Full role-based admin console with audit logging, account controls, settlement overrides, and dispute management.

**Tasks:**

**Role Model:**
1. User `role` field: `BETTOR | MODERATOR | SUPPORT_ADMIN | RISK_ADMIN | FINANCE_ADMIN | SUPER_ADMIN`
2. Express RBAC middleware `requireRole(...roles)` applied to all `/admin/*` routes
3. Admin role assignment endpoint `PATCH /admin/users/:id/role` (SUPER_ADMIN only)

**Account & Wallet Controls:**
4. `POST /admin/users/:id/freeze` — `accountStatus: FROZEN` + block all activity
5. `POST /admin/users/:id/unfreeze` — `accountStatus: ACTIVE`
6. `POST /admin/users/:id/restrict` — set granular wallet flags: `wageringBlocked`, `withdrawalsBlocked`, `depositsBlocked`
7. All above write `AdminAction` audit records

**Settlement Override (from Epic 6):**
8. `GET /admin/wagers?status=UNDER_REVIEW` — review queue with pagination and date filter
9. `POST /admin/wagers/:id/override-settlement` — force outcome with mandatory reason
10. `POST /admin/wagers/:id/void` — void with mandatory reason
11. `POST /admin/wagers/:id/refund` — force refund

**Withdrawal Review (from Epic 7):**
12. `GET /admin/payments/withdrawals?status=UNDER_REVIEW`
13. `POST /admin/withdrawals/:id/approve`
14. `POST /admin/withdrawals/:id/reject` — mandatory `rejectionReason`

**Dispute System:**
15. `POST /disputes` — user creates dispute (authenticated)
16. `GET /admin/disputes` — admin views all disputes, filterable by status/category/priority/user
17. `PATCH /admin/disputes/:id` — update status, assign to admin, add resolution note
18. Dispute closure requires non-empty `resolution` field

**Audit Log:**
19. `GET /admin/audit-logs` — filterable by `adminUserId`, `actionType`, `targetType`, date range
20. `AdminAction` records are insert-only — no update or delete allowed

**Risk Flags & Auto-Flagging:**
21. Middleware/worker auto-flags:
    - Deposit velocity > configured threshold in 24h → set `riskFlags.highDepositVelocity`
    - Withdrawal > configured threshold → route to `UNDER_REVIEW`
    - New account (< 7 days) + withdrawal request → route to `UNDER_REVIEW`
    - Same user creating + canceling challenges repeatedly → set `riskFlags.suspiciousActivity`
    - Emit to `admin:ops` socket room for each flag event

**Admin Dashboard Pages** (Next.js `apps/web/app/admin/` — new, role-gated):
22. `/admin/users` — user list with status, balances, risk flags, search
23. `/admin/wagers` — wager list with status filter
24. `/admin/settlement-review` — UNDER_REVIEW queue
25. `/admin/withdrawals` — withdrawal review queue
26. `/admin/deposits` — deposit monitoring
27. `/admin/disputes` — dispute management
28. `/admin/audit-logs` — immutable audit trail with search
29. Middleware: redirect non-admin users from `/admin/*` to `/dashboard`

**Acceptance Criteria:**
- MODERATOR calling `POST /admin/withdrawals/:id/approve` receives 403
- Every withdrawal approval, rejection, wager void, and account freeze has a corresponding `AdminAction` record
- Frozen accounts receive 403 on `POST /challenges`, `POST /challenges/:id/accept`, `POST /wallet/withdrawals`
- Settlement override always stores the original `evaluatedOutcome` alongside the override data
- Dispute closure with empty `resolution` field returns 422

---

### Epic 10 — Notifications

**Goal:** Durable in-app notifications and email hooks for all key user and admin events.

**Tasks:**
1. Enhanced `Notification` schema: add `priority` (LOW/NORMAL/HIGH/CRITICAL), `channel` (IN_APP/EMAIL), `status` (CREATED/DELIVERED/READ/FAILED), `deliveredAt`
2. `NotificationService.create(userId, type, data)` — creates DB record, then enqueues delivery
3. BullMQ `notification` queue for async delivery with retry (max 3 attempts)
4. After DB write: emit `notification.created` to `user:{userId}` socket room
5. HIGH + CRITICAL priority notifications also trigger Resend email send
6. Admin alerts emitted to `admin:ops` room (not stored as user notifications)

**User-facing trigger events:**
- `DEPOSIT_DETECTED`, `DEPOSIT_CREDITED`
- `WITHDRAWAL_REQUESTED`, `WITHDRAWAL_APPROVED`, `WITHDRAWAL_REJECTED`, `WITHDRAWAL_COMPLETED`
- `CHALLENGE_CREATED`, `CHALLENGE_MATCHED`, `CHALLENGE_CANCELED`, `CHALLENGE_EXPIRED`
- `WAGER_LIVE`, `WAGER_SETTLING`, `WAGER_SETTLED`, `WAGER_REFUNDED`, `WAGER_VOIDED`
- `ACCOUNT_RESTRICTED`, `ACCOUNT_FROZEN`

**Admin alert trigger events:**
- Large withdrawal requested, settlement moved to review, provider inconsistency, account flagged

**API endpoints:**
- `GET /notifications` — paginated, unread first
- `POST /notifications/:id/read` — mark as read

**Acceptance Criteria:**
- All listed trigger events create a `Notification` record in DB
- HIGH/CRITICAL notifications send an email (Resend) regardless of user email preference settings
- Email delivery failure sets `status: FAILED` on the notification — does not throw or corrupt DB state
- `notification.created` socket event fires after DB write, not before
- Admin alerts appear in `admin:ops` room without delay

---

## 5. Phase Delivery Sequence

| Phase | Epics | Milestone |
|-------|-------|-----------|
| **Phase 1 — Foundations** | 1, 2, 3 | Monorepo live, Express API running, schemas migrated, ledger wallet functional, markets standardized |
| **Phase 2 — Betting Core** | 4, 5 | Users can create, match, and cancel challenges; wager lifecycle state machine running |
| **Phase 3 — Settlement & Real-Time** | 6, 8 | Auto-settlement working for all v1 markets; Socket.IO replacing all polling |
| **Phase 4 — Crypto Payments** | 7 | USDT deposits and withdrawals working end-to-end with PayRam |
| **Phase 5 — Admin & Hardening** | 9, 10 | Admin console live, RBAC enforced, notifications delivered, rate limiting in place |

---

## 6. Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend framework | Keep Next.js 15 | UI/UX stays same; migrating to Vite is pure rework with zero UX gain |
| Backend framework | Express 5 + TypeScript | Clean separation; aligns with PRD MERN intent; Socket.IO on same server |
| ORM | Mongoose (new models); Prisma removed | PRD specifies Mongoose; Prisma removed to avoid dual-schema drift |
| Real-time | Socket.IO on Express server | No Next.js custom server complexity; Redis adapter for scale-out |
| Job queues | BullMQ + Redis | Reliable retry, delayed jobs (expiry), concurrency control |
| Wallet ledger | Immutable MongoDB documents (insert-only) | Audit trail, idempotency, no direct balance mutation |
| Settlement locking | Redis distributed lock per wagerId | Prevents concurrent double-settlement |
| Crypto gateway | Adapter pattern; PayRam for v1 | Provider-agnostic — swap provider without touching business logic |
| Market scope | 12 picks across 4 markets | PRD-locked v1 scope; no other markets reach DB or evaluator |
| Auth | NextAuth stays for session management | Add `role` field only; no full auth rebuild needed |

---

## 7. What Must Not Change

- All Tailwind CSS class names and CSS variables
- All shadcn/ui component imports and usage
- All page URLs and navigation structure
- Visual layout of every existing page
- Google OAuth UX flow
- Email verification UX
- Football fixture browsing page structure

---

*End of Implementation Plan — Challengers Bet v1.0*
