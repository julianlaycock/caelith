Caelith Private Asset Registry — Technical Status Report
Prepared for: CTO

Date: 2026-02-10

System: Caelith Compliance Engine v0.1.0

1. Executive Summary
Caelith is an AIFMD-compliant private asset registry with a three-layer backend (repositories → services → routes), a Next.js 14 frontend, and a pure-function rules engine. The system implements full decision provenance, event sourcing, and a multi-step investor onboarding pipeline. 96 tests cover the core compliance workflows. The codebase is architecturally sound for an MVP but has measurable gaps in security configuration, observability, and scalability that must be addressed before production deployment.

2. Architecture Overview

┌─────────────────────┐       ┌──────────────────────────────────────────┐
│  Next.js 14 (React) │──REST─│  Express 4.18  (Node 20)                │
│  App Router + CSR   │       │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  Tailwind + Recharts│       │  │  Routes   │→│ Services │→│  Repos   │ │
│  Port 3000          │       │  └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────┘       │        │           │             │      │
                              │  ┌─────┴───┐ ┌────┴────┐  ┌─────┴────┐ │
                              │  │Auth/RBAC│ │Rules Eng│  │PostgreSQL│ │
                              │  │JWT+bcrypt│ │Pure Fns │  │   16     │ │
                              │  └─────────┘ └─────────┘  └──────────┘ │
                              │  Port 3001                             │
                              └──────────────────────────────────────────┘
Layer	Stack	Files
Frontend	Next.js 14.1, React 18, Tailwind 3.3, Recharts 3.7, TypeScript 5	15 pages, 4 components, 4 lib modules
Backend	Express 4.18, Node 20, TypeScript 5	10 repositories, 12 services, 15+ route files
Database	PostgreSQL 16 (prod), SQLite in-memory (tests)	15 migrations, UUID PKs, JSONB columns
Rules Engine	Pure TypeScript functions (no I/O)	validator.ts, composite.ts
Auth	JWT (24h), bcrypt (10 rounds), RBAC (admin/compliance_officer/viewer)	middleware/auth.ts, services/auth-service.ts
3. Feature Completeness
Fully Implemented
Asset CRUD (create, read, update, delete with holdings guard)
Investor management with KYC tracking (status, expiry, LEI, tax ID)
Holdings / cap table with utilization tracking
Transfer validation engine (lockup, jurisdiction, qualification, concentration)
Composite rules (AND/OR/NOT logic with conditional enforcement)
AIFMD eligibility checking with regulatory citations (CSSF 15/633, KAGB §1(6), CBI Rulebook)
Multi-step onboarding pipeline (apply → eligibility → approve/reject → allocate)
Decision provenance (input snapshot + rule version snapshot per decision)
Event sourcing audit trail (every mutation logged)
Fund structures with legal form, domicile, regulatory framework
Compliance status report with risk flag detection
Webhook integration with HMAC-SHA256 signing
Natural language rule compiler (Claude API integration)
PDF cap table export with institutional branding
Role-based access control (3 roles)
Dashboard with 5 Recharts visualizations (investor type, jurisdiction, KYC, violations, concentration)
Partially Implemented
OpenAPI spec exists but may not be fully synced with current routes
Regulatory document storage (migration exists, service layer unclear)
Not Implemented
Pagination (all list endpoints return full datasets)
Search / filtering UI
Real-time updates (WebSocket/SSE)
Refresh tokens / session management
Password reset flow
Email notifications
CI/CD pipeline (no GitHub Actions)
Observability (no structured logging, metrics, or tracing)
Dark mode
4. Test Coverage
Category	Location	Count	Scope
E2E (HTTP API)	tests/e2e/ (8 files)	76	Full workflow: auth → create → validate → transfer → audit
Unit (Repos)	tests/unit/repositories.test.ts	2	Repository CRUD + transfer workflow
Validator	src/rules-engine/validator.test.ts	20	Transfer validation rules (pure functions)
Composite Rules	src/rules-engine/composite.test.ts	~18	AND/OR/NOT rule evaluation
Total		96+	
Strengths: E2E tests cover every compliance workflow (eligibility, onboarding, transfers, audit trail, composite rules, validation failures). Test data fixtures are well-structured with api-helper.ts and test-data.ts.

