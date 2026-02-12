# CAELITH — Development Handoff Context
## Last updated: 2026-02-13

Paste this at the start of any new Claude conversation to resume development seamlessly. This document contains everything needed to continue building Caelith without repeating prior decisions.

---

## 1. WHAT IS CAELITH

Caelith is an AIFMD compliance orchestration platform for sub-€500M Luxembourg alternative investment fund managers (AIFMs). It automates investor eligibility checking, onboarding workflows, transfer validation, and decision provenance for SIF and RAIF fund structures under AIFMD 2.0 (effective April 16, 2026 — 63 days from Feb 13, 2026).

**Target user:** Compliance officers and fund administrators at small-mid AIFMs who currently manage eligibility and onboarding in spreadsheets.

**Core value proposition:** Every compliance decision (eligibility check, transfer validation, onboarding approval) creates an immutable, hash-chained, auditable decision record with regulatory citations. This is the "Decision Provenance Engine."

**Repository:** https://github.com/julianlaycock/caelith (private)
**Local path:** `C:\Users\julia\projects\private-asset-registry_Caelith_v2`
**Production URL:** https://caelith.tech (Railway.app — backend + frontend + PostgreSQL)

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js + TypeScript |
| Database | PostgreSQL 16 (Docker locally on port 5433, Railway in production) |
| Frontend | Next.js 14 + Tailwind CSS + TypeScript |
| AI | @anthropic-ai/sdk (Claude Sonnet) for NL rule compiler + upcoming copilot |
| PDF | PDFKit for cap table PDF export |
| Testing | Vitest (96 tests, all passing) |
| Auth | JWT (bcryptjs + jsonwebtoken), 3 RBAC roles |
| Integrity | Server-side SHA-256 hash chain on decision records |
| Hosting | Railway.app (backend + frontend + PostgreSQL) |
| Domain | caelith.tech via IONOS |

**Ports (local):** Backend: 3001, Frontend: 3000, PostgreSQL: 5433

**Environment variables:**
```
DATABASE_URL=postgresql://codex:codex@localhost:5433/codex
JWT_SECRET=<random 32+ chars>
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
ANTHROPIC_API_KEY=<your-key>  # Required for Sprint 2 (RAG + Copilot)
```

**Running the project:**
```powershell
# Terminal 1 — Backend
cd C:\Users\julia\projects\private-asset-registry_Caelith_v2
npx tsx src/backend/server.ts

# Terminal 2 — Frontend
cd C:\Users\julia\projects\private-asset-registry_Caelith_v2\src\frontend
npm run dev

# Terminal 3 — Database (Docker must be running)
# PostgreSQL runs via Docker on port 5433
```

**Key commands:**
```powershell
npx tsc --project tsconfig.backend.json --noEmit  # Backend TypeScript check
cd src/frontend && npm run build                   # Frontend build check
npx vitest run                                     # Run all 96 tests (backend must be running)
npx tsx scripts/seed-demo.ts                       # Seed demo data (idempotent)
npx tsx scripts/seed-showcase.ts                   # Seed showcase data (richer)
npm run seed                                       # Alias for seed-demo
```

**Default admin credentials:** `admin@caelith.com` / `admin1234`

---

## 3. PROJECT STRUCTURE

