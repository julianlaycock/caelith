# Caelith v2 — CTO Code Assessment

**Date:** 2026-02-13  
**Assessor:** Automated CTO Review (Claude)  
**Scope:** Full backend, frontend spot-check, infrastructure, 19 migration files  
**Verdict:** Solid foundation with strong architectural choices. Several security items need attention before production-grade financial deployment.

---

## Executive Summary

Caelith is impressively well-architected for its stage. The codebase demonstrates mature patterns: proper transaction handling with `SELECT ... FOR UPDATE`, hash-chain integrity for audit trails, tenant isolation infrastructure, comprehensive decision provenance, and a layered architecture (routes → services → repositories). The AI layer (RAG + NL compiler + copilot) is thoughtfully integrated with human-in-the-loop safeguards.

**Key strengths:** Audit trail completeness, transfer atomicity, hash-chain tamper detection, multi-tenant preparation, deterministic rule validation after AI proposal.

**Critical gaps:** In-memory rate limiting won't survive restarts or scale horizontally, RLS policies use a permissive COALESCE fallback, several `catch {}` blocks silently swallow errors in auth flows, and the `/api/reset` endpoint exists in non-production builds.

---

## A. SECURITY ASSESSMENT

### A1. JWT & Authentication

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ JWT secret validated ≥32 chars at startup | — | `server.ts:46-49` |
| ✅ Short-lived access tokens (30m) + refresh token rotation (7d) | — | `auth-service.ts:17-18` |
| ✅ Password complexity enforced (8+ chars, upper, lower, digit) | — | `auth-service.ts:47-52` |
| ✅ Account lockout after 5 failed attempts (15 min window) | — | `auth-service.ts:55-56` |
| ⚠️ **No special character requirement in passwords** | LOW | `auth-service.ts:47-52` |
| ⚠️ **`isAccountLocked` fails open** — if `login_attempts` table missing, lockout is bypassed | MEDIUM | `auth-service.ts:80` — `return false` in catch |
| ⚠️ **`createRefreshToken` silently succeeds** if table missing — returns token that can't be validated later | MEDIUM | `auth-service.ts:88-93` — empty catch |
| ⚠️ **No `aud`/`iss` claims in JWT** — tokens could theoretically be replayed across services | LOW | `auth-service.ts:175-181` |
| ⚠️ **Refresh token stored in plain text** in DB | MEDIUM | `auth-service.ts:86` — should hash with SHA-256 |

**Recommendation:** Hash refresh tokens before storage (compare hashes on refresh). Add `iss`/`aud` claims. Remove fail-open catch blocks — if security tables don't exist, that's a fatal startup error.

### A2. Input Validation & Sanitization

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ Global sanitization middleware strips null bytes, trims, caps at 10KB | — | `security.ts:96-121` |
| ✅ `requireFields` validation on route handlers | — | `transfer-routes.ts:11` |
| ✅ Email format validated on registration | — | `auth-routes.ts:11` |
| ✅ NL compiler caps prompt at 500 chars | — | `nl-rule-compiler.ts:95` |
| ⚠️ **No schema validation library (Zod/Joi)** — validation is ad-hoc per route | MEDIUM | All routes |
| ⚠️ **`units` cast with `Number()` without validation** — `NaN` or negative values pass through | HIGH | `transfer-routes.ts:13` — `units: Number(units)` |
| ⚠️ **No UUID format validation** on path/query params | MEDIUM | All routes — IDs from `req.params` used directly in SQL |

**Recommendation:** Add Zod schemas for all request bodies. Validate `units > 0` and UUID format before hitting services.

### A3. SQL Injection Protection

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ Parameterized queries throughout — `?` placeholders converted to `$N` | — | `db.ts:36-39` |
| ✅ No string concatenation of user input into SQL | — | All repositories |
| ⚠️ **`verifyChain` interpolates `LIMIT` value directly** into SQL string | HIGH | `integrity-service.ts:89` — `` `LIMIT ${safeLimit}` `` |

The `safeLimit` is validated as a positive integer via `Math.floor(limit)`, so this is exploitable only if the type guard fails. Still, use a parameterized placeholder instead.

**Recommendation:** Change `integrity-service.ts:89` to use `$N` parameterized LIMIT.

