# Testing strategy

## TL;DR

```bash
# 1. Install dev deps (one-time)
npm install -D vitest@^2 @vitest/coverage-v8

# 2. Run unit tests (fast, no DB)
npm test

# 3. Run integration tests (slow, hits real Postgres)
TEST_DATABASE_URL=$DIRECT_URL npm run test:int

# 4. Coverage report
npm run test:coverage
```

Integration tests create a freshly-named test business per file, run the
flow, then `prisma.business.delete()` which cascades all child rows. Safe
to run against your dev DB — they don't touch existing data.

## The two-layer pyramid

```
              ┌────────────────────────┐
              │  Integration (real DB) │  ← high signal, slow, few
              │  checkout, inventory,  │
              │  subscription flow     │
              ├────────────────────────┤
              │   Unit (pure / mocked) │  ← fast, many, cheap
              │   permissions, schemas,│
              │   security helpers,    │
              │   subscription gate    │
              └────────────────────────┘
```

We deliberately skip the **middle** layer (mocked-Prisma action tests).
Mocking Prisma against `$transaction` semantics is brittle — the test
green-lights bugs the real DB would catch (constraint violations, race
conditions in atomic blocks). Pure unit tests for branchable logic +
real-DB integration tests for the transactional surface gives full
coverage without the false confidence.

---

## What's tested per area

### 1. Authentication ([tests/unit/auth-schemas.test.ts](tests/unit/auth-schemas.test.ts))

**Strategy:** Schema validation is the highest-ROI auth surface — every
action starts there. Login/signup/forgot tests are schema-only because
the Supabase client behavior is its vendor's concern, not ours.

| Case | Why |
|---|---|
| Valid login passes | Sanity |
| Missing password rejected | Defense against partial inputs |
| Malformed email rejected | Don't proxy garbage to Supabase |
| Signup requires business name | Onboarding precondition |
| Password under 8 chars rejected | Matches Supabase default minimum |

**Not covered (intentionally):** Supabase SDK return values, OAuth flows
(none implemented). For end-to-end login UX, add Playwright later.

### 2. Checkout flow ([tests/integration/checkout.test.ts](tests/integration/checkout.test.ts))

**Strategy:** `createSale` is the riskiest action in the codebase —
money + inventory in one transaction. Test against real Postgres so
`$transaction` rollback behavior is real.

