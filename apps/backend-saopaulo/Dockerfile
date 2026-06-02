# ── Stage 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-data/package.json ./packages/shared-data/
COPY packages/route-engine/package.json ./packages/route-engine/
COPY packages/geo-engine/package.json ./packages/geo-engine/

RUN pnpm install --frozen-lockfile

COPY apps/backend ./apps/backend
COPY packages ./packages

RUN pnpm --filter backend build

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN addgroup -S movia && adduser -S movia -G movia

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-data/package.json ./packages/shared-data/
COPY packages/route-engine/package.json ./packages/route-engine/
COPY packages/geo-engine/package.json ./packages/geo-engine/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY apps/backend/prisma ./apps/backend/prisma

RUN chown -R movia:movia /app
USER movia

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "apps/backend/dist/main.js"]