### A4. Rate Limiting

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ Auth endpoints: 20 req/15 min | — | `security.ts:87-90` |
| ✅ Copilot: 20 queries/hour per user (DB-backed) | — | `copilot-service.ts` `enforceRateLimit` |
| ⚠️ **In-memory rate limit store** — resets on restart, doesn't work across multiple instances | HIGH | `security.ts:26` — `Map<string, RateLimitEntry>` |
| ⚠️ **No rate limit on general API endpoints** — `apiRateLimit` defined but not applied in `server.ts` | HIGH | `server.ts` — `apiRateLimit` imported but never `app.use()`d |

**Recommendation:** Apply `apiRateLimit` middleware. Move to Redis-backed rate limiting for production.

### A5. CORS Configuration

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ Configurable via `CORS_ORIGINS` env var | — | `server.ts:85-87` |
| ✅ Credentials mode enabled | — | `server.ts:96` |
| ✅ Rejects unknown origins | — | `server.ts:89-95` |
| ⚠️ **Allows `null` origin** (when `!origin`) — permits file:// and certain redirect attacks | LOW | `server.ts:90` |

### A6. Secret Management

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ `JWT_SECRET` required at startup with min length | — | `server.ts:42-49` |
| ✅ Docker Compose uses `${JWT_SECRET:?}` (required) | — | `docker-compose.yml:22` |
| ⚠️ **Default admin password `admin1234`** if `ADMIN_PASSWORD` not set | CRITICAL | `server.ts:61` |
| ⚠️ **Warning-only in production** for default admin password | CRITICAL | `server.ts:64-66` — should refuse to start |
| ⚠️ **DB credentials defaulted to `caelith:caelith`** | MEDIUM | `db.ts:13`, `docker-compose.yml:7-8` |

**Recommendation:** In production mode, refuse to start without explicit `ADMIN_PASSWORD`. Remove default DB credentials from code.

### A7. RBAC Enforcement

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ Role-based middleware on sensitive routes (rules, webhooks, NL rules) | — | `server.ts:140-148` |
| ✅ Three-tier roles: admin, compliance_officer, viewer | — | DB constraint in `003_users_auth.sql` |
| ⚠️ **Transfer routes have no role restriction** — any authenticated user can execute transfers | HIGH | `server.ts:141` — `authenticate` only, no `authorize` |
| ⚠️ **Registration endpoint allows setting any role** including `admin` | CRITICAL | `auth-routes.ts:7` — `role` from request body passed to `registerUser` |
| ⚠️ **No tenant-scoped authorization** — authenticated users can access any tenant's data via API | HIGH | All services use `DEFAULT_TENANT_ID` |

**Recommendation:** Remove `role` from public registration (default to `viewer`). Add role guards to transfer routes. Derive `tenantId` from JWT, not defaults.

### A8. API Key Exposure

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ API keys server-side only, not exposed to frontend | — | `copilot-service.ts`, `rag-service.ts` |
| ✅ Frontend uses JWT, not API keys | — | `api.ts` |
| ⚠️ **`OPENAI_API_KEY` and `ANTHROPIC_API_KEY` in docker-compose env** — visible in `docker inspect` | LOW | `docker-compose.yml:25-26` |

**Recommendation:** Use Docker secrets or `.env` file mounted as secret for API keys.

### A9. OWASP Top 10 Summary

| OWASP Category | Status |
|---|---|
| A01 Broken Access Control | ⚠️ Role escalation via registration, missing transfer auth |
| A02 Cryptographic Failures | ⚠️ Refresh tokens stored in plaintext |
| A03 Injection | ✅ Parameterized queries (one minor interpolation) |
| A04 Insecure Design | ✅ Good: human-in-the-loop for AI rules |
| A05 Security Misconfiguration | ⚠️ Default admin password, `/api/reset` endpoint |
| A06 Vulnerable Components | Need `npm audit` check |
| A07 Auth Failures | ⚠️ Fail-open lockout, role escalation |
| A08 Data Integrity Failures | ✅ Hash-chain integrity verification |
| A09 Logging Failures | ✅ Comprehensive event logging |
| A10 SSRF | ✅ Webhook SSRF considered in migration 019 |

---

