# CAELITH — Development Handoff Context
## Last updated: 2026-02-13 (post Sprint 3)

Paste this at the start of any new Claude conversation to resume development seamlessly. This document contains everything needed to continue building Caelith without repeating prior decisions.

---

## 1. WHAT IS CAELITH

Caelith is an AIFMD compliance orchestration platform for sub-€500M Luxembourg alternative investment fund managers (AIFMs). It automates investor eligibility checking, onboarding workflows, transfer validation, and decision provenance for SIF and RAIF fund structures under AIFMD 2.0 (effective April 16, 2026 — 62 days from Feb 13, 2026).

**Target user:** Compliance officers and fund administrators at small-mid AIFMs who currently manage eligibility and onboarding in spreadsheets.

**Core value proposition:** Every compliance decision (eligibility check, transfer validation, onboarding approval) creates an immutable, hash-chained, auditable decision record with regulatory citations. This is the "Decision Provenance Engine."

**Repository:** https://github.com/julianlaycock/caelith (private)
**Local path:** `C:\Users\julia\projects\private-asset-registry_Caelith_v2`
**Production URL:** https://caelith.tech (Railway.app — backend + frontend + PostgreSQL)

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20 + Express.js 4.18 + TypeScript 5 (strict) |
| Database | PostgreSQL 16 + pgvector 0.8.1 (Docker locally on port 5432) |
| Frontend | Next.js 14 + Tailwind CSS + TypeScript + Recharts |
| AI — Copilot/NL | @anthropic-ai/sdk ^0.74.0 (Claude Sonnet) for copilot + NL rule compiler |
| AI — Embeddings | OpenAI text-embedding-3-small (1536 dimensions) via openai SDK |
| MCP | @modelcontextprotocol/sdk ^1.26.0 for AI agent integration |
| PDF | PDFKit for cap table PDF export |
| Testing | Vitest (96 tests, all passing) |
| Auth | JWT (bcrypt + jsonwebtoken), 3 RBAC roles (admin, compliance_officer, viewer) |
| Integrity | Server-side SHA-256 hash chain on decision records |
| Hosting | Railway.app (backend + frontend + PostgreSQL) |
| Domain | caelith.tech via IONOS |

**Ports (local):** Backend: 3001, Frontend: 3000, PostgreSQL: 5432

**Environment variables:**
```
DATABASE_URL=postgresql://caelith:caelith@localhost:5432/caelith
JWT_SECRET=<random 32+ chars>
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
ANTHROPIC_API_KEY=<your-key>       # Copilot, NL compiler
OPENAI_API_KEY=<your-key>          # Embeddings only
EMBEDDING_PROVIDER=openai
LOG_LEVEL=info
```

**Running the project:**
```powershell
# Terminal 1 — Database (Docker must be running)
docker-compose up -d db

# Terminal 2 — Backend
cd C:\Users\julia\projects\private-asset-registry_Caelith_v2
npx tsx src/backend/server.ts

# Terminal 3 — Frontend
cd C:\Users\julia\projects\private-asset-registry_Caelith_v2\src\frontend
npm run dev
```

**Key commands:**
```powershell
npx tsc --project tsconfig.backend.json --noEmit   # Backend TypeScript check
cd src/frontend && npm run build                    # Frontend build check
npx vitest run                                      # Run all 96 tests (backend must be running)
npx tsx scripts/seed-demo.ts                        # Seed demo data (idempotent)
npx tsx scripts/seed-showcase.ts                    # Seed showcase data (richer)
npx tsx scripts/ingest-regulations.ts               # Ingest 6 regulatory PDFs into RAG pipeline
```

**Default admin credentials:** `admin@caelith.com` / `admin1234`

---

## 3. PROJECT STRUCTURE

