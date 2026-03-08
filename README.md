# Finances

A self-hosted personal finance management app for households. Track assets, liabilities, expenses, goals, and net worth — all in one place. Invite your partner to share the same household and manage finances together.

Built as a PWA so it works great on mobile.

## Features

- **Assets** — ETFs, crypto, gold, real estate with full snapshot history
- **Liabilities** — Mortgages, loans, and leasing with automatic amortization. Supports lifecycle events so changes like refinancing, rate adjustments, payment increases, or extra payments are reflected in the outstanding balance and projections
- **Expenses** — Manual entry or CSV import (Revolut supported), auto-categorization by merchant
- **Goals** — One-time and recurring savings goals with progress tracking
- **Net Worth** — Historical chart with forward projections for liabilities
- **Household** — Multi-user support via invite links with role selection (member or read-only viewer)
- **Reports** — Expense budget breakdown, net worth over time
- **Import** — Revolut CSV statement import with transaction classification
- **PWA** — Installable on mobile, pull-to-refresh

### Household Invitations

The app supports multiple users in a single household — useful for couples managing finances together. There's no email service; instead the owner creates a shareable link:

1. Go to **Account** in the sidebar
2. Select a **role** — **Member** (full access) or **Viewer** (read-only)
3. Click **Create Invite** — generates a link valid for 7 days (max 3 active)
4. Share the link with your partner
5. They open the link, create an account (or sign in), and automatically join your household with the chosen role
6. Both users now see the same assets, liabilities, expenses, and goals

**Roles:**
- **Owner** — Full access + can manage members and invites
- **Member** — Full access to create, edit, and delete data
- **Viewer** — Read-only access; can see everything but cannot modify anything

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React, TailwindCSS, React Query, Recharts |
| Backend | NestJS, Prisma ORM, Passport JWT |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Monorepo | pnpm workspaces + Turborepo |
| Deploy | Docker Compose + nginx reverse proxy |

## Project Structure

```
finances-app/
├── apps/
│   ├── backend/          # NestJS API (port 3001)
│   │   ├── prisma/       # Schema, migrations, seed
│   │   └── src/          # Modules: auth, assets, liabilities, expenses, goals, etc.
│   └── frontend/         # Next.js 15 app (port 3000)
│       ├── app/          # App Router pages
│       ├── components/   # UI components
│       └── hooks/        # React Query hooks
├── packages/
│   └── shared/           # Shared types and constants
├── sample-data/          # CSV files for seeding
├── nginx/                # Reverse proxy config
├── docker-compose.yml    # Dev infrastructure (Postgres + Redis)
└── docker-compose.prod.yml # Full production stack
```

## Getting Started

### Prerequisites

- Node.js >= 20.9
- pnpm >= 9.0 (`corepack enable && corepack prepare pnpm@9.15.9 --activate`)
- Docker and Docker Compose (for Postgres + Redis)

### Development Setup

1. **Clone and install:**

   ```bash
   git clone git@github.com:Plamen5kov/finance-app.git
   cd finance-app
   pnpm install
   ```

2. **Start infrastructure:**

   ```bash
   docker compose up -d
   ```

   This starts PostgreSQL (port 5432) and Redis (port 6379).

3. **Configure environment:**

   ```bash
   cp .env.example apps/backend/.env
   ```

   The defaults work out of the box for local development.

4. **Set up the database:**

   ```bash
   pnpm db:generate
   pnpm --filter backend exec prisma migrate dev
   ```

5. **Seed sample data (optional):**

   ```bash
   pnpm --filter backend db:seed
   ```

   Creates a test user (`plamen@finances.local` / `MyPassword123456`) with historical assets, liabilities, expenses, and goals.

6. **Start dev servers:**

   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

### Useful Commands

```bash
pnpm dev              # Start all dev servers
pnpm build            # Build everything
pnpm lint             # Lint all packages
pnpm type-check       # Type-check all packages
pnpm format           # Format with Prettier
pnpm db:generate      # Regenerate Prisma client
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed sample data
```

## Production Deployment

### Docker Compose

1. **Create `.env`** in the project root:

   ```env
   DB_USER=userdb
   DB_PASSWORD=<strong-random-password>
   DB_NAME=finances
   JWT_SECRET=<random-string-at-least-32-chars>
   SESSION_SECRET=<random-string-at-least-32-chars>
   ```

   Generate secrets with: `openssl rand -base64 48`

2. **Update `docker-compose.prod.yml`:**

   Set `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` to your domain.

3. **Build and start:**

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

4. **Run migrations:**

   ```bash
   docker exec <backend-container> npx prisma db push
   ```

5. **Seed data (optional):**

   ```bash
   docker exec -w /app/apps/backend <backend-container> npx ts-node prisma/seed.ts
   ```

The stack runs nginx on port 55555 by default. Put your own reverse proxy (nginx, Caddy, Cloudflare Tunnel) in front for SSL termination.

### Architecture

```
Client → Your Reverse Proxy (SSL) → nginx (:55555) → frontend (:3000)
                                                    → backend  (:3001) → PostgreSQL
                                                                       → Redis
```

## Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/my-feature
   ```
3. **Make your changes** — follow the existing code style
4. **Verify** your changes build and pass checks:
   ```bash
   pnpm build
   pnpm lint
   pnpm type-check
   ```
5. **Commit** with a clear message describing *why*, not just *what*
6. **Open a Pull Request** against `main`

### Guidelines

- Keep PRs focused — one feature or fix per PR
- Follow existing patterns (NestJS modules, React Query hooks, Prisma models)
- Backend endpoints go under `/api/v1/` with versioned controllers
- Frontend pages use the Next.js App Router under `app/(app)/` for authenticated routes
- All data is scoped by `householdId` — never query without it
- Don't commit `.env` files or secrets

### Adding a New Feature (typical flow)

1. **Schema** — Add/modify models in `apps/backend/prisma/schema.prisma`
2. **Backend** — Create a NestJS module with service, controller, DTOs
3. **Shared types** — Add shared constants/types to `packages/shared/src/index.ts`
4. **Frontend hooks** — Create React Query hooks in `apps/frontend/hooks/`
5. **Frontend pages** — Add pages under `apps/frontend/app/(app)/`
6. **Middleware** — Add new routes to `protectedRoutes` in `apps/frontend/middleware.ts`

## License

[Apache License 2.0](LICENSE)