```
src/
  backend/
    server.ts                    # Express app, route mounting, /api/reset endpoint, CORS
    db.ts                        # PostgreSQL pool, query(), execute(), getPool(), DEFAULT_TENANT_ID, withTenant()
    middleware/
      auth.ts                    # JWT authenticate + authorize middleware (extracts tenantId from JWT)
    models/
      index.ts                   # All TypeScript interfaces (includes tenantId on User, chain fields on DecisionRecord)
    repositories/
      asset-repository.ts
      investor-repository.ts
      holding-repository.ts
      rules-repository.ts
      event-repository.ts
      fund-structure-repository.ts
      eligibility-criteria-repository.ts
      decision-record-repository.ts  # Calls sealRecord() after every INSERT
      onboarding-repository.ts
    services/
      transfer-service.ts        # simulateTransfer + executeTransfer with AIFMD eligibility
      eligibility-service.ts     # 6-check eligibility logic
      onboarding-service.ts      # 4-step workflow: apply → checkEligibility → review → allocate
      compliance-report-service.ts # Fund-level compliance snapshot with risk flags
      composite-rules-service.ts
      webhook-service.ts
      cap-table-pdf.ts
      nl-rule-compiler.ts        # Claude API: NL → composite rule JSON (code-complete, needs ANTHROPIC_API_KEY)
      auth-service.ts            # JWT generation (includes tenantId in payload)
      integrity-service.ts       # NEW (Sprint 1) — hash chain: computeRecordHash(), sealRecord(), verifyChain(), sealAllUnsealed()
    routes/
      asset-routes.ts
      investor-routes.ts
      holding-routes.ts
      rules-routes.ts
      transfer-routes.ts
      event-routes.ts
      fund-structure-routes.ts
      eligibility-routes.ts      # POST /check + POST /criteria
      decision-record-routes.ts  # Includes /verify-chain, /seal-all, tenant filtering
      onboarding-routes.ts
      compliance-report-routes.ts
      nl-rules-routes.ts         # POST /from-natural-language
      composite-rules-routes.ts
      webhook-routes.ts
      auth-routes.ts
      tenant-routes.ts           # NEW (Sprint 1) — GET /current, GET / (admin)
  frontend/
    src/
      app/
        page.tsx                 # Command Center Dashboard (empty-state suggests seed:showcase)
        layout.tsx
        globals.css              # Green institutional palette
        login/page.tsx           # Split-screen login
        funds/page.tsx           # Fund Structures list
        funds/[id]/page.tsx      # Fund detail + compliance report
        investors/page.tsx       # Investor registry
        holdings/page.tsx
        onboarding/page.tsx      # Onboarding pipeline (Kanban)
        transfers/page.tsx
        decisions/page.tsx       # Decision audit trail — server-side hash chain display + "Verify Chain" button
        rules/page.tsx
        audit/page.tsx           # Legacy audit trail
        assets/page.tsx          # Legacy assets page
      components/
        sidebar.tsx              # Dark green sidebar with section groups
        ui.tsx                   # Card, MetricCard, Badge, StatusDot, etc.
        charts.tsx               # Dashboard data visualizations (5 charts)
        auth-provider.tsx
        auth-layout.tsx
      lib/
        api.ts                   # ApiClient class — includes verifyDecisionChain()
        types.ts                 # Frontend types — DecisionRecord includes sequence_number, integrity_hash, previous_hash
        utils.ts
        hooks.ts
    tailwind.config.ts           # Custom green palette (brand, surface, ink, edge tokens)
migrations/
  001_initial_schema.sql through 017_integrity_chain.sql  # 17 migrations total
scripts/
  seed-demo.ts                   # Idempotent demo data seeder (creates default tenant, seals decision records)
  seed-showcase.ts               # Richer showcase seeder
docker/
  init.sql                       # All 17 migrations concatenated
tests/
  e2e/
    happy-path.test.ts           # 10 tests
    validation-failures.test.ts  # 8 tests
    audit-trail.test.ts          # 10 tests
    composite-rules.test.ts      # 6 tests
    eligibility.test.ts          # 8 tests
    onboarding.test.ts           # 12 tests
    compliance-report.test.ts    # 6 tests
    transfer-eligibility.test.ts # 5 tests
  unit/
    repositories.test.ts         # 2 tests
  fixtures/
    api-helper.ts                # test HTTP helper + resetDb()
src/rules-engine/
  validator.test.ts              # 20 tests
  composite.test.ts              # 9 tests
```

---

## 4. DATABASE SCHEMA (17 migrations applied)

**Core tables:** users, assets, investors, holdings, transfers, rules, rule_versions, composite_rules, events, webhooks, webhook_deliveries

**Vertical B tables (AIFMD):** fund_structures, eligibility_criteria, decision_records, onboarding_records, regulatory_documents

**Multi-tenancy table (Sprint 1):** tenants

**Key relationships:**
- `assets.fund_structure_id` → `fund_structures.id`
- `eligibility_criteria.fund_structure_id` → `fund_structures.id`
- `decision_records.asset_id` → `assets.id`
- `onboarding_records.investor_id/asset_id` → investors/assets
- `onboarding_records.eligibility_decision_id/approval_decision_id` → `decision_records.id`
- `transfers.decision_record_id` → `decision_records.id`
- ALL tables have `tenant_id` → `tenants.id` (FK, NOT NULL, DEFAULT to demo tenant)

### Tenants table (Migration 016)
```
tenants: id (UUID PK), name, slug (UNIQUE), domain, settings (JSONB), max_funds, max_investors,
         status CHECK ('active','suspended','trial','closed'), created_at, updated_at
```
**Default tenant:** `00000000-0000-0000-0000-000000000099` ("Caelith Demo", slug: "demo")

### Decision records integrity columns (Migration 017)
```
decision_records additions: sequence_number (SERIAL, UNIQUE INDEX),
                           integrity_hash (VARCHAR(64)),
                           previous_hash (VARCHAR(64))
```
Genesis hash: `0000000000000000000000000000000000000000000000000000000000000000`

