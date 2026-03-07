FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/backend apps/backend
COPY sample-data sample-data

# Build shared package first (TS -> JS)
RUN pnpm --filter @finances/shared build

# Generate Prisma client
RUN pnpm --filter backend db:generate

# Build backend
RUN pnpm --filter backend build

# --- Production ---
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=build /app/tsconfig.base.json tsconfig.base.json
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/shared/src packages/shared/src
COPY --from=build /app/apps/backend/package.json apps/backend/
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/backend/src apps/backend/src
COPY --from=build /app/apps/backend/prisma apps/backend/prisma
COPY --from=build /app/apps/backend/tsconfig.json apps/backend/tsconfig.json
COPY --from=build /app/apps/backend/node_modules apps/backend/node_modules
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/sample-data sample-data

ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/apps/backend
CMD ["node", "dist/main"]
