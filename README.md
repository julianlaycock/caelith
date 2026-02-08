# Private Asset Registry & Transfer Rules Engine

Programmable private asset ownership simulation with compliance rule enforcement. Manage investor registries, track unit allocations, configure transfer rules, and validate transfers against programmable constraints — all without blockchain infrastructure.

## Tech Stack

- **Backend**: Node.js + TypeScript + Express + SQLite (sql.js)
- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Rules Engine**: Custom TypeScript validation module
- **Testing**: Vitest (49 tests)

## Prerequisites

- Node.js 20.x+
- npm 10.x+

## Quick Start
```bash
# 1. Install dependencies
npm install
cd src/frontend && npm install && cd ../..

# 2. Run database migrations
npm run migrate

# 3. Start development servers
npm run dev
```

- Backend API: http://localhost:3001
- Frontend: http://localhost:3000

## API Reference

Base URL: `http://localhost:3001/api`

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /assets | Create asset |
| GET | /assets | List all assets |
| GET | /assets/:id | Get asset by ID |
| GET | /assets/:id/utilization | Get allocation stats |

### Investors
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /investors | Create investor |
| GET | /investors | List all investors |
| GET | /investors/:id | Get investor by ID |
| PATCH | /investors/:id | Update investor |

### Holdings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /holdings | Allocate units to investor |
| GET | /holdings?assetId=X | Get holdings for asset |
| GET | /holdings/cap-table/:assetId | Get cap table |

### Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /rules | Create/update rules for asset |
| GET | /rules/:assetId | Get active rules |

### Transfers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /transfers/simulate | Validate without executing |
| POST | /transfers | Execute transfer |
| GET | /transfers?assetId=X | Get transfers for asset |
| GET | /transfers/history/:assetId | Get history with names |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /events | Audit trail (filterable) |

Query params for events: `entityType`, `entityId`, `eventType`, `limit`

## Rules Engine

Four configurable constraints per asset:

| Rule | Field | Description |
|------|-------|-------------|
| Qualification | `qualification_required` | Receiver must be accredited |
| Lockup | `lockup_days` | Days after acquisition before transfer allowed |
| Jurisdiction | `jurisdiction_whitelist` | Allowed country codes for receiver |
| Whitelist | `transfer_whitelist` | Allowed investor IDs (null = unrestricted) |

Transfers are validated against all active rules. Violations are aggregated and returned.

## Testing
```bash
# Run all tests (requires backend running)
npm run dev:backend          # Terminal 1
npm run test -- --run        # Terminal 2

# Run only unit tests (no backend needed)
npm run test -- --run src/rules-engine/ tests/unit/

# Run only e2e tests (backend required)
npm run test -- --run tests/e2e/
```

Test suite: 49 tests total (20 rules engine, 2 repository, 27 e2e).

## Project Structure
```
private-asset-registry/
├── migrations/                # Database migrations
├── scripts/                   # Utility scripts
├── src/
│   ├── backend/
│   │   ├── models/            # TypeScript interfaces
│   │   ├── repositories/      # Data access layer
│   │   ├── services/          # Business logic
│   │   ├── routes/            # API endpoints
│   │   └── db.ts              # Database connection
│   ├── rules-engine/
│   │   ├── types.ts           # Validation types
│   │   ├── validator.ts       # Rule validation logic
│   │   └── validator.test.ts  # 20 unit tests
│   └── frontend/              # Next.js 14 app
├── tests/
│   ├── unit/                  # Repository tests
│   ├── e2e/                   # End-to-end API tests
│   └── fixtures/              # Test data
└── data/                      # SQLite database (gitignored)
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend |
| `npm run dev:backend` | Start backend only (port 3001) |
| `npm run dev:frontend` | Start frontend only (port 3000) |
| `npm run test -- --run` | Run all tests |
| `npm run migrate` | Run database migrations |
| `npm run type-check` | TypeScript compilation check |
| `npm run lint` | ESLint |
| `npm run format` | Prettier formatting |

## Documentation

See project root for detailed docs:

- `PRD.md` — Product requirements and scope
- `ARCHITECTURE.md` — System design and data flow
- `BUILD_PLAN.md` — Implementation phases
- `DATA_MODEL.md` — Database schema reference
- `WORKING_RULES.md` — Code conventions

## MVP Scope

This is a simulation-only MVP. Explicitly out of scope: blockchain integration, wallet management, payment processing, token issuance, authentication, and multi-tenancy.
'@