### Critical CHECK constraints
- `fund_structures.legal_form` IN ('SICAV', 'SIF', 'RAIF', 'SCSp', 'SCA', 'ELTIF', 'Spezial_AIF', 'Publikums_AIF', 'QIAIF', 'RIAIF', 'LP', 'other')
- `fund_structures.regulatory_framework` IN ('AIFMD', 'UCITS', 'ELTIF', 'national')
- `fund_structures.status` IN ('active', 'closing', 'closed', 'liquidating')
- `investors.investor_type` IN ('institutional', 'professional', 'semi_professional', 'well_informed', 'retail')
- `investors.kyc_status` IN ('pending', 'verified', 'expired')
- `tenants.status` IN ('active', 'suspended', 'trial', 'closed')

**Eligibility criteria:** `minimum_investment` is stored in **cents** (integer). €125,000 = 12500000.
**decision_records.decided_by:** UUID FK to users table. For automated checks, use `NULL`.

---

## 5. API SURFACE

All routes require JWT auth (`Authorization: Bearer <token>`) except `/api/auth/register` and `/api/auth/login`.

```
POST   /api/auth/register
POST   /api/auth/login                       # JWT now includes tenantId claim

GET    /api/assets
POST   /api/assets
GET    /api/assets/:id
GET    /api/assets/:id/utilization

GET    /api/investors
POST   /api/investors
GET    /api/investors/:id
PATCH  /api/investors/:id

GET    /api/holdings?assetId=X
POST   /api/holdings
GET    /api/holdings/cap-table/:assetId
GET    /api/holdings/cap-table/:assetId/pdf

GET    /api/rules/:assetId
POST   /api/rules
GET    /api/rules/:assetId/versions

GET    /api/composite-rules?assetId=X
POST   /api/composite-rules
PATCH  /api/composite-rules/:id
DELETE /api/composite-rules/:id

POST   /api/transfers/simulate
POST   /api/transfers
GET    /api/transfers
GET    /api/transfers/history/:assetId

GET    /api/fund-structures
POST   /api/fund-structures
GET    /api/fund-structures/:id

POST   /api/eligibility/check
POST   /api/eligibility/criteria

GET    /api/decisions/verify-chain           # Sprint 1 — verify integrity hash chain
POST   /api/decisions/seal-all              # Sprint 1 — backfill unsealed records (admin)
GET    /api/decisions                       # Lists all — includes sequence_number, integrity_hash, previous_hash
GET    /api/decisions/:id
GET    /api/decisions/asset/:assetId
GET    /api/decisions/investor/:investorId

POST   /api/onboarding
POST   /api/onboarding/:id/check-eligibility
POST   /api/onboarding/:id/review
POST   /api/onboarding/:id/allocate
GET    /api/onboarding/:id
GET    /api/onboarding?asset_id=X

GET    /api/reports/compliance/:fundStructureId

POST   /api/nl-rules/from-natural-language   # Needs ANTHROPIC_API_KEY

GET    /api/tenants/current                  # Sprint 1 — current tenant info
GET    /api/tenants                          # Sprint 1 — list all (admin)

GET    /api/events
POST   /api/reset                            # Dev only — gated by NODE_ENV
```

---

## 6. DEVELOPMENT HISTORY — COMPLETED WORK

### Pre-Sprint (Phases 1-3) — All Complete
- PostgreSQL migration from SQLite (15 migrations)
- JWT auth + 3 RBAC roles (admin, compliance_officer, viewer)
- 7 built-in transfer validation rules + composite AND/OR/NOT rules
- Transfer simulation + execution with decision records
- Eligibility checking with 6 regulatory checks and citations
- Onboarding workflow: 4-step state machine (applied → eligible → approved → allocated)
- Fund structure modeling (SIF, RAIF, ELTIF, etc.)
- Investor classification (5-tier: institutional → retail)
- Compliance PDF export, webhook system (HMAC-SHA256)
- NL rule compiler (code-complete, untested live)
- EU regulatory templates (MiFID II, AIFMD, DLT Pilot, MiCA, DACH)
- Full frontend redesign: institutional green design system, 10+ pages
- Dashboard with 5 data visualization charts

### Sprint 0: Stabilize (Feb 11-12) — ✅ COMPLETE, tag `sprint-0-stable`
- 9 stress test fixes: PostgreSQL placeholders, transfer whitelist UI, eligibility modal, decisions hash chain, KYC chart, auth guards, admin normalization, PDF pagination, legacy page polish
- `.gitignore` updated: `dist/` excluded
- "New Application" button added to onboarding Kanban