## B. CODE QUALITY

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ Consistent TypeScript throughout | — | All files |
| ✅ Clean naming conventions (camelCase functions, snake_case DB) | — | All files |
| ✅ Good separation of concerns (routes → services → repositories) | — | Architecture |
| ✅ Custom error classes (`NotFoundError`, `ValidationError`, etc.) | — | Referenced in services |
| ✅ `asyncHandler` wrapper for route error handling | — | All routes |
| ⚠️ **Silent `catch {}` blocks** in auth-service (6 instances) | HIGH | `auth-service.ts:72,80,93,106,113,127` |
| ⚠️ **Code duplication in `executeTransfer` / `simulateTransfer`** — validation context building and eligibility checks repeated | MEDIUM | `transfer-service.ts:89-125` vs `148-195` |
| ⚠️ **No structured logging** — uses `console.log/warn/error` | MEDIUM | All backend files |
| ⚠️ **`copilot-service.ts` is 400+ lines** — could be split into intent handlers | LOW | `copilot-service.ts` |
| ⚠️ **`vitest.config.ts` excludes frontend** from coverage | LOW | `vitest.config.ts:12` |

**Recommendation:** Replace silent catches with proper logging. Extract shared transfer validation logic. Adopt a structured logger (pino/winston) for production observability.

---

## C. ARCHITECTURE

### C1. Layer Separation — **GOOD**

Clean three-layer architecture: Routes (thin controllers) → Services (business logic) → Repositories (data access). The `db.ts` module provides a clean abstraction with tenant-scoping helpers.

### C2. Repository Pattern — **GOOD**

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ Consistent CRUD pattern across repositories | — | `investor-repository.ts`, `rules-repository.ts` |
| ✅ Row-to-model mapping functions | — | `rowToInvestor`, `rowToRuleSet` |
| ⚠️ **`createInvestor` hardcodes `DEFAULT_TENANT_ID`** instead of accepting tenant from caller | MEDIUM | `investor-repository.ts:46` |
| ⚠️ **`createRuleSet` similarly hardcodes tenant** | MEDIUM | `rules-repository.ts:51` |

### C3. Database Schema — **STRONG**

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ UUID primary keys throughout | — | All migrations |
| ✅ Proper foreign key constraints with `ON DELETE RESTRICT` | — | `002_postgresql_schema.sql` |
| ✅ Check constraints (positive units, valid roles, no self-transfer) | — | `002_postgresql_schema.sql` |
| ✅ Comprehensive indexing including tenant-scoped composites | — | `019_security_hardening.sql` |
| ✅ RLS enabled with tenant isolation policies | — | `019_security_hardening.sql` |
| ✅ `TIMESTAMPTZ` used (timezone-aware) | — | All migrations |
| ⚠️ **RLS policy uses `COALESCE(..., tenant_id)`** — if `app.tenant_id` not set, policy is a no-op (all rows visible) | CRITICAL | `019_security_hardening.sql` — `COALESCE(current_setting('app.tenant_id', true)::uuid, tenant_id)` |
| ⚠️ **No `updated_at` trigger** — relies on application code to set it | LOW | All tables |
| ⚠️ **Soft-delete columns added but not used** in queries (no `WHERE deleted_at IS NULL`) | MEDIUM | `019_security_hardening.sql` + repositories |

**Recommendation:** Fix RLS policies to reject access when `app.tenant_id` is not set. Add `deleted_at IS NULL` filter to all queries.

### C4. Transaction Handling — **EXCELLENT**

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ `withTransaction` helper wrapping transfer execution | — | `transfer-service.ts:164` |
| ✅ `SELECT ... FOR UPDATE` row locking on holdings | — | `transfer-service.ts:168-170` |
| ✅ Transfer record created inside transaction for audit integrity | — | `transfer-service.ts:196` |
| ✅ Concurrent modification detection (insufficient units check) | — | `transfer-service.ts:173` |

### C5. N+1 Query Risks

| Finding | Severity | Location |
|---------|----------|----------|
| ⚠️ **Dashboard fetches cap tables per-asset** in a loop | MEDIUM | `page.tsx:161-170` (frontend) |
| ⚠️ **Compliance reports fetched per-fund** sequentially | MEDIUM | `page.tsx:152-158` (frontend) |
| ✅ `buildValidationContext` uses `Promise.all` for parallel fetches | — | `transfer-service.ts:244-249` |

---