| Case | Why |
|---|---|
| Happy path creates sale + items + deducts inventory + writes movement | Baseline correctness |
| **Idempotent on retry** with same `idempotencyKey` | Network retries can't double-charge |
| **Rollback on insufficient stock** — no sale, inventory untouched | Atomicity guarantee |
| Underpayment for CASH rejected | Cash drawer correctness |
| Non-cash payment locks `amountPaid` to total | No "tip" leakage on card/GCash |
| Cross-tenant product ID returns NOT_FOUND | IDOR protection |
| Discount clamped to subtotal (can't go negative) | Float-safety on edge prices |

### 3. Inventory deduction ([tests/integration/inventory.test.ts](tests/integration/inventory.test.ts))

**Strategy:** `applyMovement` is the source of truth for stock levels.
Test the three movement types + the concurrency assumption (atomic via
`$transaction` + compound unique key).

| Case | Why |
|---|---|
| `stockIn(+3)` adds to existing level | Baseline |
| `stockOut(-2)` subtracts | Baseline |
| `adjustStock(0)` sets to absolute value, writes signed delta | Recount UX |
| Stock-out below zero rejected | `next < 0` guard |
| Movement row written on every change | Audit trail |
| Cross-tenant branchId returns NOT_FOUND | `assertOwnership` works |
| **Concurrent stock-outs don't oversell** | Atomic transaction holds |

### 4. Subscriptions ([tests/integration/subscription-flow.test.ts](tests/integration/subscription-flow.test.ts))

**Strategy:** Trial creation, gate evaluation, approval-extends-period
logic — the bits that decide whether a customer is paying. Real DB so
we exercise the actual `$transaction` in `approvePayment`.

| Case | Why |
|---|---|
| `ensureTrialSubscription` creates 14-day Starter trial when missing | Self-healing UX |
| Calling it twice is idempotent (no second row) | Race-safe |
| Gate returns `trialing` mid-trial, `expired` after trial end | Gate correctness |
| `approvePayment` activates subscription + sets period correctly | Money path |
| Approving when already active **extends from `currentPeriodEnd`** | No lost time on early renewal |
| Approving an already-approved payment returns CONFLICT | Idempotent |
| Rejected payment doesn't touch subscription | Side-effect isolation |

Plus pure-logic test: [tests/unit/subscription-gate.test.ts](tests/unit/subscription-gate.test.ts) exercises every `SubscriptionStatus` branch with mocked Prisma so the table never silently drifts.

### 5. Reports

**Strategy:** Reports are read-only aggregations — bugs are usually
"wrong tenant data leaks in" or "filter ignored." Covered today via:

- **Tenant isolation:** integration tests for checkout + inventory
  implicitly verify `member.businessId` scoping by creating two
  businesses in the same suite and asserting cross-reads return empty.
  (See `it("doesn't leak across tenants")` in checkout.test.ts.)
- **Aggregation correctness:** add `tests/integration/reports.test.ts`
  when reports are wired up — seed 3 days of sales, call
  `getDailySales`, assert totals match.

For now reports lean on the same tenant-scoping pattern as every other
query, which the action tests cover transitively.

---

## Infrastructure files

| File | Purpose |
|---|---|
| [vitest.config.ts](vitest.config.ts) | Two projects: `unit` (fast, no DB) and `integration` (real Postgres). `singleFork: true` for integration so DB ops serialize. |
| [tests/setup.ts](tests/setup.ts) | Mocks `next/headers`, `next/cache`, `next/navigation` globally. Tests opt in/out by re-mocking. |
| [tests/stubs/server-only.ts](tests/stubs/server-only.ts) | Empty stub — the real package throws when imported outside Server Components. |
| [tests/helpers/fixtures.ts](tests/helpers/fixtures.ts) | `createTestBusiness`, `createTestProduct`, `mockMember`, `deleteTestBusiness`. Every integration test composes these. |

## Add these scripts to package.json

```json
"scripts": {
  "test": "vitest run --project=unit",
  "test:int": "vitest run --project=integration",
  "test:watch": "vitest --project=unit",
  "test:coverage": "vitest run --coverage"
}
```

## Edge cases worth implementing next

These are the punch-list, prioritized by risk-times-likelihood:

| Priority | Test | Where |
|---|---|---|
| 🚨 | Concurrent createSale with same idempotency key (two parallel POS terminals) | checkout.test.ts |
| 🚨 | Refund flow once implemented — must restore inventory | inventory.test.ts |
| 🟠 | `approvePayment` race: two admins click Approve simultaneously | subscription-flow.test.ts |
| 🟠 | Rate-limit bucket eviction at `MAX_BUCKETS` | security-helpers.test.ts |
| 🟠 | Subscription gate transition exactly at `trialEndsAt` (off-by-one) | subscription-gate.test.ts |
| 🟡 | CSV escaping of cells containing `"` followed by `=` | security-helpers.test.ts |
| 🟡 | Privilege escalation: manager tries to set role to `owner` via direct action call | team.test.ts |
| 🟡 | Storage upload failure mid-submit rolls back the payment row | subscription-flow.test.ts |
| 🟢 | E2E happy-path: signup → ring sale → see receipt (Playwright) | new — `e2e/` |

## CI workflow (GitHub Actions)

Once unit tests are green, drop this in `.github/workflows/test.yml`:

```yaml
name: Test
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_pos
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 10s
    env:
      DATABASE_URL: postgresql://postgres:test@localhost:5432/test_pos
      DIRECT_URL: postgresql://postgres:test@localhost:5432/test_pos
      TEST_DATABASE_URL: postgresql://postgres:test@localhost:5432/test_pos
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma db push
      - run: npx prisma db seed
      - run: npm run test:int
```