### Sprint 1: Foundations (Feb 12-13) — ✅ COMPLETE, tag `sprint-1-foundations`
**1A. Multi-Tenancy Infrastructure:**
- Migration 016: `tenants` table + `tenant_id` column on all 16 core tables
- Default tenant `00000000-0000-0000-0000-000000000099` ("Caelith Demo")
- All existing data backfilled to default tenant
- JWT carries `tenantId`, auth middleware extracts it
- `DEFAULT_TENANT_ID` constant + `withTenant()` helper in db.ts
- Tenant API routes: GET /current, GET / (admin)
- RLS policies written as comments, ready to enable

**1B. Blockchain Audit Log (Server-Side Hash Chain):**
- Migration 017: `sequence_number`, `integrity_hash`, `previous_hash` on decision_records
- `integrity-service.ts`: computeRecordHash(), sealRecord(), verifyChain(), sealAllUnsealed()
- decision-record-repository.ts calls sealRecord() after every INSERT
- GET /api/decisions/verify-chain — walk chain, recompute hashes, detect tampering
- POST /api/decisions/seal-all — backfill unsealed records
- Frontend: server-side hashes replace client-side computation, "Verify Chain" button with green/red banner
- Seed scripts call sealAllUnsealed() after seeding

---

## 7. SPRINT PLAN — REMAINING WORK

| Sprint | Dates | Scope | Status |
|--------|-------|-------|--------|
| 0 | Feb 11-12 | Stabilize + stress test fixes | ✅ DONE |
| 1 | Feb 12-13 | Multi-tenancy + blockchain audit log | ✅ DONE |
| **2** | **NEXT** | **RAG pipeline + NL compiler live + copilot chat** | **← START HERE** |
| 3 | TBD | MCP server (7 tools) + visual rule builder | Planned |
| 4 | TBD | On-chain export + investor detail + OpenAPI | Planned |
| 5 | Apr 14-16 | Polish + deploy + demo script | Planned |

**Sprint 2 scope (AI Layer):**
- 2A: RAG Pipeline — pgvector extension, ingest 6 regulatory PDFs (chunk by article/section, embed, store), query endpoint with cosine similarity + citations
- 2B: NL Compiler Live — already code-complete, needs live API test + error handling + frontend integration
- 2C: Compliance Copilot — slide-out chat panel, intent classification (explain decision / regulatory Q&A / draft rule / what-if), server-side orchestration with Claude API

**Sprint 2 prerequisites (all met):**
- ✅ Anthropic API credits funded
- ☐ pgvector extension enabled in PostgreSQL: `CREATE EXTENSION IF NOT EXISTS vector;`
- ☐ ANTHROPIC_API_KEY in .env and Railway

See `PILOT_EXECUTION_PLAN.md` for full Sprint 2 file-level specification.

---

## 8. SEED DATA

Run `npx tsx scripts/seed-demo.ts` to populate demo data (idempotent). Creates:

| Entity | Details |
|--------|---------|
| **Tenant** | Caelith Demo (ID: ...0099) |
| **Fund Structures** | Luxembourg SIF Alpha (ID: ...0001), Luxembourg RAIF Beta (ID: ...0002) |
| **Eligibility Criteria** | 6 records: professional/semi_pro/institutional × SIF/RAIF |
| **Assets** | SIF Class A (1M units @€1), SIF Class B (500K @€10), RAIF Class A (2M @€1) |
| **Rules** | 3 permissive rule sets (one per asset) |
| **Investors** | Marie Laurent (FR, professional), Klaus Schmidt (DE, semi_pro, KYC expires 2026-05-15), Acme Capital (LU, institutional) |
| **Holdings** | Marie: 200K SIF-A, Klaus: 150K SIF-A, Acme: 400K SIF-A + 500K RAIF-A |
| **Decision Records** | 3 sealed records with verified hash chain |

**Risk flag triggers:** Acme at 40% concentration in SIF-A (>25% threshold), Klaus KYC expiring within ~90 days.

Fixed UUIDs: Fund structures `...0001` (SIF), `...0002` (RAIF). Default tenant `...0099`.

---

## 9. REGULATORY SOURCES (VERIFIED)

| Fund Type | Source | Key Rule |
|-----------|--------|----------|
| Luxembourg SIF | SIF Law 13 Feb 2007, Art. 2 | Well-informed investors only; €125K minimum for semi-professional |
| Luxembourg RAIF | RAIF Law 23 Jul 2016, Art. 3 | Same as SIF (mirrors SIF investor requirements) |
| ELTIF 2.0 | Regulation (EU) 2023/606 | €0 minimum for retail (old €10K minimum removed) |

