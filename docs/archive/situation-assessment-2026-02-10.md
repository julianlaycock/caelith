# Caelith — Situation Assessment Report

**Date:** February 10, 2026  
**Sprint:** Vertical B Schema Foundation  
**Deadline:** AIFMD 2.0 transposition — April 16, 2026 (65 days)

---

## 1. Execution Status

### Completed Today

| Item | Status | Notes |
|------|--------|-------|
| Migration runner rewrite (`scripts/migrate.ts`) | ✅ Done | PostgreSQL-compatible, transaction-wrapped, auto-skips SQLite |
| 007 — `fund_structures` table | ✅ Applied | 12 legal forms, 4 frameworks, 4 statuses |
| 008 — `investors` extension | ✅ Applied | 5-tier AIFMD classification, KYC lifecycle, data migration |
| 009 — `rules` extension | ✅ Applied | AIFMD parameters: investor_type_whitelist, min investment, max investors, concentration, KYC |
| 010 — `eligibility_criteria` + seed data | ✅ Applied | 6 template fund structures, 22 eligibility criteria rows |
| 011 — `decision_records` + transfers FK | ✅ Applied | Temporal provenance archive |
| 012 — `onboarding_records` | ✅ Applied | Investor application lifecycle |
| 013 — `regulatory_documents` | ✅ Applied | RAG table with pgvector graceful fallback |
| Regulatory corpus uploaded to project | ✅ Done | 7 documents accessible (see §2) |

**Result:** All 12 migrations applied. Database schema fully matches DATA_MODEL.md Vertical B specification. Schema foundation phase is complete.

### Where We Are vs. the Plan

The vertical-b-execution-plan defined 6 slices over 9–10 weeks. We are executing Slice 1 ("Luxembourg SIF onboarding"). The schema work was the prerequisite for all slices. Current position:

| Slice | Description | Status |
|-------|-------------|--------|
| **Slice 1** — Luxembourg SIF onboarding | Schema migrations, eligibility check endpoint, investor_type_eligible rule | **Schema done. Code layer next.** |
| **Slice 2** — Decision provenance for transfers | decision_records integration, min investment rule | Not started |
| **Slice 3** — NL rule compiler + templates | Claude API integration, 6 AIFMD templates | Not started |
| **Slice 4** — RAG + Copilot MVP | pgvector ingestion, regulatory Q&A | Not started |
| **Slice 5** — Onboarding workflow + scenario modeling | Full apply→approve→allocate flow | Not started |
| **Slice 6** — Reporting + polish | Enhanced PDF, Annex IV, dashboard, seed script | Not started |

---

## 2. Regulatory Corpus — Document Inventory

### Confirmed Accessible

| # | Document | File | Jurisdiction | Priority |
|---|----------|------|-------------|----------|
| 1 | **AIFMD II** (Directive 2024/927) | `OJ_L_202400927_EN_TXT.pdf` | EU | High |
| 2 | **Original AIFMD** (Directive 2011/61/EU) | `CELEX_32011L0061_EN_TXT.pdf` | EU | Nice-to-have |
| 3 | **ELTIF 2.0** (Regulation 2023/606) | `CELEX_32023R0606_EN_TXT.pdf` | EU | Medium |
| 4 | **Luxembourg RAIF Law** (23 July 2016) | `L_230716_RAIF_eng.pdf` | LU | Medium |
| 5 | **CSSF Circular 18/698** (IFM authorisation) | `cssf18_698eng.pdf` | LU | Medium |
| 6 | **CBI AIFMD Q&A** (50th edition, March 2025) | `CBI_AIFMD_QA.pdf` | IE | Nice-to-have |

### Missing

| # | Document | Status | Impact |
|---|----------|--------|--------|
| 7 | **CSSF Circular 15/633** (SIF investor rules) | ⚠️ Listed in project but **file not found on disk** | **HIGH** — This is the primary source for Luxembourg SIF €125K threshold. Our seed data cites it. Need to re-upload. |

**Action required:** Re-upload `cssf15_633eng.pdf` to the project. Without it, the RAG pipeline (Slice 4) will have a gap in its most-cited source for Luxembourg SIF eligibility.

### Not Yet Uploaded (Lower Priority)

| Document | Why Useful | When Needed |
|----------|-----------|-------------|
| **KAGB** (German Capital Investment Code) | Source for Spezial-AIF €200K threshold | Slice 4 (RAG) |
| **BaFin Spezial-AIF guidance** | German jurisdiction detail | Slice 4 |
| **CBI AIF Rulebook** (full text) | We have the Q&A but not the actual rulebook conditions | Slice 4 |

---

## 3. Data Accuracy Findings ⚠️

Cross-referencing the uploaded regulatory documents against our seed data in migration 010 revealed **two data errors** that should be corrected before building the eligibility check logic.

### ERROR 1: Luxembourg RAIF Minimum Investment

**What we seeded:** €125,000 (12500000 cents) for `semi_professional` investors  
**What the law says:** The Law of 23 July 2016, Article 2(1)(b)(i) states the minimum is **€100,000**, not €125,000.

> Article 2(1): "...any other investor who meets the following conditions: (a) he has stated in writing that he adheres to the status of well-informed investor and (b)(i) he invests a minimum of EUR 100,000 in the reserved alternative investment fund"

