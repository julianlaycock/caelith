FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.backend.json ./
COPY src/backend ./src/backend
COPY src/rules-engine ./src/rules-engine
COPY migrations ./migrations
COPY scripts ./scripts
COPY openapi.yml ./

EXPOSE 3001

CMD ["npx", "tsx", "src/backend/server.ts"]
