# ── Stage 1: Install dependencies ─────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: Production ──────────────────────────────────
FROM node:20-alpine

RUN addgroup -S caelith && adduser -S caelith -G caelith

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json tsconfig.backend.json ./
COPY src/backend ./src/backend
COPY src/rules-engine ./src/rules-engine
COPY migrations ./migrations
COPY scripts ./scripts
COPY openapi.yml ./

USER caelith

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["sh", "-c", "npx tsx scripts/migrate.ts && npx tsx src/backend/server.ts"]
