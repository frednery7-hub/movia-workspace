# ─────────────────────────────────────────────────────────────────
# Stage 1 — builder: instala tudo, gera Prisma Client e compila.
# ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
RUN corepack enable

# Manifests primeiro (cache de camada eficiente)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-data/package.json ./packages/shared-data/
COPY packages/route-engine/package.json ./packages/route-engine/
COPY packages/geo-engine/package.json ./packages/geo-engine/

RUN pnpm install --frozen-lockfile

COPY apps/backend ./apps/backend
COPY packages ./packages

# Gera o Prisma Client
RUN cd apps/backend && \
    PRISMA=$(find /app/node_modules/.pnpm -path "*/prisma@5.22.0*/node_modules/prisma/build/index.js" | head -1) && \
    node "$PRISMA" generate

# Compila o NestJS
RUN NEST_CLI="$(find /app/node_modules/.pnpm -path '*/node_modules/@nestjs/cli/bin/nest.js' -type f | head -1)" && \
    cd apps/backend && node "$NEST_CLI" build

# Remove devDependencies, deixando só o necessário para runtime.
# CI=true: sem TTY no Docker, o pnpm aborta a purga do node_modules
# pedindo confirmação interativa se não souber que está em CI.
# --ignore-scripts: o script 'prepare' da raiz chama o husky (git hooks),
# que é devDependency e acabou de ser removido. Nada disso é necessário
# em runtime -- Prisma Client e build do Nest já foram gerados acima.
RUN CI=true pnpm install --frozen-lockfile --prod --ignore-scripts

# ─────────────────────────────────────────────────────────────────
# Stage 2 — runtime: apenas o compilado + deps de produção.
# ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

RUN apk add --no-cache openssl libc6-compat
RUN addgroup -S movia && adduser -S movia -G movia
WORKDIR /app

ENV NODE_ENV=production

# Store central do pnpm (contém os pacotes reais) + manifests
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Workspace packages, incluindo seus node_modules (symlinks para o store).
# No pnpm cada workspace tem seu próprio node_modules -- sem ele, o require
# do backend não resolve as dependências, mesmo estando no store.
COPY --from=builder /app/packages ./packages

# Backend: manifest, schema Prisma, dist compilado E os node_modules do
# workspace (symlinks). É daqui que o dist/main.js resolve @sentry/nestjs,
# @prisma/client e o resto.
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

RUN chown -R movia:movia /app
USER movia

EXPOSE 3000
CMD ["node", "apps/backend/dist/main.js"]