```
src/
  backend/
    server.ts                    # Express app, route mounting, ensureAdminUser(), CORS
    db.ts                        # PostgreSQL pool, query(), execute(), withTenant() (splice-based param ordering)
    middleware/
      auth.ts                    # JWT authenticate + authorize middleware (extracts tenantId from JWT)
      security.ts                # Rate limiting, security headers, sanitizeInput
    models/
      index.ts                   # All TypeScript interfaces
    repositories/
      asset-repository.ts        investor-repository.ts
      holding-repository.ts      rules-repository.ts
      event-repository.ts        fund-structure-repository.ts
      eligibility-criteria-repository.ts
      decision-record-repository.ts  # Calls sealRecord() after every INSERT
      onboarding-repository.ts   transfer-repository.ts
    services/
      auth-service.ts            # JWT, password hashing, account lockout
      eligibility-service.ts     # 6-check eligibility logic
      transfer-service.ts        # simulateTransfer + executeTransfer with AIFMD eligibility
      onboarding-service.ts      # 4-step workflow: apply → checkEligibility → review → allocate
      compliance-report-service.ts  # Fund-level compliance snapshot with risk flags
      integrity-service.ts       # Hash chain: computeRecordHash(), sealRecord(), verifyChain()
      nl-rule-compiler.ts        # Claude API: NL → composite rule JSON (LIVE)
      rag-service.ts             # NEW (Sprint 2) — ingest, query, suggestRules via pgvector
      embedding-service.ts       # NEW (Sprint 2) — OpenAI text-embedding-3-small wrapper
      copilot-service.ts         # NEW (Sprint 2) — 4-intent classification + orchestration
      composite-rules-service.ts
      webhook-service.ts
      cap-table-pdf.ts
      holding-service.ts
      investor-service.ts
      asset-service.ts
      rules-service.ts
    routes/
      asset-routes.ts            investor-routes.ts
      auth-routes.ts             nl-rules-routes.ts
      compliance-report-routes.ts  onboarding-routes.ts
      composite-rules-routes.ts  regulatory-routes.ts    # NEW (Sprint 2)
      copilot-routes.ts          rules-routes.ts         # NEW (Sprint 2)
      decision-record-routes.ts  template-routes.ts
      eligibility-routes.ts      tenant-routes.ts
      event-routes.ts            transfer-routes.ts
      fund-structure-routes.ts   webhook-routes.ts
      holding-routes.ts
  frontend/
    src/
      app/
        page.tsx                 # Command Center Dashboard
        layout.tsx               # Root layout + copilot toggle
        globals.css              # Green institutional palette
        login/page.tsx           # Split-screen login
        funds/page.tsx           # Fund Structures list
        funds/[id]/page.tsx      # Fund detail + compliance report
        investors/page.tsx       # Investor registry
        holdings/page.tsx
        onboarding/page.tsx      # Onboarding pipeline (Kanban)
        transfers/page.tsx
        decisions/page.tsx       # Decision audit trail — hash chain + "Verify Chain"
        rules/page.tsx
        rules/builder/page.tsx   # NEW (Sprint 3) — Visual rule builder
        audit/page.tsx           # Legacy audit trail
        assets/page.tsx          # Legacy assets page
        jurisdiction/[code]/page.tsx
        not-found.tsx
      components/
        sidebar.tsx              # Dark green sidebar with section groups
        ui.tsx                   # Card, MetricCard, Badge, StatusDot, etc.
        charts.tsx               # Dashboard data visualizations (5 charts)
        copilot.tsx              # NEW (Sprint 2) — Slide-out chat panel
        error-boundary.tsx       # NEW (Sprint 3)
        auth-provider.tsx
        auth-layout.tsx
        rule-builder/            # NEW (Sprint 3) — 8 files
          index.ts, condition-group.tsx, condition-row.tsx,
          field-config.ts, nl-integration.tsx,
          operator-toggle.tsx, rule-preview.tsx, rule-test-panel.tsx
      lib/
        api.ts                   # ApiClient class
        types.ts                 # Frontend types
        utils.ts
        hooks.ts
  mcp/                           # NEW (Sprint 3)
    server.ts                    # MCP server — 7 read-only tools
migrations/
  001_initial_schema.sql through 019_security_hardening.sql  # 19 migrations total
scripts/
  seed-demo.ts                   seed-showcase.ts
  seed-data.ts                   ingest-regulations.ts      # NEW (Sprint 2)
  migrate.ts                     normalize-admin-user.ts
  test-api.ts                    rebuild-init-sql.sh
  clean-next-cache.js            free-port.js
  run-tests.ps1
docker/
  init.sql                       # Combined migration for fresh Docker builds
```

