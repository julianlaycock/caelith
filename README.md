# Codex — Compliance Engine for Private Assets

Programmable transfer restriction infrastructure for tokenized assets. Configure investor eligibility rules, validate transactions against regulatory constraints, and maintain a complete audit trail — all through a single API.

**Source-available** · **Off-chain today, on-chain tomorrow** · **EU-first compliance**

---

## What Codex Does

Codex replaces manual compliance workflows with a deterministic, auditable rules engine. Platform operators define transfer restrictions per asset, and Codex enforces them automatically — returning detailed pass/fail results with per-rule explanations.

**Core capabilities:**

- **Asset registry** — Define private assets with unit-based ownership tracking
- **Investor registry** — Manage investor profiles with jurisdiction and accreditation attributes
- **Ownership ledger** — Track unit allocations with full cap table views
- **Built-in rules** — Qualification checks, lockup periods, jurisdiction whitelists, transfer whitelists
- **Custom rules** — Composable AND/OR/NOT logic with field-level conditions
- **Transfer simulation** — Validate proposed transfers without executing them
- **Transfer execution** — Atomic ownership updates with automatic audit logging
- **Webhooks** — Real-time event notifications with HMAC-SHA256 signed payloads
- **Rule versioning** — Full history of every rule change for regulatory audit
- **Immutable audit trail** — Every mutation logged with timestamp, actor, and payload

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js · TypeScript · Express |
| Database | PostgreSQL |
| Rules Engine | Custom TypeScript module (pure functions, zero side effects) |
| Frontend | Next.js 14 · React · Tailwind CSS |
| Auth | JWT with role-based access control (admin, compliance_officer, investor_readonly) |
| Testing | Vitest (65 tests) |
| Deployment | Docker Compose |

## Quick Start

### Prerequisites

- Node.js 20.x+
- PostgreSQL 15+ (or Docker)

### Option A: Docker (recommended)
```bash
docker-compose up
```

This starts PostgreSQL, the backend API (port 3001), and the frontend (port 3000).

### Option B: Local development
```bash
# 1. Install dependencies
npm install
cd src/frontend && npm install && cd ../..

# 2. Set up PostgreSQL and create a database named 'codex'
# 3. Copy .env and configure DATABASE_URL and JWT_SECRET

# 4. Run database migrations
npm run migrate

# 5. Seed demo data (optional)
npx tsx scripts/seed-data.ts

# 6. Start development servers
npm run dev
```

- **Backend API:** http://localhost:3001/api
- **Frontend:** http://localhost:3000
- **Health check:** http://localhost:3001/health

### First steps

1. Register an account at http://localhost:3000/login
2. Create an asset (e.g., "Growth Fund I" with 1,000,000 units)
3. Add investors with jurisdiction and accreditation attributes
4. Configure transfer rules for the asset
5. Allocate units to investors
6. Simulate and execute transfers

## API Overview

All endpoints require JWT authentication. Include `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Get JWT token |

### Core Resources

| Resource | Endpoints | Operations |
|----------|-----------|-----------|
| Assets | 4 | Create, list, get, utilization stats |
| Investors | 4 | Create, list, get, update |
| Holdings | 3 | Allocate, query, cap table |
| Rules | 3 | Create/update, get, version history |
| Composite Rules | 4 | Create, list, update, delete |
| Transfers | 4 | Simulate, execute, list, history |
| Webhooks | 5 | Register, list, update, delete, deliveries |
| Events | 1 | Filterable audit trail |

Full API specification: [`openapi.yml`](openapi.yml)

## Rules Engine

### Built-in Rules (per asset)

| Rule | Description |
|------|-------------|
| Qualification | Receiver must be an accredited investor |
| Lockup period | Minimum days after acquisition before transfer is allowed |
| Jurisdiction whitelist | Receiver must be in an approved jurisdiction |
| Transfer whitelist | Receiver must be on an approved investor list |

### Custom Rules (composable)

Create field-level conditions with AND/OR/NOT logic:
```json
{
  "name": "EU accredited recipients only",
  "operator": "AND",
  "conditions": [
    { "field": "to.jurisdiction", "operator": "in", "value": ["DE", "FR", "ES", "IT", "NL"] },
    { "field": "to.accredited", "operator": "eq", "value": true }
  ]
}
```

Available fields: `to.jurisdiction`, `to.accredited`, `from.jurisdiction`, `from.accredited`, `transfer.units`, `holding.units`

### Transfer Simulation

Validate a transfer without executing it. Returns per-rule check results:
```
POST /api/transfers/simulate

Response:
{
  "valid": false,
  "summary": "Transfer blocked: 1 of 7 checks failed",
  "checks": [
    { "rule": "Qualification Check", "passed": true, "message": "Receiver is accredited" },
    { "rule": "Lockup Period", "passed": false, "message": "22 days remaining (requires 90)" },
    ...
  ],
  "violations": ["Lockup period not met: 22 days remaining"]
}
```

## Testing
```bash
# Run all tests (backend must be running)
npm run dev:backend          # Terminal 1
npx vitest run               # Terminal 2

# Unit tests only (no backend needed)
npx vitest run src/rules-engine/ tests/unit/

# E2E tests only (backend required)
npx vitest run tests/e2e/
```

**65 tests:** 20 rules engine · 9 composite rules · 2 repository · 8 validation failures · 10 happy path · 10 audit trail · 6 composite rules e2e

## Project Structure
```
codex/
├── migrations/              # PostgreSQL schema migrations (001-006)
├── scripts/
│   ├── migrate.ts           # Migration runner
│   ├── seed-data.ts         # Demo data generator
│   └── test-api.ts          # API integration test
├── src/
│   ├── backend/
│   │   ├── models/          # TypeScript interfaces
│   │   ├── repositories/    # Data access layer (6 repos)
│   │   ├── services/        # Business logic (7 services)
│   │   ├── routes/          # API endpoints (8 route groups)
│   │   ├── middleware/       # Auth + RBAC middleware
│   │   └── db.ts            # PostgreSQL connection
│   ├── rules-engine/
│   │   ├── types.ts         # Rule interfaces
│   │   ├── validator.ts     # 7 built-in validation rules
│   │   ├── composite.ts     # AND/OR/NOT rule evaluator
│   │   └── *.test.ts        # Unit tests
│   └── frontend/            # Next.js 14 app (7 pages)
├── tests/
│   ├── unit/                # Repository tests
│   ├── e2e/                 # End-to-end API tests
│   └── fixtures/            # Test data + helpers
├── docker-compose.yml       # One-command deployment
├── openapi.yml              # API specification
└── Dockerfile
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| JWT_SECRET | Yes | Secret for JWT signing (min 32 chars) |
| PORT | No | Backend port (default: 3001) |
| FRONTEND_URL | No | CORS origin (default: http://localhost:3000) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend |
| `npm run dev:backend` | Start backend only (port 3001) |
| `npm run dev:frontend` | Start frontend only (port 3000) |
| `npm run migrate` | Run PostgreSQL migrations |
| `npx tsx scripts/seed-data.ts` | Load demo data |
| `npx vitest run` | Run all 65 tests |
| `npm run type-check` | TypeScript type checking |
| `npm run lint` | ESLint |

## License

Business Source License 1.1 — source-available, converts to open source after 4 years.

---

Built by [Julian Laycock](https://github.com/julianlaycock)