## D. RELIABILITY

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ Graceful shutdown with `SIGINT` handler closing DB pool | — | `server.ts:181-184` |
| ✅ Health check endpoints (shallow + deep with DB probe) | — | `server.ts:108-118` |
| ✅ Docker HEALTHCHECK configured | — | `Dockerfile:19-20` |
| ✅ Connection pool with timeout (5s connect, 30s idle) | — | `db.ts:12-15` |
| ✅ Pool error handler prevents unhandled rejection crash | — | `db.ts:17-19` |
| ✅ Anthropic API calls with retry + exponential backoff | — | `copilot-service.ts:99-130`, `nl-rule-compiler.ts:118-147` |
| ⚠️ **No `SIGTERM` handler** — Docker sends SIGTERM, not SIGINT | HIGH | `server.ts:181` |
| ⚠️ **`closeDb` has no timeout** — could hang if pool.end() blocks | LOW | `db.ts:128-132` |
| ⚠️ **Migration runs inline at container start** — no rollback on failure | MEDIUM | `Dockerfile:23` — `npx tsx scripts/migrate.ts && npx tsx src/backend/server.ts` |

**Recommendation:** Add `SIGTERM` handler. Separate migration from app startup (init container or pre-deploy step).

---

## E. PERFORMANCE

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ Connection pooling (max 20, configurable) | — | `db.ts:12` |
| ✅ Request body limit 1MB | — | `server.ts:99` |
| ✅ RAG embeddings batch-processed (8 per batch) | — | `rag-service.ts:150` |
| ✅ Comprehensive composite indexes for tenant-scoped queries | — | `019_security_hardening.sql` |
| ⚠️ **No pagination** on `findAllInvestors`, `findAllTransfers` | HIGH | `investor-repository.ts:72-77` |
| ⚠️ **`verifyChain` loads all sealed records into memory** if no limit specified | HIGH | `integrity-service.ts:82-95` |
| ⚠️ **No caching layer** — repeated rule/investor lookups hit DB every time | MEDIUM | All services |
| ⚠️ **`getTransferHistory` likely unbounded** | MEDIUM | `transfer-routes.ts:40` |
| ⚠️ **Copilot `what_if` builds IN clause** with potentially large investor list | LOW | `copilot-service.ts:345-351` |

**Recommendation:** Add pagination to all list endpoints. Add Redis cache for hot paths (rules per asset, investor lookups). Default LIMIT on chain verification.

---

## F. REGULATORY COMPLIANCE READINESS (EU/GDPR)

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ **Comprehensive audit trail** — every action logged to events table | — | All services call `createEvent` |
| ✅ **Decision provenance** — every compliance decision has full input/rule snapshot | — | `transfer-service.ts`, `eligibility-service.ts` |
| ✅ **Hash-chain integrity** — tamper-evident audit chain with SHA-256 | — | `integrity-service.ts` |
| ✅ **Rule versioning** — historical rule configs archived | — | `rules-service.ts:33-45` |
| ✅ **Immutable decision records** — no delete endpoints, integrity hash | — | `019_security_hardening.sql` |
| ⚠️ **No data retention policy** — login_attempts, events, etc. grow unbounded | MEDIUM | All tables |
| ⚠️ **No GDPR erasure mechanism** — soft-delete columns exist but no anonymization flow | HIGH | `019_security_hardening.sql` — `deleted_at` unused |
| ⚠️ **PII stored without encryption at rest** (names, emails, tax IDs, LEIs) | HIGH | `investor-repository.ts` |
| ⚠️ **No data processing records** (Art. 30 GDPR) | MEDIUM | — |
| ⚠️ **No cross-border transfer safeguards** — OpenAI/Anthropic API calls send data to US | HIGH | `copilot-service.ts`, `rag-service.ts` |
| ⚠️ **No consent tracking** for data processing | MEDIUM | — |

**Recommendation:** Implement GDPR right-to-erasure with PII anonymization (not just soft delete). Add encryption for sensitive fields (tax_id, LEI). Document legal basis for US API data transfers. Implement data retention cleanup jobs.

---

## G. TESTING

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ Vitest configured with V8 coverage | — | `vitest.config.ts` |
| ✅ `fileParallelism: false` prevents DB test interference | — | `vitest.config.ts:6` |
| ⚠️ **No test files visible** in assessed file list | HIGH | — |
| ⚠️ **Frontend excluded from coverage** | MEDIUM | `vitest.config.ts:12` |

**Missing critical tests:**
- Transfer atomicity under concurrent requests
- Role escalation via registration endpoint
- Rate limit bypass after restart
- Hash-chain verification with tampered records
- Tenant isolation (cross-tenant data access)
- Refresh token rotation correctness
- Edge cases: negative units, NaN, overflow

---

## H. DEPLOYMENT & DEVOPS