**DO NOT use** "CSSF Circular 15/633" as source for SIF eligibility — that circular is about financial reporting, not investor eligibility.

**DO NOT use** "SIF Law 13 Feb 2007" as the `regulatory_framework` value in fund_structures — the CHECK constraint requires one of: 'AIFMD', 'UCITS', 'ELTIF', 'national'. Use 'AIFMD'. The law citation goes in `eligibility_criteria.source_reference`.

---

## 10. KNOWN ISSUES & DECISIONS

1. **NL compiler live test pending** — Code complete, API credits funded, needs live validation in Sprint 2.

2. **RAG pipeline next** — Table `regulatory_documents` exists with pgvector-ready column. 6 regulatory PDFs in project files. Sprint 2 will ingest and enable queries.

3. **Multi-tenancy is schema-ready, not RLS-enforced** — tenant_id columns exist on all tables, JWT carries tenantId, but PostgreSQL RLS policies are commented out. Application-level filtering via `withTenant()`. RLS can be enabled later without schema changes.

4. **E2E tests require running backend** — `npx vitest run` needs `npx tsx src/backend/server.ts` running in another terminal. Unit tests (rules-engine) run independently.

5. **`.env` security** — `.env` was accidentally committed early in project history. Now in `.gitignore` and untracked. Old API keys rotated.

6. **`/api/reset` endpoint** — gated behind `NODE_ENV !== 'production'`. Returns 403 in production.

7. **Production deployment** — Railway.app with PostgreSQL. Three services: backend, frontend, Postgres. Trial plan ($5 credit) — needs upgrade to Hobby ($5/month) soon.

8. **decided_by field** — `decision_records.decided_by` is UUID FK to users, not a string. Automated eligibility checks use `NULL`.

---

## 11. WORKFLOW & CONVENTIONS

**Git workflow:** Direct to main (solo developer). Commit after each sprint.
**Tags:** `phase-3-complete`, `sprint-0-stable`, `sprint-1-foundations`
**Commit message format:** `feat:`, `fix:`, `test:`, `docs:`

**TypeScript:** Backend: `npx tsc --project tsconfig.backend.json --noEmit`. Frontend: `npm run build`. Both must be clean.

**Route handler pattern:** `async (req: Request, res: Response): Promise<void>` with explicit `return;` after `res.status().json()`.
**Error pattern:** `err: unknown` + `instanceof Error`. Codes: `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`.

**Frontend:** All colors use design system tokens (brand, surface, ink, edge). No raw slate/blue/emerald/indigo. Font: DM Sans (body) + JetBrains Mono (data/IDs).

**Agent workflow:** For complex multi-file changes, we generate detailed prompts (markdown files) with exact file paths, constraints, DB CHECK values, and verification commands to feed to Claude agent in VS Code.

---

## 12. PROJECT FILES IN CONTEXT

These files are available in `/mnt/project/` and contain the full specifications:

| File | Contents |
|------|----------|
| `PILOT_EXECUTION_PLAN.md` | 6-sprint execution plan with file-level specs for each sprint |
| `HANDOFF_CONTEXT.md` | This document |
| `20260210_Technical_Report.md` | Technical architecture report |
| `cssf15_633eng.pdf` | CSSF Circular 15/633 (financial reporting — NOT SIF eligibility) |
| `L_230716_RAIF_eng.pdf` | RAIF Law 23 Jul 2016 |
| `CELEX_32023R0606_EN_TXT.pdf` | ELTIF 2.0 Regulation (EU) 2023/606 |
| `CBI_AIFMD_QA.pdf` | Central Bank of Ireland AIFMD Q&A |
| `CELEX_32011L0061_EN_TXT.pdf` | AIFMD Directive 2011/61/EU |
| `cssf18_698eng.pdf` | CSSF Circular 18/698 |

---

## 13. QUICK START FOR NEW CONVERSATION

After pasting this document, say:

> "I'm continuing Caelith development. Sprints 0 and 1 are complete (multi-tenancy + blockchain audit log). API credits are funded. Generate the Sprint 2 prompt: RAG pipeline + NL compiler live + Compliance copilot. See PILOT_EXECUTION_PLAN.md for the detailed spec."

The AI should then:
1. Search project knowledge for PILOT_EXECUTION_PLAN.md (Sprint 2 section)
2. Check current file structure and existing services
3. Generate Sprint 2 prompt with exact file paths, constraints, and verification commands
