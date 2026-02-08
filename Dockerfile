FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY tsconfig.json tsconfig.backend.json ./
COPY src/backend ./src/backend
COPY src/rules-engine ./src/rules-engine
COPY migrations ./migrations
COPY scripts/migrate.ts ./scripts/migrate.ts
RUN npx tsc --project tsconfig.backend.json || true
RUN mkdir -p data
RUN npx tsx scripts/migrate.ts
EXPOSE 3001
CMD ["npx", "tsx", "src/backend/server.ts"]