| Finding | Severity | Location |
|---------|----------|----------|
| ✅ Multi-stage Docker build (deps → production) | — | `Dockerfile` |
| ✅ Non-root user (`caelith`) in container | — | `Dockerfile:5-6` |
| ✅ Docker healthcheck | — | `Dockerfile:19` |
| ✅ `depends_on: service_healthy` for DB dependency | — | `docker-compose.yml:28-29` |
| ✅ `restart: unless-stopped` | — | `docker-compose.yml:30` |
| ⚠️ **No `.dockerignore` visible** — may include node_modules in build context | LOW | — |
| ⚠️ **No CI/CD pipeline files** visible | MEDIUM | — |
| ⚠️ **No log aggregation / APM / tracing** configured | HIGH | — |
| ⚠️ **`/api/reset` endpoint exists** in non-production — guarded but risky | MEDIUM | `server.ts:156-174` |
| ⚠️ **Migrations and app coupled** in single CMD | MEDIUM | `Dockerfile:23` |

---

## Priority Action Items

### 🔴 CRITICAL (fix before any production deployment)

1. **Registration allows admin role escalation** — `auth-routes.ts:7` — strip `role` from public registration body
2. **Default admin password in production** — `server.ts:61` — refuse to start without `ADMIN_PASSWORD`
3. **RLS COALESCE fallback disables tenant isolation** — `019_security_hardening.sql` — change to `current_setting('app.tenant_id')::uuid` (without `true` fallback) or use explicit deny

### 🟠 HIGH (fix within 1-2 sprints)

4. **`apiRateLimit` not applied** — `server.ts` — add `app.use('/api', apiRateLimit)` before routes
5. **Units not validated** for positive integer — add Zod schema to transfer routes
6. **No SIGTERM handler** — `server.ts:181` — add alongside SIGINT
7. **Refresh tokens stored plaintext** — hash before storage
8. **Silent auth catches fail open** — `auth-service.ts` — log errors, fail closed
9. **Transfer routes lack role authorization** — add `authorize('admin', 'compliance_officer')`
10. **GDPR erasure mechanism missing** — implement anonymization workflow
11. **Cross-border data transfer to US AI providers** — document legal basis, consider EU-hosted alternatives
12. **In-memory rate limiter** — migrate to Redis for horizontal scaling
13. **No pagination on list endpoints** — add `limit`/`offset` to all repository queries

### 🟡 MEDIUM (plan for next quarter)

14. Add Zod schema validation for all request bodies
15. Implement structured logging (pino)
16. Add APM/tracing (OpenTelemetry)
17. Implement data retention cleanup jobs
18. Use soft-delete columns (add `WHERE deleted_at IS NULL`)
19. Separate migrations from app startup (init container)
20. Add comprehensive test suite
21. Set up CI/CD pipeline
22. Hash `app.tenant_id` derivation from JWT in DB middleware

---

## Architecture Diagram (Current State)

```
┌─────────────┐     ┌─────────────────────────────────────────────┐
│   Next.js    │────▶│  Express API (server.ts)                    │
│   Frontend   │     │  ├─ Security Middleware (headers, rate, san)│
│   (3000)     │     │  ├─ Auth Middleware (JWT verify, RBAC)      │
└─────────────┘     │  ├─ Routes → Services → Repositories        │
                    │  ├─ AI Layer                                 │
                    │  │  ├─ Copilot (Claude + intent routing)     │
                    │  │  ├─ RAG (pgvector embeddings)             │
                    │  │  └─ NL Rule Compiler (Claude → validate)  │
                    │  └─ Integrity Service (SHA-256 hash chain)   │
                    └──────────────┬────────────────────────────────┘
                                   │
                    ┌──────────────▼────────────────────────────────┐
                    │  PostgreSQL 16 + pgvector                     │
                    │  ├─ Multi-tenant (tenant_id + RLS)            │
                    │  ├─ 19 migrations                             │
                    │  └─ Vector similarity search (1536-dim)       │
                    └───────────────────────────────────────────────┘
```

---

## Overall Grade: **B+**

Strong architectural foundations, excellent audit trail and decision provenance design, and good security awareness (evidenced by the hardening migration). The critical items (role escalation, RLS bypass, default admin password) are straightforward fixes. The codebase is well-positioned for production after addressing the priority items above.

*This assessment covers the files explicitly listed in the scope. Additional routes, services, and test files may exist but were not reviewed.*