Gaps:

No frontend tests (React Testing Library, Cypress, or Playwright)
No service-layer unit tests (business logic tested only through E2E)
No load/stress tests
No contract tests between frontend and backend
Test orchestration via PowerShell script only — no CI/CD integration
5. Critical Issues
5.1 Security
Issue	Severity	Location	Detail
CORS wide open	HIGH	server.ts:44	cors() with no origin restriction allows any domain to make authenticated requests
Credentials in localStorage	HIGH	login/page.tsx:46	"Remember me" stores { email, password } in plain text via localStorage
Token in localStorage	MEDIUM	auth-provider.tsx:12	JWT stored in localStorage, vulnerable to XSS; should use httpOnly cookies
No CSRF protection	MEDIUM	—	Stateless JWT with no CSRF tokens; mitigated only if cookies aren't used
Rate limiting in-memory	MEDIUM	security.ts	Map-based rate limiter resets on restart, no distributed support
Reset endpoint risk	LOW	server.ts:98-119	POST /api/reset gated by NODE_ENV !== 'production' — misconfigured env could destroy data
No password reset	LOW	—	Users locked out if password forgotten; no recovery flow
Recommendation: Fix CORS immediately (cors({ origin: process.env.ALLOWED_ORIGINS })). Replace localStorage token storage with httpOnly cookies. Remove plain-text credential storage from "Remember me". Implement Redis-backed rate limiting for multi-instance deployments.

5.2 Data Integrity
Issue	Severity	Detail
No database transactions	HIGH	Multi-step operations (onboarding: check → approve → allocate) are not atomic. Concurrent requests on the same investor/asset can cause inconsistent state.
No optimistic locking	MEDIUM	No version column or updated_at check on updates — last write wins silently
Race condition on holdings	MEDIUM	Two simultaneous allocations could exceed total_units — no SELECT FOR UPDATE
Recommendation: Wrap multi-step service operations in PostgreSQL transactions (BEGIN...COMMIT). Add SELECT ... FOR UPDATE on holdings/assets during allocation. Consider adding a version column for optimistic concurrency control.

5.3 Operational Readiness
Issue	Severity	Detail
No structured logging	HIGH	console.error only — no correlation IDs, log levels, or structured output
No health checks for dependencies	MEDIUM	/health returns 200 but doesn't verify DB connectivity
No CI/CD	MEDIUM	Manual PowerShell test execution; no automated build/test/deploy pipeline
No monitoring/alerting	MEDIUM	No metrics collection (request latency, error rates, DB pool utilization)
No graceful degradation	LOW	Webhook failures silently swallowed; no dead letter queue
Recommendation: Implement Pino for structured JSON logging with correlation IDs. Add a /health/ready endpoint that pings the database. Set up GitHub Actions for automated test runs on PR. Integrate an APM solution (Datadog, New Relic, or open-source: Prometheus + Grafana).

