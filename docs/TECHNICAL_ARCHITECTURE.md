# Finances PWA App - Technical Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Repository Structure](#repository-structure)
3. [Technology Stack](#technology-stack)
4. [Backend Architecture](#backend-architecture)
   - [NestJS Application Bootstrap & Best Practices](#nestjs-application-bootstrap--best-practices)
5. [Frontend Architecture](#frontend-architecture)
   - [Next.js Application Bootstrap & Best Practices](#nextjs-application-bootstrap--best-practices)
6. [Database Design](#database-design)
7. [API Specification](#api-specification)
8. [Authentication & Security](#authentication--security)
9. [Automation & Jobs](#automation--jobs)
10. [Deployment](#deployment)
11. [Development Workflow](#development-workflow)

---

## System Overview

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser/Mobile)                  │
│                     Next.js PWA Frontend                      │
│  (Components, State Management, Service Worker, Offline)     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS REST API
                         │ (TanStack React Query)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (NestJS)                          │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  Auth    │ │  Users   │ │  Assets  │ │ Expenses │        │
│  │ (JWT)    │ │          │ │          │ │          │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  Goals   │ │ Documents│ │ Reports  │ │  Jobs    │        │
│  │          │ │ (Parsing)│ │          │ │ (Bull)   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                               │
│  Prisma ORM ◄────────────────────────────────────────        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  PostgreSQL (Primary Database) │
        │  - Users, Assets, Goals,       │
        │  - Expenses, Documents,        │
        │  - Snapshots, Transactions     │
        └────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│             Redis (Job State & Cache)             │
│  - Bull Queue (job scheduling)                   │
│  - Temporary cache (price data, etc.)            │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│         External Services & Data Sources          │
│  - Yahoo Finance API (ETF prices)                │
│  - CoinGecko API (Crypto prices)                 │
│  - Cloud Storage (S3/Google Cloud for files)     │
└──────────────────────────────────────────────────┘
```

### Key Principles
- **Modular Architecture**: Each feature is a self-contained NestJS module
- **Type Safety**: Full TypeScript across frontend and backend
- **Scalability**: Monorepo structure supports team growth
- **Separation of Concerns**: Backend handles logic, frontend handles presentation
- **Automation First**: Minimal manual data entry, maximum automation
- **Data Driven**: All decisions based on structured data

---

## Repository Structure

### Directory Layout
```
finances-app/
├── apps/
│   ├── backend/                          # NestJS Backend Application
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── guards/
│   │   │   │   │   └── jwt-auth.guard.ts
│   │   │   │   └── dto/
│   │   │   │       ├── register.dto.ts
│   │   │   │       └── login.dto.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── dto/
│   │   │   │       └── user.dto.ts
│   │   │   │
│   │   │   ├── assets/
│   │   │   │   ├── assets.module.ts
│   │   │   │   ├── assets.controller.ts
│   │   │   │   ├── assets.service.ts
│   │   │   │   ├── snapshot.service.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-asset.dto.ts
│   │   │   │       ├── asset.dto.ts
│   │   │   │       └── asset-snapshot.dto.ts
│   │   │   │
│   │   │   ├── expenses/
│   │   │   │   ├── expenses.module.ts
│   │   │   │   ├── expenses.controller.ts
│   │   │   │   ├── expenses.service.ts
│   │   │   │   ├── categories.service.ts
│   │   │   │   └── dto/
│   │   │   │       └── expense.dto.ts
│   │   │   │
│   │   │   ├── goals/
│   │   │   │   ├── goals.module.ts
│   │   │   │   ├── goals.controller.ts
│   │   │   │   ├── goals.service.ts
│   │   │   │   ├── allocation.service.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-goal.dto.ts
│   │   │   │       ├── goal.dto.ts
│   │   │   │       └── allocation-plan.dto.ts
│   │   │   │
│   │   │   ├── documents/
│   │   │   │   ├── documents.module.ts
│   │   │   │   ├── documents.controller.ts
│   │   │   │   ├── documents.service.ts
│   │   │   │   ├── parsers/
│   │   │   │   │   ├── revolut.parser.ts
│   │   │   │   │   └── parser.interface.ts
│   │   │   │   └── dto/
│   │   │   │       └── document.dto.ts
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── reports.module.ts
│   │   │   │   ├── reports.controller.ts
│   │   │   │   ├── net-worth.service.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   └── dto/
│   │   │   │       └── report.dto.ts
│   │   │   │
│   │   │   ├── jobs/
│   │   │   │   ├── jobs.module.ts
│   │   │   │   ├── job-scheduler.service.ts
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── monthly-price-update.job.ts
│   │   │   │   │   ├── asset-snapshot.job.ts
│   │   │   │   │   └── report-generation.job.ts
│   │   │   │   └── price-fetcher/
│   │   │   │       ├── crypto-price.fetcher.ts
│   │   │   │       └── etf-price.fetcher.ts
│   │   │   │
│   │   │   ├── migration/
│   │   │   │   ├── migration.module.ts
│   │   │   │   ├── migration.controller.ts
│   │   │   │   ├── data-migration.service.ts
│   │   │   │   ├── parsers/
│   │   │   │   │   ├── historical-finances.parser.ts
│   │   │   │   │   ├── historical-taxes.parser.ts
│   │   │   │   │   └── csv-validation.service.ts
│   │   │   │   ├── transformers/
│   │   │   │   │   ├── data-transformation.service.ts
│   │   │   │   │   ├── asset-snapshot.transformer.ts
│   │   │   │   │   ├── goal-snapshot.transformer.ts
│   │   │   │   │   ├── allocation-plan.transformer.ts
│   │   │   │   │   └── tax-info.transformer.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── excel-date.converter.ts
│   │   │   │   │   └── csv-reader.ts
│   │   │   │   └── dto/
│   │   │   │       ├── import-result.dto.ts
│   │   │   │       ├── import-error.dto.ts
│   │   │   │       └── import-progress.dto.ts
│   │   │   │
│   │   │   ├── database/
│   │   │   │   ├── prisma.service.ts
│   │   │   │   └── seeds/
│   │   │   │       └── seed.ts
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── middleware/
│   │   │   │   │   └── logging.middleware.ts
│   │   │   │   ├── exception-filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   └── public.decorator.ts
│   │   │   │   └── interceptors/
│   │   │   │       └── transform.interceptor.ts
│   │   │   │
│   │   │   ├── config/
│   │   │   │   ├── database.config.ts
│   │   │   │   ├── jwt.config.ts
│   │   │   │   └── redis.config.ts
│   │   │   │
│   │   │   └── app.module.ts
│   │   │   └── main.ts
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   │       └── [auto-generated migration files]
│   │   │
│   │   ├── test/
│   │   │   ├── auth.e2e-spec.ts
│   │   │   ├── assets.e2e-spec.ts
│   │   │   ├── goals.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── seed-test-data.ts
│   │   │
│   │   ├── .env.example
│   │   ├── .env.test
│   │   ├── .eslintrc.js
│   │   ├── jest.config.js
│   │   ├── tsconfig.json
│   │   ├── tsconfig.build.json
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── frontend/                         # Next.js Frontend Application
│       ├── app/
│       │   ├── layout.tsx                 # Root layout with providers
│       │   ├── page.tsx                   # Home page (redirects to /dashboard)
│       │   ├── (auth)/
│       │   │   ├── layout.tsx
│       │   │   ├── login/
│       │   │   │   └── page.tsx
│       │   │   └── register/
│       │   │       └── page.tsx
│       │   │
│       │   ├── (app)/
│       │   │   ├── layout.tsx             # App layout with sidebar
│       │   │   ├── dashboard/
│       │   │   │   └── page.tsx
│       │   │   ├── assets/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── [assetId]/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── components/
│       │   │   │       ├── asset-list.tsx
│       │   │   │       ├── asset-card.tsx
│       │   │   │       └── asset-details.tsx
│       │   │   │
│       │   │   ├── expenses/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── [month]/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── components/
│       │   │   │       ├── expense-list.tsx
│       │   │   │       └── category-breakdown.tsx
│       │   │   │
│       │   │   ├── goals/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── [goalId]/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── allocation/
│       │   │   │   │   └── page.tsx       # Allocation tool
│       │   │   │   └── components/
│       │   │   │       ├── goal-list.tsx
│       │   │   │       ├── goal-card.tsx
│       │   │   │       └── allocation-calculator.tsx
│       │   │   │
│       │   │   ├── reports/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── net-worth/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── assets/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── expenses/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── components/
│       │   │   │       ├── net-worth-chart.tsx
│       │   │   │       ├── asset-composition.tsx
│       │   │   │       └── expense-breakdown.tsx
│       │   │   │
│       │   │   ├── documents/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── upload/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── components/
│       │   │   │       ├── document-upload.tsx
│       │   │   │       ├── document-list.tsx
│       │   │   │       └── transaction-preview.tsx
│       │   │   │
│       │   │   └── account/
│       │   │       ├── page.tsx
│       │   │       └── components/
│       │   │           ├── profile-settings.tsx
│       │   │           └── password-change.tsx
│       │   │
│       │   └── api/
│       │       └── [frontend API routes if needed]
│       │
│       ├── components/
│       │   ├── common/
│       │   │   ├── header.tsx
│       │   │   ├── sidebar.tsx
│       │   │   ├── footer.tsx
│       │   │   ├── button.tsx
│       │   │   └── card.tsx
│       │   │
│       │   ├── charts/
│       │   │   ├── line-chart.tsx
│       │   │   ├── pie-chart.tsx
│       │   │   ├── bar-chart.tsx
│       │   │   └── chart-container.tsx
│       │   │
│       │   ├── modals/
│       │   │   ├── create-goal-modal.tsx
│       │   │   ├── edit-goal-modal.tsx
│       │   │   └── confirm-delete-modal.tsx
│       │   │
│       │   └── forms/
│       │       ├── login-form.tsx
│       │       ├── register-form.tsx
│       │       ├── create-goal-form.tsx
│       │       └── document-upload-form.tsx
│       │
│       ├── hooks/
│       │   ├── use-auth.ts
│       │   ├── use-assets.ts
│       │   ├── use-goals.ts
│       │   ├── use-expenses.ts
│       │   ├── use-reports.ts
│       │   └── use-debounce.ts
│       │
│       ├── lib/
│       │   ├── api-client.ts
│       │   ├── auth.ts
│       │   ├── storage.ts
│       │   ├── utils.ts
│       │   └── constants.ts
│       │
│       ├── providers/
│       │   ├── query-provider.tsx         # TanStack React Query
│       │   ├── auth-provider.tsx
│       │   └── theme-provider.tsx
│       │
│       ├── styles/
│       │   ├── globals.css
│       │   └── variables.css
│       │
│       ├── public/
│       │   ├── manifest.json              # PWA manifest
│       │   ├── service-worker.js          # Service worker
│       │   └── icons/
│       │       ├── icon-192x192.png
│       │       └── icon-512x512.png
│       │
│       ├── .env.example
│       ├── .env.local
│       ├── .eslintrc.json
│       ├── next.config.js                # PWA configuration
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       ├── package.json
│       ├── Dockerfile
│       └── postcss.config.js
│
├── packages/
│   └── @finances/shared/                 # Shared Types & Utilities
│       ├── src/
│       │   ├── types/
│       │   │   ├── user.types.ts
│       │   │   ├── asset.types.ts
│       │   │   ├── expense.types.ts
│       │   │   ├── goal.types.ts
│       │   │   ├── document.types.ts
│       │   │   ├── report.types.ts
│       │   │   └── common.types.ts
│       │   │
│       │   ├── dto/
│       │   │   ├── auth.dto.ts
│       │   │   ├── asset.dto.ts
│       │   │   ├── expense.dto.ts
│       │   │   ├── goal.dto.ts
│       │   │   └── document.dto.ts
│       │   │
│       │   ├── validators/
│       │   │   ├── asset.validator.ts
│       │   │   ├── goal.validator.ts
│       │   │   ├── document.validator.ts
│       │   │   └── schemas.ts              # Zod schemas
│       │   │
│       │   ├── utils/
│       │   │   ├── calculations.ts        # Financial calculations
│       │   │   ├── date-helpers.ts
│       │   │   ├── currency.ts
│       │   │   └── formatters.ts
│       │   │
│       │   ├── index.ts                   # Main export
│       │   └── constants.ts
│       │
│       ├── tsconfig.json
│       ├── package.json
│       └── README.md
│
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml                         # Lint, test, build on PR
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── pnpm-workspace.yaml
├── turbo.json                             # Turborepo configuration
├── package.json                           # Root package
├── tsconfig.base.json
├── .env.example
└── README.md

```

---

## Technology Stack

### Core Technologies
| Layer | Tech | Purpose | Version |
|-------|------|---------|---------|
| **Package Manager** | pnpm | Fast, reliable package management | 8.0+ |
| **Monorepo** | Turborepo | Build orchestration, caching | 1.10+ |
| **Frontend Framework** | Next.js | React-based web framework with SSR/SSG | 14.0+ |
| **Frontend UI** | React + Tailwind CSS | Component framework + utility CSS | 18.0+ / 3.3+ |
| **Backend Framework** | NestJS | Modular, TypeScript-first framework | 10.0+ |
| **Language** | TypeScript | Type-safe JavaScript | 5.0+ |
| **Database** | PostgreSQL | Reliable relational database | 14+ |
| **ORM** | Prisma | Type-safe database client | 5.0+ |
| **Job Queue** | Bull | Redis-backed job queuing | 4.0+ |
| **Cache/Store** | Redis | In-memory data store | 7.0+ |
| **Authentication** | JWT | JSON Web Tokens | - |
| **Validation** | Zod | Schema validation | 3.0+ |
| **Data Fetching** | TanStack React Query | Server state management | 5.0+ |
| **Forms** | React Hook Form | Flexible form handling | 7.0+ |
| **Charts** | Recharts | React-based charting | 2.5+ |
| **Testing** | Jest + Testing Library | Unit, integration testing | 29.0+ / 14.0+ |
| **API** | REST | Stateless architecture | - |
| **PWA** | Workbox | Service worker tooling | 7.0+ |
| **HTTP Client** | Axios | Promise-based HTTP client | 1.4+ |

### Development Tools
| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Husky | Git hooks |
| Lint-staged | Pre-commit checks |
| Docker | Containerization |
| GitHub Actions | CI/CD |
| Sentry | Error tracking |

---

## Backend Architecture

### NestJS Modules Breakdown

#### 1. **Auth Module**
**Responsibility**: User authentication and JWT token management

**Key Components**:
- `AuthController`: Handles `/api/auth/*` endpoints
- `AuthService`: Business logic for registration, login, token refresh
- `JwtStrategy`: Passport strategy for JWT validation
- `JwtAuthGuard`: Route guard for protected endpoints

**Key Features**:
- Email/password registration
- Email/password login
- JWT token generation (exp: 7 days)
- Refresh token rotation
- Password hashing (bcrypt, rounds: 10)
- Rate limiting (5 attempts, 15 min lockout)

**Database Interactions**:
- Create `User` record
- Validate credentials
- Update last login timestamp

**API Endpoints**:
```
POST   /api/auth/register    - Create new account
POST   /api/auth/login       - Get JWT tokens
POST   /api/auth/refresh     - Refresh expired token
POST   /api/auth/logout      - Invalidate token
```

#### 2. **Users Module**
**Responsibility**: User profile management and settings

**Key Components**:
- `UsersController`: User profile endpoints
- `UsersService`: User data retrieval and updates

**Key Features**:
- Get 'current user' profile
- Update profile info (name, email, etc.)
- Get user preferences
- Two-user account linking (user + spouse)

**API Endpoints**:
```
GET    /api/users/me         - Get current user profile
PATCH  /api/users/me         - Update profile
GET    /api/users/preferences - Get user preferences
PATCH  /api/users/preferences - Update preferences
POST   /api/users/link-account - Link spouse account (future)
```

#### 3. **Assets Module**
**Responsibility**: Management and tracking of all financial assets

**Key Components**:
- `AssetsController`: Asset endpoints
- `AssetsService`: CRUD operations for assets
- `AssetSnapshotService`: Historical snapshots and calculations

**Key Features**:
- Create, read, update, delete assets
- Support multiple asset types: mortgage, ETF, crypto, physical gold
- Asset price tracking
- Monthly snapshots for historical analysis
- Net worth calculation

**Database Models**:
- `Asset`: {id, user_id, type, name, value, quantity, cost_basis, metadata}
- `AssetSnapshot`: {id, asset_id, value, price, captured_at}

**API Endpoints**:
```
GET    /api/assets           - List all user assets
POST   /api/assets           - Create asset
GET    /api/assets/:id       - Get asset details
PATCH  /api/assets/:id       - Update asset
DELETE /api/assets/:id       - Delete asset
GET    /api/assets/snapshots - Historical snapshots
GET    /api/assets/net-worth - Calculate net worth
```

#### 4. **Expenses Module**
**Responsibility**: Track and categorize monthly expenses

**Key Components**:
- `ExpensesController`: Expense endpoints
- `ExpensesService`: Expense CRUD and calculations
- `CategoriesService`: Category management

**Key Features**:
- Create, read, update, delete expenses
- Predefined + custom categories
- Monthly summaries and aggregations
- Category-based analytics
- Import from document parsing results

**Database Models**:
- `Expense`: {id, user_id, amount, category_id, date, description}
- `ExpenseCategory`: {id, user_id, name, type, color, predefined}

**API Endpoints**:
```
GET    /api/expenses         - List expenses (filterable by month/category)
POST   /api/expenses         - Create expense
PATCH  /api/expenses/:id     - Update expense
DELETE /api/expenses/:id     - Delete expense
GET    /api/expenses/summary - Monthly summary
GET    /api/expenses/categories - List categories
POST   /api/expenses/categories - Create custom category
```

#### 5. **Goals Module**
**Responsibility**: Goal planning and smart allocation calculations

**Key Components**:
- `GoalsController`: Goal endpoints
- `GoalsService`: Goal CRUD and state management
- `AllocationService`: Smart allocation calculations

**Key Features**:
- Create goals with target amount and deadline
- Calculate required monthly allocation
- Smart allocation algorithm (distributes income across goals and required expenses)
- Goal status tracking (active, at_risk, completed, archived)
- Mark goals as completed when target reached
- Archive goals when no longer needed
- Create and manage recurring monthly required expenses
- Allocation plan history

**Unified Goal Model** — everything is a Goal, differentiated by `recurringPeriod`:

| recurringPeriod | Description | Examples |
|---|---|---|
| `null` (one-time) | Save toward a target by a deadline | Baby fund €7k by Sep 2026, Travel fund, Car down payment, Life goals (5-10 year horizon) |
| `'annual'` | Lump-sum due once a year — saves up monthly, resets automatically after completion | Yearly car insurance, Car registration, Annual tax payment |
| `'monthly'` | Fixed obligation paid every month — amount reserved each month, no accumulation | Mortgage payment €1200/month, Utilities, Car loan payment |

**Key behaviors by type**:
- `monthly` goals: reserved first in allocation (fixed commitment), no deadline, no progress tracking
- `annual` goals: monthly savings calculated = targetAmount / monthsUntilTargetDate, auto-creates new goal for next year on completion
- `one-time` goals: monthly savings calculated = (targetAmount - currentAmount) / monthsRemaining, supports deadlines years in the future

**Smart Allocation order**:
1. Reserve monthly goal amounts first (fixed, non-negotiable)
2. Calculate monthly savings needed for annual and one-time goals to meet deadlines
3. Distribute any surplus based on priority

**Database Models**:
- `Goal`: {id, user_id, name, target_amount, target_date, current_amount, recurring_period: null|'monthly'|'annual', status: 'active'|'at_risk'|'completed'|'archived'}
- `AllocationPlan`: {id, user_id, month, income, allocations[]}

**Allocation Algorithm**:
```typescript
// Pseudocode
function calculateAllocation(goals, income, requiredExpenses) {
  const totalRequired = requiredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const availableForGoals = income - totalRequired;

  if (availableForGoals < 0) {
    throw new Error("Over-committed scenario");
  }

  const sortedGoals = goals.sort((a, b) => a.priority - b.priority);
  const allocation = [];
  let remaining = availableForGoals;

  for (const goal of sortedGoals) {
    const monthsRemaining = calculateMonthsBetween(new Date(), goal.deadline);
    const required = (goal.targetAmount - goal.currentAmount) / monthsRemaining;
    const allocated = Math.min(required, remaining);
    allocation.push({ goal, amount: allocated });
    remaining -= allocated;
  }

  return allocation;
}
```

**API Endpoints**:
```
Goals Management:
GET    /api/goals                           - List all goals (filter: status, recurringPeriod)
GET    /api/goals?recurringPeriod=monthly   - List monthly recurring expenses
GET    /api/goals?recurringPeriod=annual    - List annual obligation goals
GET    /api/goals?recurringPeriod=null      - List one-time savings goals
POST   /api/goals                           - Create new goal (any type)
GET    /api/goals/:id                       - Get goal details with snapshots
PATCH  /api/goals/:id                       - Update goal (name, target, deadline, priority)
PATCH  /api/goals/:id/status                - Update goal status (active → completed → archived)
DELETE /api/goals/:id                       - Delete goal

Smart Allocation:
POST   /api/goals/allocate             - Calculate optimal allocation plan
GET    /api/goals/allocation           - Get current allocation plan
GET    /api/goals/allocation/:month    - Get allocation plan for specific month

Status Values:
Goals: 'active' (ongoing), 'at_risk' (won't meet deadline), 'completed' (reached target), 'archived' (inactive)
Note: 'monthly' goals do not use status tracking (always active until deleted)
```

#### 6. **Documents Module**
**Responsibility**: File upload and parsing

**Key Components**:
- `DocumentsController`: Document endpoints
- `DocumentsService`: Document metadata management
- `ParserFactory`: Factory pattern for selecting appropriate parser
- `RevolutParser`: CSV parser for Revolut statements

**Key Features**:
- File upload handling (CSV, PDF in future)
- Document parsing pipeline
- Transaction extraction and categorization
- Duplicate detection
- Parser extensibility

**Database Models**:
- `Document`: {id, user_id, file_name, file_type, parse_status, metadata}
- `Transaction`: {id, document_id, amount, merchant, category_id, date}

**Supported Parsers**:
```typescript
interface IParser {
  canParse(file: File): boolean;
  parse(file: Buffer): Promise<ParsedTransaction[]>;
}

class RevolutParser implements IParser {
  // Parses Revolut CSV format
  // Extracts: date, amount, currency, merchant, category
}
```

**API Endpoints**:
```
POST   /api/documents        - Upload document
GET    /api/documents        - List documents
GET    /api/documents/:id    - Get document details
DELETE /api/documents/:id    - Delete document
GET    /api/documents/:id/transactions - View extracted transactions
```

#### 7. **Reports Module**
**Responsibility**: Financial analytics and reporting

**Key Components**:
- `ReportsController`: Report endpoints
- `NetWorthService`: Net worth calculations
- `AnalyticsService`: Trend analysis and metrics
- `ComparisonService`: Planned vs Actual comparison calculations

**Key Features**:
- Net worth calculation and trends
- Asset composition analysis
- Expense analysis
- Goal progress reporting
- Income allocation visualization
- **Planned vs Actual Comparisons** (NEW)

**API Endpoints**:
```
GET    /api/reports/net-worth       - Net worth over time
GET    /api/reports/composition     - Asset composition
GET    /api/reports/expenses        - Expense analysis
GET    /api/reports/goals           - Goal progress
GET    /api/reports/allocation      - Income allocation

Planned vs Actual Comparison:
GET    /api/reports/allocation-comparison?from=&to=       - Planned vs actual allocations (all goals/categories)
GET    /api/reports/goal-comparison/:goalId?from=&to=     - Goal-specific planned vs actual progress
GET    /api/reports/deadline-status                       - Goal deadline tracking vs projected dates
GET    /api/reports/category-comparison/:categoryId?from=&to= - Category expense tracking
```

**Planned vs Actual Comparison Implementation**:

**ComparisonService** calculates comparisons by:

1. **Monthly Allocation Comparison**:
   - Fetches `AllocationPlan` for each month
   - Calculates actual allocations from `Expense` records grouped by goal/category
   - Creates/updates `ActualAllocation` records with variance

```typescript
async getAllocationComparison(userId: string, from: Date, to: Date) {
  // Get allocation plans
  const plans = await this.prisma.allocationPlan.findMany({
    where: { userId, month: { gte: from, lte: to } }
  });

  // For each plan month, calculate actuals from expenses
  const comparisons = [];
  for (const plan of plans) {
    const monthStart = plan.month;
    const monthEnd = new Date(monthStart.getMonth() === 11
      ? new Date(monthStart.getFullYear() + 1, 0, 1)
      : new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1));

    // Group expenses by goal/category for this month
    const expenses = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        date: { gte: monthStart, lt: monthEnd }
      },
      _sum: { amount: true }
    });

    // Compare to planned
    for (const item of plan.items) {
      const actual = expenses.find(e => e.categoryId === item.categoryId)?._sum.amount || 0;
      const variance = actual - item.amount;

      comparisons.push({
        month: monthStart,
        planned: item.amount,
        actual,
        variance
      });
    }
  }

  return comparisons;
}
```

2. **Goal Progress Comparison**:
   - Creates/updates `GoalSnapshot` monthly
   - Tracks: planned vs actual accumulated savings, projected vs target deadline

```typescript
async createMonthlyGoalSnapshot(goalId: string) {
  const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
  const currentMonth = new Date();

  // Sum all actual allocations up to now
  const actualSaved = await this.prisma.actualAllocation.aggregate({
    where: { goalId, month: { lt: new Date() } },
    _sum: { actualAmount: true }
  });

  // Calculate monthly average to project completion
  const monthsSoFar = calculateMonthsBetween(goal.createdAt, currentMonth);
  const monthlyRate = (actualSaved._sum.actualAmount || 0) / monthsSoFar;
  const monthsRemaining = (goal.targetAmount - (actualSaved._sum.actualAmount || 0)) / monthlyRate;
  const projectedDate = addMonths(currentMonth, monthsRemaining);

  const snapshot = await this.prisma.goalSnapshot.create({
    data: {
      goalId,
      month: currentMonth,
      targetAmount: goal.targetAmount,
      targetDate: goal.targetDate,
      balanceAsOf: actualSaved._sum.actualAmount || 0,
      projectedCompletionDate: projectedDate,
      onTrack: projectedDate <= goal.targetDate
    }
  });

  return snapshot;
}
```

3. **Deadline Status**:
   - Retrieves `GoalSnapshot` records
   - Calculates days ahead/behind
   - Returns projected vs target deadlines

**Frontend Components for Comparisons**:
- `AllocationComparisonChart` - Dual line chart (planned vs actual)
- `GoalProgressChart` - Goal-specific dual line chart
- `DeadlineStatusTable` - Table of goals with deadline indicators
- `CategoryComparisonChart` - Category expense tracking

**Data Refresh Logic**:
- On 1st of month: Create snapshots from allocation plans
- On expense import: Update `ActualAllocation` records
- On goal update: Recalculate "on_track" status

#### 8. **Jobs Module** (Bull Queue)
**Responsibility**: Scheduled background jobs and automation

**Key Components**:
- `JobSchedulerService`: Register and manage jobs
- Individual job handlers (monthly-price-update, asset-snapshot, etc.)
- `CryptoPriceFetcher`: Fetch prices from CoinGecko API
- `EtfPriceFetcher`: Fetch prices from Yahoo Finance API

**Key Jobs**:

**a) Monthly Price Update**
- **Trigger**: 1st of every month, 2:00 AM UTC
- **Action**:
  - Fetch latest ETF prices (Yahoo Finance)
  - Fetch latest crypto prices (CoinGecko)
  - Fetch gold price reference (manual or API)
  - Update asset values in database
  - Create AssetSnapshot records
  - Trigger notifications (optional)

**b) Asset Snapshot**
- **Trigger**: Daily at 2:00 AM UTC
- **Action**:
  - Create snapshots of all assets with current values
  - Used for historical trending

**c) Report Generation**
- **Trigger**: 2nd of every month
- **Action**:
  - Generate monthly report data
  - Create report summary for dashboard

**Configuration**:
```typescript
// In job-scheduler.service.ts
this.queue.add(
  'monthly-price-update',
  {},
  {
    cronSpecification: '0 2 1 * *', // 1st of month, 2 AM UTC
    removeOnComplete: { age: 3600 },
  }
);
```

#### 9. **Data Migration Module**
**Responsibility**: Import and parse historical financial data from CSV files

**Key Components**:
- `DataMigrationService`: Orchestrates the import process
- `HistoricalCsvParser`: Parses historical finances CSV format
- `TaxInfoParser`: Parses tax information CSV format
- `CsvValidationService`: Validates CSV structure and data integrity
- `DataTransformationService`: Converts CSV format to Prisma models

**Key Features**:
- CSV parsing with validation
- Excel date conversion (serial format → JavaScript Date)
- Batch database inserts for performance
- Data transformation and mapping
- Source tracking (flag imports as 'historical')
- Error handling and reporting
- Duplicate detection
- Transaction rollback on failure

**Supported Import Formats**:

**a) Historical Finances CSV**
- Input: mind.xlsx → extracted as historical-finances.csv
- Columns: month, income, fixed expenses, NN, crypto, ETF, mortgage, payment, principal, interest, ending balance, interest/principal, gold, emergency fund, baby fund, total investments
- Mapping:
  - `month` (Excel serial) → convert to Date
  - `NN` values → AssetSnapshot (Asset: type='etf', name='NN') — NN is a pension/investment fund, treated as ETF
  - `ETF` values → AssetSnapshot (Asset: type='etf', name='ETF')
  - `crypto` values → AssetSnapshot (Asset: type='crypto')
  - `gold` → AssetSnapshot (Asset: type='gold')
  - `mortgage` → `ending balance` column only → AssetSnapshot (Asset: type='mortgage') — only the remaining balance matters
  - `emergency fund` monthly values → GoalSnapshot (Goal: name='Emergency Fund', targetAmount=15000, recurringPeriod=null, status='active')
  - `baby fund` monthly values → GoalSnapshot (Goal: name='Baby Fund', targetAmount=7000, recurringPeriod=null)
  - `income` → AllocationPlan.monthlyIncome
  - `fixed expenses` → AllocationPlanItem for a 'monthly' recurring goal named 'Fixed Expenses' (aggregate — no breakdown in historical data)
  - `total investments` — calculated column, skip (not imported)
  - `payment`, `principal`, `interest`, `interest/principal` — skip (mortgage detail not needed)

- **Row skipping**: Skip rows where NN, crypto, ETF, gold, emergency fund, and baby fund are all empty — these are pre-tracking months with no investment/goal data (early rows ~2015–2018)

**b) Historical Taxes CSV**
- Input: mind.xlsx → extracted as historical-taxes.csv
- Columns: (Bulgarian tax structure with rates and calculations)
- Mapping:
  - Annual salary → TaxInfo.annualSalary
  - Tax rates (ДОО, ДЗПО, ЗО, ДДФЛ) → TaxInfo.stateSocialInsurance, etc.
  - Calculated values → TaxInfo totals

**Database Operations**:
```typescript
// Flow: CSV → Validation → Transformation → Database Insert

// 1. Create/Update Assets first
const mortgageAsset = await prisma.asset.create({
  data: { userId, type: 'mortgage', name: 'Mortgage', ... }
});

// 2. Bulk insert AssetSnapshots (monthly values)
await prisma.assetSnapshot.createMany({
  data: [
    { assetId: mortgageAsset.id, month: new Date('2015-01-01'), value: 200000 },
    { assetId: mortgageAsset.id, month: new Date('2015-02-01'), value: 199950 },
    // ... 928 more records
  ]
});

// 3. Create Goals with historical snapshots
const emergencyGoal = await prisma.goal.create({
  data: { userId, name: 'Emergency Fund', targetAmount: 15000, ... }
});

// 4. Insert historical GoalSnapshots
await prisma.goalSnapshot.createMany({
  data: [
    { goalId: emergencyGoal.id, month: new Date('2015-01-01'), balanceAsOf: 500, ... },
    { goalId: emergencyGoal.id, month: new Date('2015-02-01'), balanceAsOf: 1000, ... },
    // ... monthly progress
  ]
});

// 5. Create AllocationPlans with inferred allocations
for (const row of csvRows) {
  const plan = await prisma.allocationPlan.create({
    data: {
      userId,
      month: excelToDate(row.month),
      monthlyIncome: row.income
    }
  });

  // Fixed expenses allocation — linked to a 'monthly' recurring goal
  await prisma.allocationPlanItem.create({
    data: {
      planId: plan.id,
      goalId: fixedExpensesGoal.id, // monthly recurring goal, created once before import
      amount: row.fixed_expenses,
    }
  });

  // Inferred goal allocations from monthly delta
  const emergencyDelta = row.emergency_fund - previousRow.emergency_fund;
  if (emergencyDelta > 0) {
    await prisma.allocationPlanItem.create({
      data: {
        planId: plan.id,
        type: 'goal',
        goalId: emergencyGoal.id,
        amount: emergencyDelta
      }
    });
  }
}

// 6. Create TaxInfo records
await prisma.taxInfo.create({
  data: {
    userId,
    taxYear: 2025,
    country: 'Bulgaria',
    annualSalary: 96000,
    stateSocialInsurance: 0.183,
    supplementaryPension: 0.05,
    healthInsurance: 0.08,
    incomeTaxRate: 0.10,
    recognizedExpensesRate: 0.25,
    status: 'draft'
  }
});
```

**Excel Date Conversion**:
```typescript
// Convert Excel serial date to JavaScript Date
function excelSerialToDate(serial: number): Date {
  // Excel date system starts at 1899-12-30
  const baseDate = new Date(1899, 11, 30); // December 30, 1899
  const dayCount = Math.floor(serial);
  const date = new Date(baseDate);
  date.setDate(date.getDate() + dayCount);
  return date;
}

// Example: 42005 → January 1, 2015
```

**Error Handling & Validation**:
```typescript
interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: ImportError[];
  warnings: string[];
  duration: number; // milliseconds
}

interface ImportError {
  rowNumber: number;
  field: string;
  value: string;
  reason: string;
}

// Validation checks:
// - Required columns present
// - Date format valid
// - Numeric values parseable
// - No duplicate months for same asset
// - Foreign key references exist (userId, assetId, goalId)
```

**API Endpoints** (Admin/User only):
```
POST   /api/admin/import/historical-finances  - Import historical finances CSV
POST   /api/admin/import/historical-taxes      - Import tax information CSV
GET    /api/admin/import/progress/:importId     - Check import status
GET    /api/admin/import/report/:importId       - Get detailed import report
```

**Considerations**:
- Batch size: 1000 records per insert to balance memory vs. speed
- Transaction: Wrap entire import in transaction, rollback on failure
- Deduplication: Check for existing AssetSnapshot before insert
- Source tracking: Add `source: 'historical'` flag to distinguish from real-time data
- Archival: Store original CSV in Document table for audit trail
- Performance: Use `createMany` for bulk inserts, not individual creates

### NestJS Application Bootstrap & Best Practices

The following patterns follow official NestJS documentation recommendations and are applied consistently across the backend.

#### Application Bootstrap (`main.ts`)

```typescript
import { NestFactory } from '@nestjs/core';
import { VersioningType, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: [process.env.FRONTEND_URL, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // URI versioning — routes become /v1/goals, /v2/goals, etc.
  app.enableVersioning({ type: VersioningType.URI });

  // Global validation pipe — enforced on all incoming requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Strip properties not in DTO
      forbidNonWhitelisted: true,   // Throw 400 on unknown properties
      transform: true,              // Auto-transform payloads to DTO class instances
      disableErrorMessages: false,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

#### Controller Versioning

```typescript
// Default version for all routes in this controller
@Controller({ path: 'goals', version: '1' })
export class GoalsController {}

// Override version for a specific route
@Version('2')
@Get()
findAllV2() {}

// Version-neutral (served regardless of version prefix)
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {}
```

#### Configuration (`ConfigModule` with Joi validation)

**`app.module.ts`** — global config available everywhere via `ConfigService`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,          // No need to re-import in other modules
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().port().default(3001),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRATION: Joi.string().default('7d'),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
      }),
      load: [databaseConfig, jwtConfig, redisConfig],
    }),
  ],
})
export class AppModule {}
```

**Namespaced config with `registerAs()`** — group related env vars under a namespace:

```typescript
// config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

// config/jwt.config.ts
export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiration: process.env.JWT_EXPIRATION ?? '7d',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? '30d',
}));

// config/redis.config.ts
export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) ?? 6379,
  password: process.env.REDIS_PASSWORD,
}));
```

**Injecting namespaced config** in a service:

```typescript
import { ConfigType } from '@nestjs/config';
import { Inject, Injectable } from '@nestjs/common';
import jwtConfig from '../config/jwt.config';

@Injectable()
export class AuthService {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  getSecret() {
    return this.jwtConfiguration.secret; // fully typed
  }
}
```

#### DTO Validation Pattern (`class-validator` + `class-transformer`)

Every API endpoint uses a DTO class decorated with `class-validator` decorators. The global `ValidationPipe` (with `transform: true`) automatically validates and transforms incoming JSON to these typed objects.

```typescript
// goals/dto/create-goal.dto.ts
import {
  IsString, IsNumber, IsOptional, IsDateString,
  IsIn, Min, MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateGoalDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNumber()
  @Min(1)
  targetAmount: number;

  @IsOptional()
  @IsDateString()
  targetDate?: string;           // null for monthly recurring goals

  @IsOptional()
  @IsIn([null, 'monthly', 'annual'])
  recurringPeriod?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  priority?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
```

#### Dynamic Modules Pattern (`ConfigurableModuleBuilder`)

For reusable modules that accept options (e.g., a custom `PrismaModule`), use `ConfigurableModuleBuilder` to generate `forRoot`/`forRootAsync` methods automatically:

```typescript
// prisma/prisma.module-definition.ts
import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface PrismaModuleOptions {
  url: string;
  logQueries?: boolean;
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<PrismaModuleOptions>()
    .setClassMethodName('forRoot')   // exposes PrismaModule.forRoot() and forRootAsync()
    .build();

// prisma/prisma.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ConfigurableModuleClass } from './prisma.module-definition';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule extends ConfigurableModuleClass {}

// Consuming module (app.module.ts)
PrismaModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    url: config.get('DATABASE_URL'),
    logQueries: config.get('NODE_ENV') === 'development',
  }),
})
```

---

## Frontend Architecture

### Next.js Application Bootstrap & Best Practices

The following patterns follow official Next.js App Router documentation recommendations.

#### Root Layout (`app/layout.tsx`)

The root layout is **required** and must contain `<html>` and `<body>` tags. All providers are registered here as Client Components wrapping the server-rendered tree.

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/providers/providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | Finances',
    default: 'Finances - Personal Finance Manager',
  },
  description: 'Track mortgages, investments, expenses, and financial goals',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

#### Providers Pattern

React Context and TanStack Query providers **must be Client Components** — they cannot run in Server Components. The recommended pattern is a single `<Providers>` wrapper imported into the root layout:

```tsx
// providers/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { AuthProvider } from './auth-provider'
import { ThemeProvider } from './theme-provider'

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance per component mount (stable via useState)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,       // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

#### Server Components vs Client Components

By default, all files in `app/` are **Server Components** — they can fetch data directly, use secrets, and reduce JS bundle size. Add `'use client'` only when a component needs:

| Need | Use |
|------|-----|
| `useState`, `useEffect`, event handlers | Client Component (`'use client'`) |
| Browser APIs (`window`, `localStorage`) | Client Component |
| TanStack Query hooks (`useQuery`, `useMutation`) | Client Component |
| Database/API fetching, secrets, auth checks | Server Component (default) |
| Static/dynamic page data | Server Component (default) |

**Key rule**: push `'use client'` as deep into the component tree as possible — keep layouts and pages as Server Components.

```tsx
// app/(app)/goals/page.tsx — Server Component (default)
import { verifySession } from '@/lib/auth/dal'
import { GoalsList } from './components/goals-list'  // client component

export default async function GoalsPage() {
  const session = await verifySession()  // auth check on server
  const goals = await getGoals(session.userId)  // direct DB/API call on server

  return <GoalsList initialData={goals} />  // pass data as props to client
}
```

```tsx
// app/(app)/goals/components/goals-list.tsx — Client Component
'use client'

import { useGoals } from '@/hooks/use-goals'

export function GoalsList({ initialData }) {
  const { data: goals } = useGoals({ initialData })  // TanStack Query for mutations
  // interactive logic, modals, useState, etc.
}
```

#### Authentication — Middleware + DAL Pattern

**Middleware** (`middleware.ts` at project root) performs fast, optimistic route protection by reading the session cookie — no database calls:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/auth/session'

const protectedRoutes = ['/dashboard', '/assets', '/goals', '/reports', '/documents', '/account']
const publicRoutes = ['/login', '/register', '/']

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(r => path.startsWith(r))
  const isPublicRoute = publicRoutes.includes(path)

  const cookie = req.cookies.get('session')?.value
  const session = await decrypt(cookie)

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
```

**Data Access Layer (DAL)** (`lib/auth/dal.ts`) — centralized auth check for Server Components and Server Actions. Uses `React.cache` to memoize within a single render pass (no duplicate cookie reads):

```typescript
// lib/auth/dal.ts
import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/auth/session'

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  if (!session?.userId) {
    redirect('/login')
  }

  return { isAuth: true, userId: session.userId as string }
})
```

**Session management** (`lib/auth/session.ts`) — JWT signed with `jose`, stored as an `httpOnly` cookie:

```typescript
// lib/auth/session.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const key = new TextEncoder().encode(process.env.SESSION_SECRET)

export async function encrypt(payload: { userId: string; expiresAt: Date }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

export async function decrypt(token?: string) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    return payload
  } catch {
    return null
  }
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, expiresAt })
  ;(await cookies()).set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  (await cookies()).delete('session')
}
```

#### Form Validation Pattern (React Hook Form + Zod)

```tsx
// components/forms/create-goal-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateGoal } from '@/hooks/use-goals'

const createGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  targetAmount: z.number({ coerce: true }).positive('Must be positive'),
  targetDate: z.string().optional(),
  recurringPeriod: z.enum(['monthly', 'annual']).nullable().optional(),
  priority: z.number({ coerce: true }).int().min(1).max(3).default(2),
  description: z.string().optional(),
})

type CreateGoalFormData = z.infer<typeof createGoalSchema>

export function CreateGoalForm({ onSuccess }: { onSuccess?: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateGoalFormData>({
    resolver: zodResolver(createGoalSchema),
  })

  const createGoal = useCreateGoal()

  const onSubmit = async (data: CreateGoalFormData) => {
    await createGoal.mutateAsync(data)
    reset()
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} placeholder="Goal name" />
      {errors.name && <p className="text-red-500">{errors.name.message}</p>}

      <input {...register('targetAmount')} type="number" placeholder="Target amount" />
      {errors.targetAmount && <p className="text-red-500">{errors.targetAmount.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Create Goal'}
      </button>
    </form>
  )
}
```

#### Metadata API

Use the static `metadata` export in layouts/pages for SEO. The root layout defines a `template` so each page only needs to export a short title:

```tsx
// app/(app)/goals/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Goals',   // rendered as "Goals | Finances" from root layout template
  description: 'Track your financial goals and allocation plans',
}
```

Place `favicon.ico` and `opengraph-image.png` directly in `app/` — Next.js picks them up automatically with no config needed.

#### Path Aliases (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

Enables clean imports from anywhere: `import { Button } from '@/components/ui/button'`

#### Environment Variables

- `NEXT_PUBLIC_*` prefix — included in the client JS bundle (safe for API base URL, app name)
- No prefix — server-only, never sent to the browser
- Use the `server-only` package to enforce server-side modules at build time:

```typescript
// lib/api-client.ts — safe, uses public env var
const API_URL = process.env.NEXT_PUBLIC_API_URL

// lib/auth/session.ts — must stay server-only
import 'server-only'
const SESSION_SECRET = process.env.SESSION_SECRET  // compile-time error if imported in a Client Component
```

---

### Next.js & React Structure

#### Core Pages/Layouts

**Root Layout** (`app/layout.tsx`):
- Sets up global providers (React Query, Auth, Theme)
- Configures shared metadata for PWA
- Service worker initialization

**Auth Group** (`app/(auth)/`):
- Login page
- Registration page
- No sidebar/header in auth pages

**App Group** (`app/(app)/`):
- Standard app layout with sidebar and header
- Protected routes (require JWT)
- Nested routes for features

#### Feature-Specific Pages

**Dashboard** (`app/(app)/dashboard/page.tsx`):
- Net worth summary card
- Monthly allocation overview
- Recent activity feed
- Quick goal status

**Assets** (`app/(app)/assets/`):
- Table view of all assets (mortgage, ETF, crypto, gold)
- Asset cards with values and last update time
- Create/edit/delete asset modals
- Historical price charts

**Expenses** (`app/(app)/expenses/`):
- Monthly expense calendar view
- Category breakdown pie chart
- Expense list with filters
- Add manual expense form

**Goals** (`app/(app)/goals/`):
- Goal cards with progress bars
- Deadline countdowns
- Create/edit/delete goal modals
- Allocation tool page (separate)

**Allocation Tool** (`app/(app)/goals/allocation/`):
- Income input field
- Required expenses list
- Goals auto-allocation
- "What-if" scenario calculator
- Save allocation plan

**Reports** (`app/(app)/reports/`):
- Net worth trend chart
- Asset composition pie chart
- Expense category breakdown
- Income allocation visualization
- Export to PDF buttons

**Planned vs Actual Comparison** (NEW):
- **Allocation Comparison** (`app/(app)/reports/allocation-comparison/`)
  - Dual line chart: Planned vs Actual allocations over time
  - Monthly breakdown table with variance
  - Summary stats (total variance, best/worst months)
  - Filter by goal/category

- **Goal Progress Tracking** (`app/(app)/reports/goal-comparison/`)
  - Select a specific goal
  - Dual line chart showing planned vs actual accumulated savings
  - On-track vs behind schedule indicator
  - Projected completion date vs target date
  - Recommendation: "Need to save €X more/month to stay on track"

- **Deadline Status** (`app/(app)/reports/deadline-status/`)
  - Table of all goals with target vs projected dates
  - Color-coded status (🟢 On track, 🟡 At risk, 🔴 Delayed)
  - Days to deadline countdown
  - "What-if" calculator (increase savings rate to hit deadline)

- **Category Comparison** (`app/(app)/reports/category-comparison/`)
  - Category selector dropdown
  - Dual line chart: planned vs actual spending
  - Variance summary and trends
  - Top overspent/underspent months

**Documents** (`app/(app)/documents/`):
- Document upload area (drag & drop)
- Document list with import status
- Preview of parsed transactions
- Confirm import button

**Account** (`app/(app)/account/`):
- User profile settings
- Password change form
- Logout button

### Component Architecture

#### Hooks (in `hooks/` directory)

**API Hooks**:
- `useAuth()` - Login, register, logout
- `useAssets()` - Fetch, create, update assets
- `useGoals()` - Fetch, create, update goals
- `useExpenses()` - Fetch, add, categorize expenses
- `useReports()` - Fetch report data
- `useDocuments()` - Upload, list documents
- `useComparison()` - Fetch planned vs actual comparison data (NEW)
  - `getAllocationComparison(from, to)`
  - `getGoalComparison(goalId, from, to)`
  - `getDeadlineStatus()`
  - `getCategoryComparison(categoryId, from, to)`

**Utility Hooks**:
- `useDebounce()` - Debounce search inputs
- `useLocalStorage()` - Persist local state
- `useMobile()` - Detect mobile viewport

**Implementation Pattern**:
```typescript
// hooks/use-assets.ts
export function useAssets() {
  const queryClient = useQueryClient();

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.get('/assets'),
  });

  const createAsset = useMutation({
    mutationFn: (data) => api.post('/assets', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] }),
  });

  return { assets, isLoading, createAsset };
}
```

#### Reusable Components (in `components/` directory)

**Common Components**:
- `Header` - Top navigation
- `Sidebar` - App navigation menu
- `Button` - Reusable button component
- `Card` - Card wrapper component
- `Modal` - Modal dialog wrapper
- `Input` - Form input with validation
- `Select` - Dropdown select
- `Table` - Data table with pagination

**Feature Components**:
- `AssetList`, `AssetCard`, `AssetDetails`
- `GoalList`, `GoalCard`, `AllocationCalculator`
- `ExpenseList`, `CategoryBreakdown`
- `DocumentUpload`, `TransactionPreview`
- `NetWorthChart`, `AssetComposition`, `ExpenseBreakdown`
- **Planned vs Actual Comparison** (NEW):
  - `AllocationComparisonChart` - Dual line chart for monthly allocations
  - `GoalProgressChart` - Dual line chart for goal savings progress
  - `DeadlineStatusTable` - Status table with deadline tracking
  - `CategoryComparisonChart` - Category expense dual chart
  - `VarianceSummary` - Summary stats card (total variance, best/worst months)
  - `ComparisonTooltip` - Tooltip showing planned, actual, variance values

#### Forms

**Authentication Forms**:
- `LoginForm` - Email and password inputs
- `RegisterForm` - With password confirmation

**Feature Forms**:
- `CreateGoalForm` - Goal input with validation
- `CreateAssetForm` - Asset type selector + fields
- `AllocationForm` - Income input and calculation

**Validation Pattern** (using React Hook Form + Zod):
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name required').max(100),
  targetAmount: z.number().positive('Must be positive'),
  targetDate: z.date().min(new Date(), 'Must be in future'),
});

type GoalFormData = z.infer<typeof goalSchema>;

export function CreateGoalForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  });

  const onSubmit: SubmitHandler<GoalFormData> = async (data) => {
    // Submit to backend
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Fields with error display */}
    </form>
  );
}
```

### State Management

**Query State** (TanStack React Query):
- Server state: Assets, goals, expenses, documents, reports
- Automatic caching and refetching
- Pessimistic updates for mutations

**UI State** (React Hooks):
- Modal open/close states
- Form visibility
- Tab selection
- Local component state

**Auth State** (Custom Context):
```typescript
// contexts/auth-context.tsx
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);

  // Load user from localStorage/API on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/users/me').then(user => setUser(user));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, ... }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### PWA Configuration

**Service Worker** (`public/service-worker.js`):
```javascript
// Workbox-generated service worker
// Caches:
// - Static assets (CSS, JS, images)
// - API responses (read-only data)
// - Offline fallback pages

self.addEventListener('install', event => {
  // Precache assets
});

self.addEventListener('fetch', event => {
  // Serve from cache, fallback to network
});
```

**Web App Manifest** (`public/manifest.json`):
```json
{
  "name": "Finances - Personal Finance Manager",
  "short_name": "Finances",
  "description": "Track mortgages, investments, expenses, and financial goals",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

**Next.js Config** (`next.config.js`):
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./i,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache' },
    },
  ],
});

module.exports = withPWA({
  reactStrictMode: true,
  // other config
});
```

---

## Database Design

### Prisma Schema

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============== User Models ==============

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String    // bcrypt hashed
  name      String?
  phone     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // Relations
  assets                Asset[]
  expenses              Expense[]
  goals                 Goal[]
  documents             Document[]
  allocationPlans       AllocationPlan[]
  expenseCategories     ExpenseCategory[]
  actualAllocations     ActualAllocation[] @relation("ActualAllocations")
  taxInfo               TaxInfo[]
}

// ============== Asset Models ==============

model Asset {
  id           String       @id @default(cuid())
  userId       String
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  type         String       // 'mortgage', 'etf', 'crypto', 'gold'
  name         String
  value        Float        // Current value in €
  quantity     Float?       // For ETF, crypto, gold
  costBasis    Float?       // Average cost
  currency     String       @default("EUR")

  // Metadata (JSON field for flexibility)
  metadata     Json?        // ticker, symbol, purity, etc.

  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  // Relations
  snapshots    AssetSnapshot[]

  @@index([userId])
  @@index([type])
}

model AssetSnapshot {
  id        String    @id @default(cuid())
  assetId   String
  asset     Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)

  value     Float     // Value at snapshot time
  price     Float?    // Price per unit
  capturedAt DateTime @default(now())

  @@index([assetId])
  @@index([capturedAt])
}

// ============== Expense Models ==============

model Expense {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  amount      Float
  categoryId  String
  category    ExpenseCategory @relation(fields: [categoryId], references: [id])

  merchant    String?  // e.g., "Supermarket X", "Revolut"
  description String?
  date        DateTime

  source      String   @default("manual") // 'manual' or 'imported'
  documentId  String?
  document    Document? @relation(fields: [documentId], references: [id], onDelete: SetNull)

  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([categoryId])
  @@index([date])
}

model ExpenseCategory {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  name         String
  type         String    // 'income', 'expense', 'goal', 'required'
  color        String?   // Hex color for visualization
  predefined   Boolean   @default(false)

  expenses              Expense[]
  actualAllocations     ActualAllocation[] @relation("ActualAllocationsToCategory")

  createdAt    DateTime  @default(now())

  @@unique([userId, name])
  @@index([userId])
}

// ============== Goal Models ==============

model Goal {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name            String
  targetAmount    Float
  targetDate      DateTime? // Deadline — null for 'monthly' recurring goals
  currentAmount   Float     @default(0) // Accumulated savings (not used for 'monthly' goals)

  recurringPeriod String?  // null = one-time, 'monthly' = fixed monthly expense, 'annual' = yearly lump-sum (auto-resets)

  priority        Int      @default(1)  // 1=high, 2=medium, 3=low
  status          String   @default("active") // 'active', 'at_risk', 'completed', 'archived'
  // Note: 'monthly' goals stay 'active' indefinitely; 'annual' goals auto-create next year on completion

  description     String?
  category        String?  // e.g., 'travel', 'family', 'emergency', 'housing', 'transport'

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  allocationItems        AllocationPlanItem[]
  actualAllocations      ActualAllocation[] @relation("ActualAllocationsToGoal")
  snapshots              GoalSnapshot[] @relation("GoalSnapshots")

  @@index([userId])
  @@index([status])
  @@index([recurringPeriod])
}

model AllocationPlan {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  month           DateTime  // YYYY-MM-01
  monthlyIncome   Float

  status          String    @default("proposed") // 'proposed', 'approved', 'archived'

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  items              AllocationPlanItem[]
  actualAllocations  ActualAllocation[]

  @@unique([userId, month])
  @@index([userId])
}

model AllocationPlanItem {
  id         String   @id @default(cuid())
  planId     String
  plan       AllocationPlan @relation(fields: [planId], references: [id], onDelete: Cascade)

  goalId     String
  goal       Goal     @relation(fields: [goalId], references: [id], onDelete: Cascade)

  amount     Float    // Allocated amount for this goal this month

  @@index([planId])
  @@index([goalId])
}

// ============== Planned vs Actual Tracking ==============

model ActualAllocation {
  id                  String    @id @default(cuid())
  allocationPlanId    String
  allocationPlan      AllocationPlan? @relation(fields: [allocationPlanId], references: [id], onDelete: SetNull)

  userId              String
  user                User      @relation("ActualAllocations", fields: [userId], references: [id], onDelete: Cascade)

  goalId              String?
  goal                Goal?     @relation("ActualAllocationsToGoal", fields: [goalId], references: [id], onDelete: SetNull)

  categoryId          String?
  category            ExpenseCategory? @relation("ActualAllocationsToCategory", fields: [categoryId], references: [id], onDelete: SetNull)

  type                String    // 'goal' or 'category'
  month               DateTime  // YYYY-MM-01
  plannedAmount       Float     // From allocation plan
  actualAmount        Float     // Calculated from expenses
  variance            Float     // actual - planned (positive = over, negative = under)

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@unique([userId, goalId, month])
  @@unique([userId, categoryId, month])
  @@index([userId])
  @@index([month])
  @@index([goalId])
  @@index([categoryId])
}

model GoalSnapshot {
  id                      String    @id @default(cuid())
  goalId                  String
  goal                    Goal      @relation("GoalSnapshots", fields: [goalId], references: [id], onDelete: Cascade)

  month                   DateTime  // YYYY-MM-01
  targetAmount            Float     // Goal's target at this time
  targetDate              DateTime  // Goal's deadline at this time
  balanceAsOf             Float     // Accumulated amount saved (from prior allocations)
  allocatedThisMonth      Float     // Amount allocated to goal this month
  actualSavedThisMonth    Float     // Actual amount saved (from expenses) this month
  projectedCompletionDate DateTime  // Calculated based on current savings rate
  onTrack                 Boolean   // targetDate >= projectedDate

  createdAt               DateTime  @default(now())

  @@unique([goalId, month])
  @@index([goalId])
  @@index([month])
  @@index([onTrack])
}

// ============== Document Models ==============

model Document {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  fileName      String
  fileType      String    // 'csv', 'pdf'
  fileUrl       String    // Cloud storage URL

  parseStatus   String    @default("pending") // 'pending', 'parsed', 'error'
  parseError    String?

  // Metadata
  metadata      Json?     // { bank: 'revolut', period: '2025-01-01 to 2025-01-31', transactionCount: 42 }

  uploadedAt    DateTime  @default(now())
  parsedAt      DateTime?

  // Relations
  transactions  Transaction[]
  expenses      Expense[]

  @@index([userId])
  @@index([uploadedAt])
}

model Transaction {
  id          String    @id @default(cuid())
  documentId  String
  document    Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)

  amount      Float
  currency    String    @default("EUR")
  date        DateTime
  merchant    String?
  description String?

  categoryId  String?   // Suggested category

  createdAt   DateTime  @default(now())

  @@index([documentId])
  @@index([date])
}

// ============== Tax Information Models ==============

model TaxInfo {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Tax Year
  taxYear           Int       // e.g., 2025
  country           String    // e.g., "Bulgaria"

  // Income Information
  annualSalary      Float?    // Gross annual salary
  monthlyIncome     Float?    // Average monthly income
  freeLanceIncome   Float?    // Self-employment income if applicable

  // Tax Deductions & Contributions (as percentages or amounts)
  stateSocialInsurance      Float?  // e.g., 0.183 (18.3%) for Bulgaria
  supplementaryPension      Float?  // e.g., 0.05 (5%)
  healthInsurance           Float?  // e.g., 0.08 (8%)
  incomeTaxRate             Float?  // e.g., 0.10 (10%)
  recognizedExpensesRate    Float?  // e.g., 0.25 (25%)

  // Calculated Totals
  totalContributions        Float?  // Sum of all contributions
  taxableIncome             Float?  // Income after deductions
  totalTaxLiability         Float?  // Tax owed for the year
  taxPaidToDate             Float?  // Amount already paid/withheld
  taxRefundDue              Float?  // Positive = refund owed to user, Negative = additional tax due

  // Additional Fields
  status                    String  @default("draft") // 'draft', 'submitted', 'completed'
  notes                     String? // Notes or remarks

  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  submittedAt               DateTime?

  @@unique([userId, taxYear])
  @@index([userId])
  @@index([taxYear])
}
```

### Database Relationships

```
User
├── Assets (1:M)
│   └── AssetSnapshots (1:M)
├── Goals (1:M)
│   └── AllocationPlanItems (1:M)
├── Expenses (1:M)
├── ExpenseCategories (1:M)
├── Documents (1:M)
│   ├── Transactions (1:M)
│   └── Expenses (1:M)
├── AllocationPlans (1:M)
│   └── AllocationPlanItems (1:M)
└── TaxInfo (1:M)
```

---

## API Specification

### Base URL
```
https://api.finances-app.com/api
```

### Authentication
- **Type**: JWT Bearer Token
- **Header**: `Authorization: Bearer <token>`
- **Storage**: Secure HTTP-only cookie (with localStorage fallback)

### Response Format
```typescript
// Success Response
{
  success: true,
  data: { /* response data */ },
  timestamp: "2025-03-06T10:30:00Z",
  path: "/api/assets"
}

// Error Response
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid request data",
    details: [
      { field: "targetAmount", message: "Must be positive" }
    ]
  },
  timestamp: "2025-03-06T10:30:00Z",
  path: "/api/assets"
}
```

### Endpoint Categories

#### Authentication Endpoints
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

Request: { email: string, password: string }
Response: { accessToken: string, refreshToken: string, user: User }
```

#### Assets Endpoints
```
GET    /assets
GET    /assets/:id
POST   /assets
PATCH  /assets/:id
DELETE /assets/:id
GET    /assets/snapshots?assetId=&from=&to=
GET    /assets/net-worth?date=

Query params: filter, sort, limit, offset
```

#### Expenses Endpoints
```
GET    /expenses?month=2025-01&categoryId=
GET    /expenses/:id
POST   /expenses
PATCH  /expenses/:id
DELETE /expenses/:id
GET    /expenses/summary?month=
GET    /expenses/categories
POST   /expenses/categories
```

#### Goals Endpoints
```
GET    /goals
GET    /goals/:id
POST   /goals
PATCH  /goals/:id
DELETE /goals/:id
POST   /goals/calculate-allocation
GET    /goals/allocation-plan?month=
```

#### Documents Endpoints
```
POST   /documents (multipart/form-data)
GET    /documents
GET    /documents/:id
DELETE /documents/:id
GET    /documents/:id/transactions
```

#### Reports Endpoints
```
GET    /reports/net-worth?from=&to=
GET    /reports/asset-composition?date=
GET    /reports/income-allocation?month=
GET    /reports/expense-analysis?month=
GET    /reports/goal-progress

Planned vs Actual Comparison:
GET    /reports/allocation-comparison?from=&to=       - Planned vs actual allocations (all goals/categories)
GET    /reports/goal-comparison/:goalId?from=&to=     - Goal-specific planned vs actual progress
GET    /reports/deadline-status                       - Goal deadline tracking vs projected dates
GET    /reports/category-comparison/:categoryId?from=&to= - Category expense tracking
```


---

## Authentication & Security

### JWT Implementation

**Token Structure**:
```
Header.Payload.Signature

Payload:
{
  sub: "user_id",
  email: "user@example.com",
  iat: 1234567890,
  exp: 1234654290  // 7 days
}
```

**Token Refresh**:
- Access token: 7 days
- Refresh token: 30 days (in httpOnly cookie)
- Token rotation on refresh
- Blacklist invalidated tokens (in Redis)

**Implementation** (NestJS):
```typescript
// guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

### Password Security

**Requirements**:
- Minimum 12 characters
- Must include: uppercase, lowercase, number, symbol
- Hashed with bcrypt (rounds: 10)
- Never store plaintext
- Secure password reset via email

**Implementation**:
```typescript
// Hash on registration
const hashedPassword = await bcrypt.hash(password, 10);

// Verify on login
const isValid = await bcrypt.compare(password, hashedPassword);
```

### Rate Limiting

**Endpoints**:
- Auth endpoints: 5 attempts / 15 minutes
- Document upload: 10 uploads / hour
- API endpoints: 100 requests / minute (per user)

**Implementation** (using `express-rate-limit`):
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: (req) => req.user.isAdmin,
});

app.post('/api/auth/login', limiter, (req, res) => { ... });
```

### Data Protection

**At Rest**:
- Database encryption (PostgreSQL)
- Sensitive field encryption (optional)

**In Transit**:
- HTTPS only (enforce in production)
- TLS 1.3 minimum
- Secure headers (HSTS, CSP, X-Frame-Options)

**Implementation** (Helmet.js):
```typescript
import helmet from '@nestjs/helmet';

app.use(helmet());
// Sets: Strict-Transport-Security, X-Content-Type-Options, etc.
```

### CORS Configuration

```typescript
app.enableCors({
  origin: [
    'https://finances-app.com',
    'https://www.finances-app.com',
    'http://localhost:3000', // Development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

## Automation & Jobs

### Bull Queue Setup

**Redis Connection**:
```typescript
// config/redis.config.ts
import bullConfig from 'bull';

export const getBullOptions = () => ({
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
});
```

**Job Registration** (in `jobs.module.ts`):
```typescript
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'monthly-price-update' },
      { name: 'asset-snapshot' },
      { name: 'report-generation' },
    ),
  ],
  providers: [JobSchedulerService],
})
export class JobsModule {}
```

### Monthly Price Update Job

**Trigger**: 1st of month, 2:00 AM UTC

**Implementation**:
```typescript
@Processor('monthly-price-update')
export class MonthlyPriceUpdateJobHandler {
  constructor(
    private cryptoPriceFetcher: CryptoPriceFetcher,
    private etfPriceFetcher: EtfPriceFetcher,
    private prisma: PrismaService,
  ) {}