---

## 4. DATABASE SCHEMA (19 migrations applied)

**Core tables:** users, assets, investors, holdings, transfers, rules, rule_versions, composite_rules, events, webhooks, webhook_deliveries

**AIFMD tables:** fund_structures, eligibility_criteria, decision_records, onboarding_records, regulatory_documents

**Infrastructure tables:** tenants, login_attempts (019), refresh_tokens (019)

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

### Regulatory embeddings (Migration 018)
```
regulatory_documents additions: document_title VARCHAR(255),
                                embedding vector(1536)
Indexes: ivfflat (embedding vector_cosine_ops) WITH (lists=100),
         btree (tenant_id, document_title),
         UNIQUE (source_name, chunk_index)
```

### Security hardening (Migration 019)
```
login_attempts: id, user_id, ip_address, success, created_at
refresh_tokens: id, user_id, token_hash, expires_at, revoked, created_at
+ RLS policies on core tables
```

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

**Base URL:** `http://localhost:3001/api`

### Core CRUD
- Assets: POST, GET, GET /:id, GET /:id/utilization
- Investors: POST, GET, GET /:id, PATCH /:id
- Holdings: POST, GET (?assetId, ?investorId), GET /cap-table/:assetId
- Rules: POST, GET /:assetId
- Transfers: POST /simulate, POST, GET (?assetId), GET /history/:assetId
- Events: GET (?entityType, ?entityId, ?eventType)

### AIFMD Compliance
- Eligibility: POST /check, POST /criteria
- Fund Structures: POST, GET, GET /:id, PATCH /:id
- Decision Records: GET, GET /:id, GET /verify-chain, POST /seal-all
- Onboarding: POST /apply, POST /:id/check-eligibility, POST /:id/review, POST /:id/allocate, GET, GET /:id
- Compliance Reports: GET /fund/:fundId

### AI Layer (Sprint 2)
- Regulatory: POST /ingest (admin), POST /query, POST /suggest-rules
- Copilot: POST /chat
- NL Rules: POST /from-natural-language

### Infrastructure
- Auth: POST /register, POST /login
- Tenants: GET /current, GET / (admin)
- Templates: GET /
- Composite Rules: POST, GET, GET /:id, DELETE /:id
- Webhooks: POST, GET, DELETE /:id

---

## 6. DEVELOPMENT HISTORY — COMPLETED WORK

### Pre-Sprint (Phases 1-3) — All Complete
- PostgreSQL migration from SQLite (15 migrations)
- JWT auth + 3 RBAC roles (admin, compliance_officer, viewer)
- 7 built-in transfer validation rules + composite AND/OR/NOT rules
- Transfer simulation + execution with decision records
- Eligibility checking with 6 regulatory checks and citations
- Onboarding workflow: 4-step state machine
- Fund structure modeling (SIF, RAIF, ELTIF, etc.)
- Investor classification (5-tier: institutional → retail)
- Compliance PDF export, webhook system (HMAC-SHA256)
- EU regulatory templates (MiFID II, AIFMD, DLT Pilot, MiCA, DACH)
- Full frontend redesign: institutional green design system, 15 pages
- Dashboard with 5 data visualization charts

### Sprint 0: Stabilize (Feb 11-12) — ✅ COMPLETE, tag `sprint-0-stable`
- 9 stress test fixes
- `.gitignore` updated, "New Application" button added

### Sprint 1: Foundations (Feb 12-13) — ✅ COMPLETE, tag `sprint-1-foundations`
- **1A. Multi-Tenancy:** Migration 016, tenant_id on all tables, withTenant() helper, JWT carries tenantId
- **1B. Blockchain Audit Log:** Migration 017, integrity-service.ts, sealRecord() on every decision insert, verify-chain endpoint
- **Critical bug found & fixed:** withTenant() parameter ordering — splice-based insertion instead of append (was root cause of 27 test failures)