6. Efficiency Improvements
6.1 Backend
Improvement	Impact	Effort	Detail
Add Zod schema validation	HIGH	LOW	Replace manual field-by-field validation in routes with Zod schemas. Current approach is inconsistent and error-prone — some routes validate, others don't. Zod gives runtime type safety + auto-generated TypeScript types.
Connection pool tuning	MEDIUM	LOW	pg pool uses defaults (10 connections). Configure max, idleTimeoutMillis, connectionTimeoutMillis based on expected load.
Add pagination	HIGH	MEDIUM	All list endpoints (GET /assets, /investors, /events) return full datasets. At scale, this will cause OOM and slow responses. Add ?limit=50&offset=0 with Link headers.
Remove sql.js dependency	LOW	LOW	sql.js (SQLite) listed in production dependencies but only used in tests. Move to devDependencies.
Webhook retry queue	MEDIUM	MEDIUM	Current fire-and-forget dispatch with no retry. Implement exponential backoff with a job queue (BullMQ or pg-boss).
6.2 Frontend
Improvement	Impact	Effort	Detail
Adopt react-query or SWR	HIGH	MEDIUM	Replace useAsync hook with react-query for automatic caching, deduplication, background refetch, and stale-while-revalidate. Eliminates manual .refetch() calls and prevents redundant network requests. The dashboard currently makes 13+ requests on mount (1 + N compliance reports + N cap tables).
Add error boundaries	HIGH	LOW	A single uncaught error crashes the entire page. Wrap each route in a React error boundary with a fallback UI.
Memoize dashboard aggregation	MEDIUM	LOW	aggregateByType(), aggregateByJurisdiction(), computeConcentration() run O(n·m) on every render. Wrap in useMemo with proper dependency arrays.
Lazy-load Recharts	LOW	LOW	Recharts adds ~100KB gzipped. Use next/dynamic with ssr: false to code-split charts and reduce initial bundle.
Add debounce on form submit	LOW	LOW	No double-submit protection on modal forms — rapid clicks can create duplicate entities.
6.3 Developer Experience
Improvement	Impact	Effort	Detail
GitHub Actions CI	HIGH	LOW	Add a workflow that runs npm run test:all on every PR. Currently tests run only when a developer manually executes the PowerShell script.
Shared type package	MEDIUM	MEDIUM	Frontend types.ts (385 lines) and backend models/index.ts (400+ lines) define overlapping types independently. Extract to a shared @caelith/types package to prevent drift.
API versioning	MEDIUM	LOW	No /v1/ prefix on routes. When breaking changes are needed, all clients break simultaneously. Add versioned routes now before external consumers exist.
Dependency injection	MEDIUM	HIGH	Services directly import repositories. This prevents unit testing services in isolation (can only test through E2E). Introduce constructor injection or a DI container (tsyringe, inversify).
7. Value-Driven Prioritization
Tier 1 — Must-fix before any production deployment
Fix CORS configuration — 1 line change, eliminates cross-origin attack surface
Remove plain-text password storage from "Remember me" — security liability
Wrap critical operations in transactions — data integrity at risk
Add structured logging — undebuggable in production without it
Set up CI pipeline — prevents regressions from shipping
Tier 2 — Required for scale (>100 investors, >10 concurrent users)
Pagination on all list endpoints — O(n) memory growth without it
Adopt react-query — reduces network requests, improves UX with caching
Redis-backed rate limiting — current in-memory approach doesn't survive restarts
Database connection pool tuning — defaults insufficient under load
Add error boundaries — single JS error shouldn't crash the page
Tier 3 — Strategic improvements
Shared type package — prevents frontend/backend type drift
Frontend test suite (Playwright E2E) — only backend tested today
Webhook retry queue — ensures event delivery reliability
API versioning — future-proofs for external integrations
Observability stack (APM + metrics + alerting) — operational visibility
8. Technology Risk Assessment
Risk	Likelihood	Impact	Mitigation
PostgreSQL single-instance failure	Medium	HIGH	Add read replica, enable WAL archiving, automated backups
JWT secret compromise	Low	CRITICAL	Rotate via env var, implement token revocation list
Next.js 14 → 15 migration	Medium	MEDIUM	App Router is stable; upgrade path well-documented
Recharts bundle size at scale	Low	LOW	Lazy-load with next/dynamic; consider lightweight alternative (visx)
Claude API dependency (NL rules)	Low	LOW	Feature is additive; core rules engine is pure TypeScript
9. Metrics Snapshot
Metric	Value
Backend source files	~45 TypeScript files
Frontend source files	~20 TypeScript/TSX files
Database migrations	15 SQL files
API endpoints	40+ routes across 15 route files
Test count	96 (76 E2E, 2 unit, 18+ validator)
TypeScript strict mode	Enabled (both frontend and backend)
Production dependencies (backend)	11 packages
Production dependencies (frontend)	4 packages (Next, React, React-DOM, Recharts)
Lines of code (estimated)	~8,000 backend + ~4,000 frontend + ~2,000 tests
10. Conclusion
The Caelith engine delivers a functionally complete AIFMD compliance platform with strong architectural foundations: parameterized SQL prevents injection, event sourcing provides full auditability, and decision provenance captures regulatory-grade snapshots. The 96-test suite validates every critical workflow path.

The primary risks are operational (no logging, no CI, no monitoring) and security-configurational (CORS, credential storage) rather than architectural. The Tier 1 fixes above require approximately 2-3 engineering days and would bring the system to a defensible production-ready state. Tier 2 items should be completed before onboarding more than a handful of concurrent users.