  @Process()
  async handle() {
    const allUsers = await this.prisma.user.findMany();

    for (const user of allUsers) {
      const assets = await this.prisma.asset.findMany({
        where: { userId: user.id },
      });

      for (const asset of assets) {
        let price = asset.value;

        if (asset.type === 'etf') {
          price = await this.etfPriceFetcher.getPrice(asset.metadata.ticker);
        } else if (asset.type === 'crypto') {
          price = await this.cryptoPriceFetcher.getPrice(
            asset.metadata.symbol,
          );
        }

        // Create snapshot
        await this.prisma.assetSnapshot.create({
          data: {
            assetId: asset.id,
            value: price * (asset.quantity || 1),
            price,
            capturedAt: new Date(),
          },
        });

        // Update asset value
        await this.prisma.asset.update({
          where: { id: asset.id },
          data: { value: price * (asset.quantity || 1) },
        });
      }
    }

    return { status: 'completed', assetsUpdated: assets.length };
  }
}
```

### Price Fetcher Services

**CryptoPriceFetcher** (CoinGecko API):
```typescript
@Injectable()
export class CryptoPriceFetcher {
  constructor(private http: HttpService) {}

  async getPrice(symbol: string): Promise<number> {
    const response = await this.http
      .get(`https://api.coingecko.com/api/v3/simple/price`, {
        params: {
          ids: symbol.toLowerCase(),
          vs_currencies: 'eur',
        },
      })
      .toPromise();

    return response.data[symbol.toLowerCase()].eur;
  }
}
```

**EtfPriceFetcher** (Yahoo Finance API):
```typescript
@Injectable()
export class EtfPriceFetcher {
  constructor(private http: HttpService) {}

