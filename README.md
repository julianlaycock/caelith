# Private Asset Registry & Transfer Rules Engine

Programmable private asset ownership simulation with compliance rule enforcement.

## Tech Stack

- **Backend**: Node.js + TypeScript + Express + SQLite
- **Frontend**: Next.js 14 + React + TypeScript + Tailwind
- **Rules Engine**: Custom TypeScript validation module

## Prerequisites

- Node.js 20.x LTS
- npm 10.x

## Quick Start

### 1. Install Dependencies
```bash
npm install
cd src/frontend && npm install && cd ../..
```

### 2. Environment Setup
```bash
copy .env.example .env
```

### 3. Database Setup
```bash
npm run migrate
```

### 4. Seed Data (Optional)
```bash
npm run seed
```

### 5. Start Development
```bash
npm run dev
```

- Backend API: http://localhost:3001
- Frontend: http://localhost:3000

## Project Structure
```
private-asset-registry/
├── docs/                      # Documentation
├── migrations/                # Database migrations
├── scripts/                   # Utility scripts
├── src/
│   ├── backend/              # Express API
│   │   ├── models/           # TypeScript types
│   │   ├── repositories/     # Data access layer
│   │   ├── services/         # Business logic
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Express middleware
│   │   └── utils/            # Helpers
│   ├── rules-engine/         # Transfer validation
│   └── frontend/             # Next.js app
├── tests/                    # Test files
└── data/                     # SQLite database (gitignored)
```

## Available Scripts

- `npm run dev` - Start backend + frontend
- `npm run dev:backend` - Start backend only
- `npm run dev:frontend` - Start frontend only
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed sample data
- `npm run lint` - Lint code
- `npm run format` - Format code

## Documentation

See `/docs` folder for:
- PRD.md - Product requirements
- ARCHITECTURE.md - System design
- BUILD_PLAN.md - Implementation phases
- WORKING_RULES.md - Code conventions
- DATA_MODEL.md - Database schema

## MVP Status

This is a simulation-only MVP. No blockchain, tokens, or actual custody.