### Sprint 2: AI Layer (Feb 13) — ✅ COMPLETE, tag `sprint-2-ai-layer`
- **2A. RAG Pipeline:** Migration 018 (pgvector embeddings), rag-service.ts, embedding-service.ts (OpenAI text-embedding-3-small), regulatory-routes.ts, ingest-regulations.ts script
- **2B. NL Compiler Live:** nl-rule-compiler.ts tested with real Anthropic API, error handling added
- **2C. Compliance Copilot:** copilot-service.ts (4-intent classification), copilot-routes.ts, copilot.tsx (slide-out panel)
- **Corpus:** 6 regulatory PDFs ingested → 1,246 chunks with embeddings in regulatory_documents

### Sprint 3: MCP + Rule Builder (Feb 13) — ✅ COMPLETE, tag `sprint-3-integration`
- **3A. MCP Server:** src/mcp/server.ts with 7 read-only tools, tsconfig.mcp.json
- **3B. Visual Rule Builder:** 8 component files in rule-builder/, rules/builder/page.tsx, NL integration
- **Security:** Migration 019 (login_attempts, refresh_tokens, RLS policies), error-boundary component

---

## 7. SPRINT PLAN — REMAINING WORK

| Sprint | Dates | Scope | Status |
|--------|-------|-------|--------|
| 0 | Feb 11-12 | Stabilize + stress test fixes | ✅ DONE |
| 1 | Feb 12-13 | Multi-tenancy + blockchain audit log | ✅ DONE |
| 2 | Feb 13 | RAG pipeline + NL compiler live + copilot chat | ✅ DONE |
| 3 | Feb 13 | MCP server (7 tools) + visual rule builder + security | ✅ DONE |
| **4** | **NEXT** | **On-chain export + investor detail + OpenAPI** | **← START HERE** |
| 5 | Apr 14-16 | Polish + deploy + demo script | Planned |

**Sprint 4 scope (from PILOT_EXECUTION_PLAN.md):**
- On-chain export: ERC-3643 configuration JSON generated from sealed decision records
- Investor detail page: full investor profile with eligibility history, holdings, onboarding status
- OpenAPI: swagger annotations on all endpoints, served at /api/docs

See `PILOT_EXECUTION_PLAN.md` for full Sprint 4 file-level specification.

---

## 8. SEED DATA

Run `npx tsx scripts/seed-demo.ts` to populate demo data (idempotent). Creates:

| Entity | Count | Details |
|--------|-------|---------|
| Tenant | 1 | Caelith Demo (ID: ...0099) |
| Fund Structures | 4 | SIF, RAIF, + 2 others |
| Eligibility Criteria | 13 | Per fund structure × investor type |
| Assets | 9 | Multiple classes per fund |
| Rules | 9 | Permissive rule sets |
| Investors | 25 | Mix of professional, semi-professional, institutional |
| Holdings | 34 | Various allocations |
| Decision Records | 26 | All sealed with verified hash chain |
| Users | 4 | 2 admin, 2 viewer |
| Regulatory Documents | 1,246 | 6 PDFs chunked + embedded |

---

## 9. REGULATORY SOURCES (VERIFIED)

| Fund Type | Source | Key Rule |
|-----------|--------|----------|
| Luxembourg SIF | SIF Law 13 Feb 2007, Art. 2 | Well-informed investors only; €125K minimum for semi-professional |
| Luxembourg RAIF | RAIF Law 23 Jul 2016, Art. 3 | Same as SIF (mirrors SIF investor requirements) |
| ELTIF 2.0 | Regulation (EU) 2023/606 | €0 minimum for retail (old €10K minimum removed) |

**DO NOT use** "CSSF Circular 15/633" as source for SIF eligibility — that circular is about financial reporting, not investor eligibility.

**DO NOT use** "SIF Law 13 Feb 2007" as the `regulatory_framework` value in fund_structures — the CHECK constraint requires one of: 'AIFMD', 'UCITS', 'ELTIF', 'national'. Use 'AIFMD'. The law citation goes in `eligibility_criteria.source_reference`.