  async getPrice(ticker: string): Promise<number> {
    // Use yahoo-finance2 library
    const quote = await yahooFinance.quote(ticker + '.DE', {
      modules: ['price'],
    });

    return quote.price.regularMarketPrice;
  }
}
```

### Cron Job Registration

```typescript
// job-scheduler.service.ts
@Injectable()
export class JobSchedulerService {
  constructor(
    @InjectQueue('monthly-price-update')
    private monthlyQueue: Queue,
  ) {
    this.registerJobs();
  }

  private registerJobs() {
    // Monthly on 1st at 2 AM UTC
    this.monthlyQueue.add(
      'monthly-price-update',
      {},
      {
        repeat: {
          cron: '0 2 1 * *',
          tz: 'UTC',
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
        },
      },
    );
  }
}
```

---

## Deployment

### Environment Variables

**Backend (.env)**:
```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/finances

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# Server
NODE_ENV=production
PORT=3001
API_DOMAIN=https://api.finances-app.com

# CORS
FRONTEND_URL=https://finances-app.com

# External APIs
YAHOO_FINANCE_API_KEY=
COINGECKO_API_KEY=

# File Storage
STORAGE_TYPE=s3
AWS_S3_BUCKET=finances-app-documents
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Email (for notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=
```

**Frontend (.env.local)**:
```
NEXT_PUBLIC_API_URL=https://api.finances-app.com
NEXT_PUBLIC_APP_NAME=Finances
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Docker Deployment

**Backend Dockerfile** (`apps/backend/Dockerfile`):
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

**Frontend Dockerfile** (`apps/frontend/Dockerfile`):
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

**Docker Compose** (local development):
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: userdb
      POSTGRES_PASSWORD: password
      POSTGRES_DB: finances
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  backend:
    build: ./apps/backend
    environment:
      DATABASE_URL: postgresql://userdb:password@postgres:5432/finances
      REDIS_HOST: redis
    ports:
      - '3001:3001'
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./apps/frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
    ports:
      - '3000:3000'
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Production Deployment Options

**Option A: AWS**
- Frontend: CloudFront + S3
- Backend: ECS (Fargate)
- Database: RDS (PostgreSQL)
- Cache: ElastiCache (Redis)
- Storage: S3 (for documents)

**Option B: Railway / Render / Vercel**
- Frontend: Vercel (Next.js native)
- Backend: Railway / Render
- Database: Managed PostgreSQL
- Cache: Managed Redis
- Storage: AWS S3 or Railway PostgreSQL backups

**Option C: Self-Hosted VPS**
- Docker Compose on DigitalOcean / Linode
- PostgreSQL in Docker or managed
- Redis in Docker
- Nginx as reverse proxy
- SSL via Let's Encrypt

### CI/CD Pipeline (GitHub Actions)

**Workflow** (`.github/workflows/ci.yml`):
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run test
      - run: pnpm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Deploy script (e.g., to Railway, Vercel, etc.)
```

---

## Development Workflow

### Setting Up Development Environment

**Prerequisites**:
- Node.js 18+
- pnpm 8+
- PostgreSQL 14+
- Redis 7+
- Docker (optional, for databases)

**Initial Setup**:
```bash
# Clone repository
git clone <repo-url>
cd finances-app

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local

# Setup database
cd apps/backend
npx prisma migrate dev --name init

# Start development servers
pnpm dev
```

### Project Commands

```bash
# Development
pnpm dev              # Start all apps in dev mode

# Specific apps
pnpm dev:backend    # Start backend only
pnpm dev:frontend   # Start frontend only
pnpm dev:shared     # Rebuild shared package on changes

# Building
pnpm build           # Build all apps
pnpm build:backend
pnpm build:frontend

# Testing
pnpm test            # Run all tests
pnpm test --filter=backend
pnpm test:watch      # Watch mode

# Linting
pnpm lint            # Lint all code
pnpm lint:fix        # Fix linting issues

# Database
pnpm db:migrate      # Run migrations
pnpm db:seed         # Seed test data
pnpm db:generate     # Generate Prisma client

# Type checking
pnpm type-check      # Full TypeScript check
```

### Code Quality

**Pre-commit Hooks** (via Husky):
- ESLint check
- Prettier formatting
- Type checking
- Test for changed files

**Git Workflow**:
```bash
git checkout -b feature/my-feature
# Make changes
pnpm format          # Auto-format code
pnpm lint:fix        # Fix linting
pnpm test            # Run tests
git add .
git commit -m "feat: description of changes"
git push origin feature/my-feature
# Create PR, merge after review
```

### Module Adding Pattern

**When adding a new feature module**:

1. **Create backend module**:
   ```bash
   nest generate module features/my-feature
   nest generate controller features/my-feature
   nest generate service features/my-feature
   ```

2. **Add database models** to `prisma/schema.prisma`

3. **Create DTOs** for request/response validation

4. **Create shared types** in `packages/@finances/shared/src/types/`

5. **Create frontend hooks** in `apps/frontend/hooks/`

6. **Create frontend pages/components** in `apps/frontend/app/`

7. **Test end-to-end** with both backend and frontend

### Testing Strategy

**Backend**:
- Unit tests for services
- Integration tests for controllers
- E2E tests for critical workflows

**Frontend**:
- Component tests with Testing Library
- Hook tests
- E2E tests with Cypress (future)

```typescript
// Example unit test
describe('AllocationService', () => {
  let service: AllocationService;

  beforeEach(() => {
    TestingModule const module = Test.createTestingModule({
      providers: [AllocationService],
    }).compile();
    service = module.get<AllocationService>(AllocationService);
  });

  it('should calculate allocations', () => {
    const result = service.calculateAllocation(
      mockGoals,
      5000, // income
      mockRequiredExpenses,
    );
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });
});
```

---

## Performance Considerations

### Frontend Optimization
- Code splitting (Next.js automatic)
- Image optimization (next/image)
- Service worker caching
- Lazy loading of charts
- Virtual scrolling for large lists

### Backend Optimization
- Database indexing on frequently queried fields
- Query optimization (select only needed columns)
- Caching with Redis
- Rate limiting to prevent abuse
- Pagination for large datasets

### Monitoring

**Tools**:
- Sentry (error tracking)
- DataDog or similar (APM)
- Custom dashboards (Grafana)

```typescript
// Sentry integration (backend)
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

---

## Summary

This architecture provides:
- **Scalable monorepo** with clear module boundaries
- **Type-safe** full-stack TypeScript
- **Modular backend** that supports growth
- **Modern frontend** with PWA capabilities
- **Automation-first** approach minimizing manual work
- **Production-ready** with CI/CD, security, and performance in mind

The system is designed to be developed incrementally, with each module independent and testable.

