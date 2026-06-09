FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat
RUN addgroup -S movia && adduser -S movia -G movia
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

RUN cd apps/backend && \
    PRISMA=$(find /app/node_modules/.pnpm -path "*/prisma@5.22.0*/node_modules/prisma/build/index.js" | head -1) && \
    node "$PRISMA" generate

RUN NEST_CLI="$(find /app/node_modules/.pnpm -path '*/node_modules/@nestjs/cli/bin/nest.js' -type f | head -1)" && \
    cd apps/backend && node "$NEST_CLI" build

EXPOSE 3000
ENV NODE_ENV=production
RUN chown -R movia:movia /app
USER movia
CMD ["node", "apps/backend/dist/main.js"]