**RAG Corpus (ingested, 1,246 chunks):**
| Document | Jurisdiction | Chunks |
|----------|-------------|--------|
| AIFMD Directive 2011/61/EU | EU | 338 |
| ELTIF 2.0 Regulation (EU) 2023/606 | EU | 88 |
| CSSF Circular 15/633 | LU | 5 |
| CSSF Circular 18/698 | LU | 591 |
| RAIF Law 23 Jul 2016 | LU | 138 |
| CBI AIFMD Q&A | IE | 86 |

---

## 10. KNOWN ISSUES & DECISIONS

1. **Multi-tenancy is schema-ready, not fully RLS-enforced** — tenant_id columns exist on all tables, JWT carries tenantId, migration 019 added RLS policies, but application-level filtering via `withTenant()` is the primary mechanism. RLS can be fully enabled without schema changes.

2. **withTenant() uses splice-based parameter ordering** — Critical fix from Sprint 3: the tenant_id parameter is spliced at the correct insertion index (count of ? marks before the AND clause) rather than appended to the end of the params array. This prevents parameter misalignment when queries have ? marks in ORDER BY / CASE expressions.

3. **E2E tests require running backend** — `npx vitest run` needs `npx tsx src/backend/server.ts` running in another terminal. Unit tests (rules-engine, validator) run independently.

4. **`.env` is NOT in git** — Was accidentally committed early, caught by GitHub push protection. Removed from history via rebase. API keys rotated. `.env` is in `.gitignore`.

5. **`/api/reset` endpoint** — gated behind `NODE_ENV !== 'production'`. Returns 403 in production.

6. **Production deployment** — Railway.app with PostgreSQL. Trial plan ($5 credit) — needs upgrade to Hobby ($5/month) for sustained use.

7. **decided_by field** — `decision_records.decided_by` is UUID FK to users, not a string. Automated eligibility checks use `NULL`.

8. **Docker container name** — Local PostgreSQL container is `private-asset-registry_caelith_v2-db-1` (not `caelith-db`). Access via: `docker exec private-asset-registry_caelith_v2-db-1 psql -U caelith -d caelith`

9. **sql.js dependency** — Listed in package.json but likely unused (legacy from SQLite era). Safe to remove in cleanup.

---

## 11. WORKFLOW & CONVENTIONS

**Git workflow:** Direct to main (solo developer). Commit after each logical unit. PowerShell: use `;` not `&&` for command chaining.
**Tags:** `phase-3-complete`, `sprint-0-stable`, `sprint-1-foundations`, `sprint-2-ai-layer`, `sprint-3-integration`
**Commit message format:** `feat:`, `fix:`, `test:`, `docs:`, `chore:`

**TypeScript:** Backend: `npx tsc --project tsconfig.backend.json --noEmit`. Frontend: `cd src/frontend && npm run build`. Both must be clean.

**Route handler pattern:** `async (req: Request, res: Response): Promise<void>` with explicit `return;` after `res.status().json()`.
**Error pattern:** `err: unknown` + `instanceof Error`. Codes: `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`.

**Frontend:** All colors use design system tokens (brand, surface, ink, edge). No raw slate/blue/emerald/indigo. Font: DM Sans (body) + JetBrains Mono (data/IDs).

**Agent workflow:** For complex multi-file changes, generate detailed prompts (markdown files) with exact file paths, constraints, DB CHECK values, and verification commands to feed to Claude agent in VS Code.

---

## 12. QUICK START FOR NEW CONVERSATION

After pasting this document, say:

> "I'm continuing Caelith development. Sprints 0–3 are complete (multi-tenancy, blockchain audit log, RAG pipeline with 1,246 chunks, copilot, MCP server, visual rule builder). Sprint 4 is next: on-chain export + investor detail + OpenAPI. See PILOT_EXECUTION_PLAN.md for the detailed spec."

The AI should then:
1. Search project knowledge for PILOT_EXECUTION_PLAN.md (Sprint 4 section)
2. Check current file structure and existing services
3. Generate Sprint 4 prompt with exact file paths, constraints, and verification commands
