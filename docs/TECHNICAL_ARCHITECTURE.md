# Finances PWA App — Technical Architecture

> **Status**: This document reflects the actual implemented system as of March 2026.
> Planned-but-not-yet-built features are marked with 📋.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Repository Structure](#repository-structure)
3. [Technology Stack](#technology-stack)
4. [Shared Package](#shared-package)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Seed Script](#seed-script)
10. [Deployment](#deployment)

---

## System Overview

```
┌─────────────────────────────────────┐
│        Browser / Mobile             │
│        Next.js 15 App               │
│  TanStack Query · React Hook Form   │
│  Recharts · Tailwind CSS            │
└──────────────┬──────────────────────┘
               │ REST API (JWT)
               ▼
┌─────────────────────────────────────┐
│         NestJS Backend              │
│                                     │
│  auth · users · household · assets  │
│  liabilities · expenses · goals     │
│  net-worth · import                 │
│                                     │
│  Prisma ORM                         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  PostgreSQL                         │
│  Household · HouseholdMember        │
│  User · HouseholdInvite             │
│  Asset · AssetSnapshot              │
│  Liability · LiabilitySnapshot      │
│  Expense · ExpenseCategory          │
│  MerchantCategoryMap                │
│  Goal · GoalSnapshot                │
│  AllocationPlan · ActualAllocation   │
│  Document · Transaction · TaxInfo   │
└─────────────────────────────────────┘

📋 Redis / Bull queue (configured, jobs not yet implemented)
```

### Key Principles
- **Monorepo** (pnpm workspaces + Turborepo): `apps/backend`, `apps/frontend`, `packages/shared`
- **Full TypeScript** end-to-end, including shared types consumed by both apps
- **JWT auth** — all API routes protected; data scoped by `householdId` (multi-tenant)
- **Snapshot model** — historical values stored as point-in-time snapshots; no overwriting of history
- **Carry-forward** — net worth history uses last known snapshot value for months with no new snapshot

---

## Repository Structure

```
finances-app/
├── apps/
│   ├── backend/                        # NestJS API
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts                 # Bootstrap, CORS, global pipes/filters
│   │   │   ├── auth/                   # JWT login & register (creates Household on register)
│   │   │   ├── users/                  # User profile CRUD
│   │   │   ├── household/              # Invite system, member management, roles
│   │   │   ├── assets/                 # Asset CRUD + snapshot management
│   │   │   ├── liabilities/            # Liability CRUD + snapshot management
│   │   │   ├── expenses/               # Expense CRUD + categories + merchant maps
│   │   │   ├── goals/                  # Goal CRUD + allocation plans
│   │   │   ├── net-worth/              # History, projection, summary
│   │   │   ├── import/                 # Revolut CSV parsing + auto-categorization
│   │   │   ├── common/
│   │   │   │   ├── prisma/             # PrismaService + PrismaModule
│   │   │   │   ├── decorators/         # @CurrentUser()
│   │   │   │   ├── filters/            # HttpExceptionFilter
│   │   │   │   └── interceptors/       # ResponseInterceptor
│   │   │   └── config/                 # database, jwt, redis configs
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts                 # Historical data import script
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   └── frontend/                       # Next.js 15 App Router
│       ├── app/
│       │   ├── layout.tsx              # Root layout + providers
│       │   ├── page.tsx                # Redirect to /dashboard
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   └── register/page.tsx
│       │   └── (app)/                  # Authenticated section
│       │       ├── layout.tsx          # Sidebar + auth guard
│       │       ├── dashboard/page.tsx
│       │       ├── assets/
│       │       │   ├── page.tsx
│       │       │   └── assets-client.tsx
│       │       ├── liabilities/
│       │       │   ├── page.tsx
│       │       │   └── liabilities-client.tsx
│       │       ├── expenses/
│       │       │   ├── page.tsx
│       │       │   └── expenses-client.tsx
│       │       ├── goals/
│       │       │   ├── page.tsx
│       │       │   └── goals-client.tsx
│       │       ├── account/             # Household member + invite management
│       │       ├── income/              # Income tracking
│       │       ├── import/              # Revolut CSV upload + preview
│       │       ├── documents/page.tsx   # Stub
│       │       └── reports/
│       │           ├── page.tsx        # Reports index
│       │           ├── net-worth/page.tsx          # Full implementation
│       │           ├── expense-budget/page.tsx    # Full implementation
│       │           ├── allocation-comparison/page.tsx  # Stub
│       │           └── goal-comparison/page.tsx        # Stub
│       ├── components/
│       │   ├── assets/
│       │   │   ├── asset-card.tsx
│       │   │   ├── asset-form.tsx
│       │   │   └── asset-snapshot-modal.tsx  # Manual history entry
│       │   ├── liabilities/
│       │   │   ├── liability-card.tsx        # Type-specific display + derived values
│       │   │   └── liability-form.tsx        # Type-specific fields + leasing schedule
│       │   ├── expenses/expense-form.tsx
│       │   ├── goals/
│       │   │   ├── goal-card.tsx
│       │   │   └── goal-form.tsx
│       │   ├── forms/
│       │   │   ├── login-form.tsx
│       │   │   └── register-form.tsx
│       ├── invite/
│       │   └── [token]/page.tsx          # Public invite acceptance
│       │   ├── layout/
│       │   │   ├── sidebar-footer.tsx    # Settings panel (theme + language picker)
│       │   │   ├── sidebar-nav.tsx       # Nav links (client component for i18n)
│       │   │   └── mobile-shell.tsx      # Responsive sidebar/drawer
│       │   └── ui/modal.tsx
│       ├── i18n/
│       │   ├── en.json               # English translations (~200 keys)
│       │   ├── bg.json               # Bulgarian translations
│       │   └── index.tsx             # LanguageProvider, useTranslation(), TranslationKey type
│       ├── hooks/
│       │   ├── use-assets.ts
│       │   ├── use-liabilities.ts
│       │   ├── use-expenses.ts          # CRUD + useMonthlyReport()
│       │   ├── use-goals.ts
│       │   ├── use-household.ts         # members, invites, roles
│       │   └── use-net-worth.ts         # history · projection · summary
│       ├── lib/
│       │   ├── api-client.ts           # Axios instance + JWT interceptor
│       │   └── utils.ts                # formatCurrency, cn(), etc.
│       └── package.json
│
├── packages/
│   └── shared/                         # @finances/shared
│       └── src/index.ts                # Types + constants shared by both apps
│
├── sample-data/
│   └── existing-data/
│       ├── mind.csv                    # Historical monthly finances (2015–2026)
│       └── car-leasing.csv             # Amortization schedule (Apr 2024–Mar 2029)
│
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── docker-compose.yml
```

---

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Package manager | pnpm 9 | Workspace hoisting |
| Monorepo | Turborepo | Build caching + task orchestration |
| Backend framework | NestJS 10 | Modular, decorator-based |
| Frontend framework | Next.js 15 (App Router) | React Server Components + client components |
| Language | TypeScript 5 | Strict mode across all packages |
| ORM | Prisma 5 | Type-safe query builder; schema-first |
| Database | PostgreSQL 14+ | Primary data store |
| Auth | JWT (passport-jwt) | 7-day expiry; Bearer header |
| HTTP client | Axios | With request interceptor for JWT injection |
| Server state | TanStack React Query 5 | Caching, invalidation, mutations |
| Forms | React Hook Form + Zod | Schema validation per form |
| Charts | Recharts | LineChart for net worth, used with custom mergedData |
| i18n | Custom React Context | ~200 keys; EN + BG; localStorage persistence |
| Styling | Tailwind CSS 3 | Utility-first; custom `brand` color |
| 📋 Job queue | Bull + Redis | Configured but no active jobs yet |

---

## Shared Package

**`packages/shared/src/index.ts`** — consumed by both `apps/backend` and `apps/frontend`.

```typescript
// Asset types
export const ASSET_TYPES = ['etf', 'crypto', 'gold', 'apartment'] as const;

// Liability types
export const LIABILITY_TYPES = ['mortgage', 'loan', 'leasing'] as const;

// Supported currencies
export const CURRENCIES = ['EUR', 'USD', 'GBP'] as const;

// Mortgage lifecycle event types
export const MORTGAGE_EVENT_TYPES = ['rate_change', 'payment_change', 'extra_payment', 'refinance'] as const;

export interface MortgageEvent {
  id: string;
  type: MortgageEventType;
  date: string;              // YYYY-MM-DD
  newRate?: number;          // for rate_change, refinance
  newMonthlyPayment?: number; // for payment_change, refinance
  amount?: number;           // for extra_payment
  newBalance?: number;       // for refinance
  notes?: string;
}

// Metadata interfaces
export interface MortgageMetadata {
  originalAmount: number;
  interestRate: number;      // current effective rate
  monthlyPayment: number;
  termMonths: number;
  startDate: string;         // YYYY-MM-DD
  events: MortgageEvent[];   // lifecycle events (rate changes, refinances, etc.)
}

export interface LoanMetadata {
  originalAmount?: number;
  interestRate?: number;
  monthlyPayment?: number;
  termMonths?: number;
  startDate?: string;
  events?: MortgageEvent[];  // optional lifecycle events
}

export interface LeasingMetadata {
  originalValue: number;    // Total asset price (car/equipment)
  downPayment: number;
  residualValue: number;    // Balloon payment at lease end
  interestRate: number;     // Annual %
  monthlyPayment: number;
  termMonths: number;
  startDate: string;        // YYYY-MM-DD
}
```

---

## Backend Architecture

### Modules

#### Auth Module (`src/auth/`)
- **Endpoints**: `POST /auth/register`, `POST /auth/login`
- Bcrypt password hashing (10 rounds)
- Registration creates User + Household + HouseholdMember + 14 default ExpenseCategories in a `$transaction`
- Login looks up user's first household membership to include `householdId` in JWT
- JWT payload: `{ sub: userId, email, householdId }`
- Returns JWT on login; `JwtAuthGuard` protects all other routes
- `@CurrentUser()` decorator extracts user from JWT payload

#### Users Module (`src/users/`)
- **Endpoints**: `GET /users/me`, `PATCH /users/me`
- Profile read/update

#### Household Module (`src/household/`)
- **Endpoints**:
  ```
  POST   /household/invites          — create invite (owner only, 7-day expiry, max 3 active)
  GET    /household/invites          — list active invites (owner only)
  DELETE /household/invites/:id      — revoke invite (owner only)
  GET    /household/invites/:token/info — public invite info (no auth)
  POST   /household/invites/:token/accept — accept invite
  GET    /household/members          — list household members
  PATCH  /household/members/:id/role — update member role (owner only)
  DELETE /household/members/:id      — remove member (owner only)
  ```
- Roles: `owner`, `member`, `viewer`
- Accepting invite creates HouseholdMember and migrates user to new household

#### Assets Module (`src/assets/`)
- **Endpoints**:
  ```
  GET    /assets              — list all assets for current user
  POST   /assets              — create asset
  PATCH  /assets/:id          — update asset
  DELETE /assets/:id          — delete asset
  GET    /assets/:id/snapshots — list historical snapshots
  POST   /assets/:id/snapshots — create manual snapshot
  ```
- Snapshots store `value` + `capturedAt`; used by net-worth history
- Types: `etf`, `crypto`, `gold`, `apartment`

#### Liabilities Module (`src/liabilities/`)
- **Endpoints**:
  ```
  GET    /liabilities         — list all liabilities
  POST   /liabilities         — create liability
  PATCH  /liabilities/:id     — update liability
  DELETE /liabilities/:id     — delete liability
  GET    /liabilities/history — list with snapshots (for history chart)
  ```
- `metadata` is a JSON field storing type-specific data (see shared types)
- Snapshots store monthly outstanding balance; used in net-worth history

#### Expenses Module (`src/expenses/`)
- **Endpoints**:
  ```
  GET    /expenses            — list (with optional month/category filter)
  POST   /expenses            — create
  PATCH  /expenses/:id        — update
  DELETE /expenses/:id        — delete
  GET    /expenses/categories — list categories
  POST   /expenses/categories — create category
  ```

#### Goals Module (`src/goals/`)
- **Endpoints**:
  ```
  GET    /goals               — list all goals
  POST   /goals               — create
  PATCH  /goals/:id           — update
  DELETE /goals/:id           — delete
  GET    /goals/:id/snapshots — historical balance snapshots
  ```
- Goal types: `recurringPeriod: null` (one-time), `'monthly'`, `'annual'`

#### Net Worth Module (`src/net-worth/`)
- **Endpoints**:
  ```
  GET /net-worth/summary    — current totals (totalAssets, totalLiabilities, netWorth)
  GET /net-worth/history    — monthly history from snapshot data
  GET /net-worth/projection — projected amortization forward to mortgage payoff
  ```

#### Import Module (`src/import/`)
- **Endpoints**:
  ```
  POST /import/revolut    — upload and parse Revolut CSV
  ```
- Parses Revolut CSV (comma-separated): validates required columns, filters COMPLETED transactions
- Auto-categorizes via ExpenseCategory keywords + MerchantCategoryMap
- Deduplicates by merchant + amount + date
- Creates new MerchantCategoryMap entries for unknown merchants
- Returns stats: `{ imported, expenses, income, skipped, newMappings }`

**`getHistory` logic**:
1. Collect all asset snapshots and liability snapshots, grouped by `YYYY-MM` month key
2. For each month from the earliest snapshot to now, carry forward the last known value for each asset/liability (no gaps)
3. Assets without any snapshots are included from `min(createdAt, earliestLiabilityMonth)` using their current `value` — prevents phantom NW drops when a new liability appears
4. Returns `{ month, netWorth, items: [{name, type, value, isLiability}] }[]`

**`getProjection` logic**:
1. For each liability, compute current balance by amortizing from `startDate` to today:
   - **Mortgage/loan**: standard amortization; balance floors at 0
   - **Leasing**: amortization from `originalValue - downPayment` down to `residualValue`; balance floors at residual
2. Project forward month by month, amortizing each liability
3. Liability projection lines cut off when balance ≤ 0.01 (or ≤ residual for leasing)
4. Returns `{ points: [{month, projectedNetWorth, liabilities: [{name, type, balance}]}], payoffMonth }`

**Private helpers**:
- `amortizeWithEvents()` — processes MortgageEvent[] month-by-month: refinance snaps balance, rate_change/payment_change update terms, extra_payment reduces principal
- `getEffectiveTerms()` — returns current rate/payment after applying all events up to a given date
- `amortizeMonth(balance, annualRate, monthlyPayment, floor)` — single month amortization step

**Frontend projection offset**: The first projection point is anchored to the last historical NW value so the chart line connects seamlessly:
```typescript
const projectionOffset = lastHistoricalNW - firstProjPoint.projectedNetWorth;
```

---

## Frontend Architecture

### Routing (Next.js App Router)

| Route | Status | Description |
|-------|--------|-------------|
| `/` | ✅ | Redirects to `/dashboard` |
| `/login`, `/register` | ✅ | Auth forms |
| `/invite/[token]` | ✅ | Public invite acceptance page |
| `/dashboard` | ✅ | Net worth summary, goal overview, recent expenses |
| `/assets` | ✅ | Asset cards; create/edit/delete; manual snapshot history modal |
| `/liabilities` | ✅ | Liability cards (type-specific); create/edit/delete |
| `/expenses` | ✅ | Expense list with categories |
| `/income` | ✅ | Income tracking |
| `/goals` | ✅ | Goal cards with progress bars; allocation plans |
| `/import` | ✅ | Revolut CSV upload with preview and auto-categorization |
| `/account` | ✅ | Household member management and invite system |
| `/documents` | 🚧 | Stub page |
| `/reports` | ✅ | Index page linking to sub-reports |
| `/reports/net-worth` | ✅ | Full implementation (see below) |
| `/reports/expense-budget` | ✅ | Category breakdown, trends, pie charts |
| `/reports/allocation-comparison` | 📋 | Stub |
| `/reports/goal-comparison` | 📋 | Stub |

### Net Worth Report (`/reports/net-worth`)

The most complex frontend page. Key implementation details:

**State**:
- `range` — history window: 1Y / 2Y / 3Y / All
- `showNetWorth`, `showNetWorthProjection`, `showLiabilityProjection` — toggle chart lines
- `projectionEndYear: number | null` — `null` = no projection, `currentYear` = clip at year end, else project forward

**Data merging**:
- `chartData` — historical points from `getHistory`
- `mergedData` — history + projection combined into a single Recharts-compatible `Record<string, unknown>[]`, keyed by `month`
- Projection points for each liability stored as `"${name} (projected)"` keys
- Liability projection lines only rendered while `balance > 0.01`

**Chart features**:
- `<ReferenceLine y={0} />` — horizontal zero line
- `<ReferenceLine x={todayMonth} />` — vertical "Today" marker
- `<ReferenceLine x={payoffMonth} />` — vertical "Payoff" marker (if mortgage will pay off within projection range)
- `key={projectionEndYear ?? 'none'}` on `ResponsiveContainer` forces full re-mount on year change (Recharts bug workaround)
- Y-axis domain computed only from visible series (respects toggle state)

### Internationalization (i18n)

Custom lightweight i18n system — no external libraries. Infrastructure in `apps/frontend/i18n/`.

**Architecture**:
- `LanguageProvider` (React Context) wraps the app in `providers.tsx` (outermost provider)
- `useTranslation()` hook returns `{ locale, setLocale, t }` for any client component
- Translation keys are flat with domain prefixes: `common.save`, `nav.dashboard`, `assets.form.name`
- `TranslationKey` type is derived from `en.json` keys — typos caught at compile time
- `{{var}}` interpolation: `t('dashboard.greeting', { name: 'Alex' })`
- Falls back to English for any missing key in the active locale

**Locale-aware formatting** (`lib/utils.ts`):
- `formatCurrency()` and `formatDate()` read `document.documentElement.lang` to pick the right `Intl` locale
- `LOCALE_MAP`: `en` -> `en-GB`, `bg` -> `bg-BG`

**What stays in English**:
- Recharts `dataKey` values (used as object property keys in chart data)
- `metadata.title` exports (server-side, browser tab only)
- Backend API error messages

**Adding languages**: See `docs/ADDING_LANGUAGES.md`

### React Query Hooks

| Hook | Query Key | Endpoint |
|------|-----------|----------|
| `useAssets()` | `['assets']` | `GET /assets` |
| `useCreateAsset()` | invalidates `['assets']`, `['net-worth']` | `POST /assets` |
| `useAssetSnapshots(id)` | `['assets', id, 'snapshots']` | `GET /assets/:id/snapshots` |
| `useLiabilities()` | `['liabilities']` | `GET /liabilities` |
| `useCreateLiability()` | invalidates `['liabilities']`, `['net-worth']` | `POST /liabilities` |
| `useUpdateLiability(id)` | invalidates above | `PATCH /liabilities/:id` |
| `useDeleteLiability()` | invalidates above | `DELETE /liabilities/:id` |
| `useExpenses(params)` | `['expenses', params]` | `GET /expenses` |
| `useGoals()` | `['goals']` | `GET /goals` |
| `useNetWorthSummary()` | `['net-worth', 'summary']` | `GET /net-worth/summary` |
| `useNetWorthHistory()` | `['net-worth', 'history']` | `GET /net-worth/history` |
| `useNetWorthProjection()` | `['net-worth', 'projection']` | `GET /net-worth/projection` |
| `useMonthlyReport(range)` | `['expenses', 'monthly-report', range]` | `GET /expenses/monthly-report` |
| `useHouseholdMembers()` | `['household', 'members']` | `GET /household/members` |
| `useHouseholdInvites()` | `['household', 'invites']` | `GET /household/invites` |
| `useCreateInvite()` | invalidates `['household', 'invites']` | `POST /household/invites` |
| `useRevokeInvite()` | invalidates `['household', 'invites']` | `DELETE /household/invites/:id` |

---

## Database Schema

Full Prisma schema (`apps/backend/prisma/schema.prisma`):

### Core Models

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hashed
  name      String?
  phone     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  memberships HouseholdMember[]
}

model Household {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  members   HouseholdMember[]
  invites   HouseholdInvite[]
  // ... all data-owning relations
}

model HouseholdMember {
  id          String @id @default(cuid())
  userId      String
  householdId String
  role        String @default("member") // 'owner' | 'member' | 'viewer'
  @@unique([userId, householdId])
}

model HouseholdInvite {
  id          String    @id @default(cuid())
  token       String    @unique
  householdId String
  createdById String
  role        String    @default("member")
  expiresAt   DateTime
  usedAt      DateTime?
  usedById    String?
}

model Asset {
  id          String   @id @default(cuid())
  householdId String
  userId      String   // audit trail
  type        String   // 'etf' | 'crypto' | 'gold' | 'apartment'
  name        String
  value       Float    // Current value
  quantity    Float?
  costBasis   Float?
  currency    String   @default("EUR")
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  snapshots   AssetSnapshot[]
}

model AssetSnapshot {
  id         String   @id @default(cuid())
  assetId    String
  value      Float
  price      Float?
  capturedAt DateTime @default(now())
}

model Liability {
  id          String   @id @default(cuid())
  householdId String
  userId      String   // audit trail
  type        String   // 'mortgage' | 'loan' | 'leasing'
  name      String
  value     Float    // Outstanding balance (what is owed)
  currency  String   @default("EUR")
  metadata  Json?    // type-specific: rates, payments, term, dates, events, residualValue, etc.
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  snapshots LiabilitySnapshot[]
}

model LiabilitySnapshot {
  id          String   @id @default(cuid())
  liabilityId String
  value       Float    // Outstanding balance at this point in time
  capturedAt  DateTime @default(now())
}
```

### Goals & Allocation

```prisma
model Goal {
  id              String    @id @default(cuid())
  householdId     String
  userId          String    // audit trail
  name            String
  targetAmount    Float
  targetDate      DateTime? // null for monthly recurring
  currentAmount   Float     @default(0)
  recurringPeriod String?   // null | 'monthly' | 'annual'
  priority        Int       @default(2) // 1=high 2=medium 3=low
  status          String    @default("active") // 'active'|'at_risk'|'completed'|'archived'
  description     String?
  category        String?
  snapshots       GoalSnapshot[]
  allocationItems AllocationPlanItem[]
  actualAllocations ActualAllocation[]
}

model GoalSnapshot {
  id                      String    @id @default(cuid())
  goalId                  String
  month                   DateTime  // YYYY-MM-01
  targetAmount            Float
  targetDate              DateTime?
  balanceAsOf             Float
  allocatedThisMonth      Float     @default(0)
  actualSavedThisMonth    Float     @default(0)
  projectedCompletionDate DateTime?
  onTrack                 Boolean   @default(true)
  @@unique([goalId, month])
}

model AllocationPlan {
  id            String   @id @default(cuid())
  householdId   String
  month         DateTime // YYYY-MM-01
  monthlyIncome Float
  status        String   @default("proposed") // 'proposed'|'approved'|'archived'
  items         AllocationPlanItem[]
  actualAllocations ActualAllocation[]
  @@unique([householdId, month])
}

model AllocationPlanItem {
  id     String @id @default(cuid())
  planId String
  goalId String
  amount Float
}

model ActualAllocation {
  id               String   @id @default(cuid())
  allocationPlanId String
  householdId      String
  goalId           String?
  categoryId       String?
  type             String   // 'goal' | 'category'
  month            DateTime
  plannedAmount    Float
  actualAmount     Float
  variance         Float    // actual - planned
  @@unique([householdId, goalId, month])
}
```

### Expenses

```prisma
model Expense {
  id          String   @id @default(cuid())
  householdId String
  userId      String   // audit trail
  amount      Float
  categoryId  String
  merchant    String?
  description String?
  date        DateTime
  source      String   @default("manual") // 'manual' | 'imported'
  documentId  String?
  createdAt   DateTime @default(now())
}

model ExpenseCategory {
  id         String  @id @default(cuid())
  householdId String
  name       String
  type       String  // 'income' | 'expense' | 'goal' | 'required'
  color      String?
  keywords   String[] // for auto-classification during import
  predefined Boolean @default(false)
  @@unique([householdId, name])
}

model MerchantCategoryMap {
  id          String @id @default(cuid())
  householdId String
  merchant    String
  categoryId  String
  @@unique([householdId, merchant])
}
```

### Documents & Tax (schema only — UI not yet built)

```prisma
model Document {
  id          String    @id @default(cuid())
  householdId String
  userId      String    // audit trail
  fileName    String
  fileType    String    // 'csv' | 'pdf'
  fileUrl     String
  parseStatus String    @default("pending")
  metadata    Json?
  uploadedAt  DateTime  @default(now())
  parsedAt    DateTime?
  transactions Transaction[]
  expenses     Expense[]
}

model Transaction { ... }

model TaxInfo {
  id                     String   @id @default(cuid())
  householdId            String
  taxYear                Int
  country                String
  annualSalary           Float?
  monthlyIncome          Float?
  stateSocialInsurance   Float?
  supplementaryPension   Float?
  healthInsurance        Float?
  incomeTaxRate          Float?
  recognizedExpensesRate Float?
  totalContributions     Float?
  taxableIncome          Float?
  totalTaxLiability      Float?
  taxPaidToDate          Float?
  taxRefundDue           Float?
  status                 String   @default("draft")
  @@unique([householdId, taxYear])
}
```

---

## Seed Script

**`apps/backend/prisma/seed.ts`** — run with `pnpm --filter backend db:seed`

Imports historical data for the seed user (`plamen@finances.local`):

| What | Source | Count |
|------|--------|-------|
| NN asset snapshots | `mind.csv` col [4] | 205 months (2019–2026) |
| Crypto snapshots | `mind.csv` col [5] | per data rows |
| ETF snapshots | `mind.csv` col [6] | per data rows |
| Gold snapshots | `mind.csv` col [13] | per data rows |
| Mortgage liability snapshots | `mind.csv` col [11] | per data rows |
| Apartment asset snapshots | Hardcoded | 4 (2020-02, 2022-12, 2025-11, 2026-03) |
| Car lease liability snapshots | `car-leasing.csv` | 24 (Apr 2024–Mar 2026) |
| Income/expense history | `mind.csv` cols [2],[3] | 270 records |
| Revolut transactions | `revolut-statements/statment.csv` | 472 expenses |
| Goals | Hardcoded | Emergency Fund + Baby Fund |
| Goal snapshots | `mind.csv` cols [14],[15] | 160 |

**Seed idempotency**:
- Assets/liabilities are upserted by `(userId, type, name)` — metadata preserved
- Snapshots for CSV-managed assets are deleted and re-imported on each seed run
- Apartment snapshots are explicitly re-seeded from hardcoded values (not wiped by CSV re-import)
- Manually created liabilities (other than Home Mortgage / Car Lease) are untouched

**CSV formats**:

`mind.csv` — comma-separated, header row, dates as `MM/DD/YYYY`, amounts with `€` prefix:
```
[0]=row, [1]=date, [2]=income, [3]=expenses, [4]=NN, [5]=crypto,
[6]=ETF, [7]=mortg_open, [8]=payment, [9]=principal, [10]=interest,
[11]=mortg_end, [12]=ipr, [13]=gold, [14]=emergency, [15]=baby, [16]=total
```

`car-leasing.csv` — semicolon-separated, header spans rows 1–6, dates as `DD.MM.YYYY`, amounts with space as thousand separator:
```
[0]=empty, [1]=№, [2]=date, [3]=start_bgn, [4]=start_eur,
[5]=principal_bgn, [6]=principal_eur, [7]=interest_bgn, [8]=interest_eur,
[9]=payment_bgn, [10]=payment_eur, [11]=remaining_bgn, [12]=remaining_eur, [13]=prepayment
```

---

## API Reference

All endpoints require `Authorization: Bearer <jwt>` except auth routes.
Base URL: `http://localhost:3001/api` (dev) — configured via `NEXT_PUBLIC_API_URL`.

### Auth
```
POST /auth/register   { name, email, password }  → { user, token }
                      (creates User + Household + HouseholdMember + default categories)
POST /auth/login      { email, password }         → { user, token }
                      (JWT includes householdId from first membership)
```

### Household
```
POST   /household/invites              { role }              → { invite }
GET    /household/invites                                    → [{ invite }]
DELETE /household/invites/:id                                → void
GET    /household/invites/:token/info                        → { invite, household } (public)
POST   /household/invites/:token/accept                      → { member }
GET    /household/members                                    → [{ member }]
PATCH  /household/members/:id/role     { role }              → { member }
DELETE /household/members/:id                                → void
```

### Assets
```
GET    /assets
POST   /assets              { type, name, value, currency?, quantity?, costBasis?, metadata? }
PATCH  /assets/:id          (partial update)
DELETE /assets/:id
GET    /assets/:id/snapshots
POST   /assets/:id/snapshots  { value, capturedAt? }
```

### Liabilities
```
GET    /liabilities
GET    /liabilities/history   → [{...liability, snapshots:[]}]
POST   /liabilities           { type, name, value, currency?, metadata? }
PATCH  /liabilities/:id       (partial update)
DELETE /liabilities/:id
```

### Expenses
```
GET    /expenses              ?month=YYYY-MM&categoryId=...
POST   /expenses              { amount, categoryId, date, merchant?, description?, source? }
PATCH  /expenses/:id
DELETE /expenses/:id
GET    /expenses/categories
POST   /expenses/categories   { name, type, color? }
```

### Goals
```
GET    /goals
POST   /goals                 { name, targetAmount, targetDate?, recurringPeriod?, priority?, category?, description? }
PATCH  /goals/:id
DELETE /goals/:id
GET    /goals/:id/snapshots
```

### Import
```
POST /import/revolut   (multipart CSV upload)
  → { imported, expenses, income, skipped, newMappings }
```

### Net Worth
```
GET /net-worth/summary
  → { totalAssets, totalLiabilities, netWorth }

GET /net-worth/history
  → [{ month: "YYYY-MM", netWorth, items: [{ name, type, value, isLiability }] }]

GET /net-worth/projection
  → { points: [{ month, projectedNetWorth, liabilities: [{ name, type, balance }] }], payoffMonth? }
```

---

## Deployment

`docker-compose.yml` provides local development services:

```yaml
services:
  postgres:   image: postgres:16-alpine, port 5432
  redis:      image: redis:7-alpine, port 6379
```

Environment variables (see `.env.example`):
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
NEXT_PUBLIC_API_URL=http://localhost:3001/api
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Development workflow**:
```bash
# Start infra
docker compose up -d

# Install dependencies
pnpm install

# Run migrations + seed
pnpm --filter backend db:migrate
pnpm --filter backend db:seed

# Start both apps in watch mode
pnpm dev
```

Backend runs on `:3001`, frontend on `:3000`.