**Root cause:** We likely conflated the SIF threshold (€125,000 per CSSF Circular 15/633) with the RAIF threshold. They are different instruments with different minimums.

**Fix required:** Update eligibility_criteria row for RAIF `semi_professional` from 12500000 to 10000000.

### ERROR 2: ELTIF 2.0 Retail Minimum Investment

**What we seeded:** €10,000 (1000000 cents) for `retail` investors  
**What the regulation says:** Regulation 2023/606 (ELTIF 2.0), Recital 47 explicitly **removed** the €10,000 minimum:

> "It is therefore necessary to remove the EUR 10,000 initial minimum investment requirement and the 10% limit on aggregate investment."

The reformed ELTIF 2.0 regulation eliminated the retail minimum investment threshold. Retail investors can now invest any amount, subject only to a suitability assessment.

**Fix required:** Update eligibility_criteria row for ELTIF `retail` from 1000000 to 0. The `suitability_required = true` flag is correct and should remain.

### Proposed Correction Migration

A migration `014_fix_eligibility_data.sql` should be created to correct both values before any application code is built on top of them. This prevents the eligibility check logic from being tested against wrong thresholds.

---

## 4. Optimisation Assessment

### What's Going Well

**Schema-first approach is paying off.** Having all 12 migrations applied before writing any application code means TypeScript interfaces, repositories, services, and routes can all be built against the final schema. No rework.

**Regulatory documents uploaded early.** Having the actual legal text accessible now means we can cross-reference as we build (which already caught the two data errors above). For Slice 4 (RAG), the ingestion corpus is pre-staged.

**Migration runner works reliably.** Every migration applied cleanly on first attempt. Transaction wrapping means failed migrations don't leave partial state.

### Optimisation Recommendations

**1. Fix data errors immediately (5 minutes, high value)**

Create and apply `014_fix_eligibility_data.sql` before writing any eligibility check logic. Testing against wrong thresholds wastes debugging time later.

**2. Update TypeScript interfaces next (Slice 1 blocker)**

`src/backend/models/index.ts` still has the original interfaces. Every new repository, service, and route file will import from here. This is the single dependency that blocks all Slice 1 code work. Do this before any endpoint or service implementation.

**3. Re-upload CSSF 15/633**

The file is referenced in project metadata but not accessible on disk. This is the most-cited document in Luxembourg fund compliance. Re-upload it.

**4. Consider combining Slices 1 and 2**

The original plan separates "eligibility check" (Slice 1) from "decision provenance" (Slice 2). But the `decision_records` table is already in the schema, and every eligibility check should write a decision record from day one. Building the eligibility check without decision provenance means retrofitting it later. Recommendation: implement `decision_records` writing as part of the eligibility check endpoint in Slice 1. This adds ~2 hours of work but saves the Slice 2 refactor.

**5. Write the AIFMD seed script early**

The generic seed data ("Fund A", "Investor 1") is still what `scripts/seed-data.ts` creates. A realistic demo with 3 fund structures, 15 investors across 6 jurisdictions, and pre-configured rules is essential for both testing and incubator demos. Consider writing this as part of Slice 1 rather than deferring to Slice 6.

**6. Keep docker/init.sql updated**

The file still contains only migrations 001–006. Anyone starting with a fresh `docker compose up` gets an incomplete schema. After each migration batch, regenerate init.sql by concatenating all migration files. This can be automated with a script.

---

## 5. Immediate Next Steps (Priority Order)

| # | Task | Est. Time | Dependency |
|---|------|-----------|------------|
| 1 | Create + apply `014_fix_eligibility_data.sql` | 10 min | None |
| 2 | Re-upload `cssf15_633eng.pdf` to project | 2 min | None |
| 3 | Update `src/backend/models/index.ts` — TypeScript interfaces | 30 min | Migration 014 |
| 4 | Add FundStructure repository + service | 45 min | Models update |
| 5 | Add EligibilityCriteria repository + service | 45 min | Models update |
| 6 | Build `POST /api/eligibility/check` endpoint | 60 min | Repositories |
| 7 | Write decision_record on every eligibility check | 30 min | Endpoint |
| 8 | Write first Vertical B e2e test (Luxembourg SIF scenario) | 30 min | Endpoint |

**Estimated time to first demable Slice 1:** ~4 hours of focused coding after the data fix and models update.

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AIFMD 2.0 transposition details vary by member state | High | Medium | Focus on 3 jurisdictions only (LU, DE, IE). Don't try to cover all 27. |
| pgvector not available in Docker PostgreSQL image | Medium | Low | Migration 013 already handles gracefully. Add pgvector to Dockerfile when needed for Slice 4. |
| CSSF 15/633 data gap | Medium | Medium | Re-upload file. Use existing RAIF law and CSSF 18/698 as cross-references in interim. |
| Solo founder velocity vs. 65-day deadline | High | High | Prioritise demo-ready over feature-complete. Slice 1+2+3 = pilotable. Slices 4-6 = nice-to-have for April deadline. |
| Incubator demo timing conflicts with development | Medium | Medium | Keep API-first (Swagger UI demos work). Defer frontend polish. |
