# Caelith Vertical B — Execution Plan

## AIFMD / Private Capital Compliance Orchestration

**Commitment:** Build Vertical B to market-ready, pilotable standard.
**Goal:** A tool that sub-€500M AIFMs and fund administrators need, can pilot, and would pay for.

---

## 1. Gap Analysis: Current State vs. Vertical B Requirements

### What You Have (Built in 9 Days)

A generic private asset registry with: assets, investors (name + jurisdiction + boolean `accredited`), holdings, transfer rules (lockup, jurisdiction whitelist, transfer whitelist, accreditation check), composite rules (AND/OR/NOT), webhooks, JWT auth, RBAC, PDF cap table export, 6 EU regulatory templates, 65 tests, Swagger UI.

### What Vertical B Requires (That You Don't Have)

| Gap | Why It Matters | Severity |
|-----|---------------|----------|
| **Investor classification is binary** (`accredited: true/false`) | AIFMD defines 3+ categories: professional, semi-professional, retail. Each EU member state sets different thresholds for "semi-professional" (e.g., €100K minimum in Luxembourg, €200K in Germany). A boolean doesn't model this. | **CRITICAL** |
| **No fund/asset structure metadata** | AIFMs manage funds with specific legal structures (SICAV, SIF, RAIF, ELTIF), domiciles, regulatory frameworks, and AIFM registration details. The current `assets` table has only name + type + total_units. | **CRITICAL** |
| **No minimum investment thresholds per investor category** | AIFMD requires different minimum investment amounts based on investor classification AND jurisdiction. This is one of the most common compliance checks. | **HIGH** |
| **No LPA/fund document rule extraction** | Limited Partnership Agreements contain the actual transfer restrictions. Currently, rules are manually configured. Compliance officers need to translate LPA terms into rules. | **HIGH** |
| **No AIFMD Annex IV reporting data structures** | AIFMD Article 24 requires quarterly/annual reporting to NCAs. Fund managers need to generate this data. | **HIGH** |
| **No investor onboarding workflow** | The current system is a registry. AIFMs need a workflow: investor applies → eligibility checked → classified → approved/rejected → allocated. | **MEDIUM** |
| **No natural language rule configuration** | Compliance officers don't think in JSON. They think in "Block retail investors from Luxembourg SIFs unless they commit at least €125,000." | **MEDIUM** |
| **No regulatory intelligence layer** | No ability to ingest AIFMD text or NCA guidance and suggest rules. Currently all templates are hardcoded. | **MEDIUM** |
| **No scenario modeling** | "What happens to our investor base if we change the minimum investment from €100K to €125K?" — this is what compliance officers ask daily. | **MEDIUM** |
| **No decision provenance with temporal reconstruction** | The events table logs what happened but doesn't store rule version snapshots per decision. Can't answer: "What rules applied to transfer X on date Y?" | **MEDIUM** |
| **Seed/demo data is generic** | Current demo: "Fund A", "Investor 1". For a pilotable product, need realistic AIFMD scenarios: a Luxembourg RAIF with 3 investor classes, German SIF with DACH-only restriction, etc. | **MEDIUM** |

### What You Have That Already Works for Vertical B

- Deterministic rules engine (core is sound, needs domain-specific rule types)
- Composite rules (AND/OR/NOT) — perfect for modeling complex AIFMD eligibility
- Transfer simulation endpoint — exactly what compliance officers need
- Versioned rules with audit trail — regulatory requirement, already implemented
- Webhook system — fund administrators need event notifications
- JWT + RBAC — admin/compliance_officer/viewer maps to AIFM organizational roles
- Cap table + PDF export — fund administrators use this daily
- PostgreSQL + Docker — production-ready infrastructure

---

## 2. Document Update Plan

### PRD.md → REWRITE

The current PRD describes a "Private Asset Registry & Transfer Rules Engine (MVP)" — a generic simulation platform. This needs to become **"Caelith: Compliance Orchestration Platform for EU Alternative Investment Fund Managers."**

**Key changes:**
- Overview: from "simulation platform" to "compliance orchestration for AIFMD-regulated fund operations"
- Target User: from generic list to specific: sub-€500M EU AIFMs, fund administrators (Luxembourg, Ireland, Germany), compliance officers at fund management companies
- Core Value Proposition: from "demonstrate how private assets can be managed" to "automate investor eligibility verification, transfer restriction enforcement, and regulatory reporting for AIFMD 2.0 compliance"
- Functional Requirements: add FR-8 through FR-14 (investor classification, fund structure, minimum investment, onboarding workflow, Annex IV reporting, scenario modeling, NL rule configuration)
- Success Criteria: from generic "create asset with 1M units" to AIFMD-specific scenarios: "Configure a Luxembourg RAIF with 3 investor classes, verify that a German semi-professional investor meets the €200K minimum, simulate 20 secondary transfers with jurisdiction-specific eligibility checks"
- Out of Scope: update to reflect what's deferred (blockchain bridge, AI Act explainability, DORA module)

### DATA_MODEL.md → EXTEND

The schema needs new tables and significant modifications to existing ones.

**New tables needed:**
- `fund_structures` — fund legal structure, domicile, regulatory framework, AIFM details
- `investor_classifications` — per-investor, per-fund classification with evidence/documentation reference
- `eligibility_rules` — jurisdiction-specific investor eligibility criteria (minimum investment, classification requirements)
- `onboarding_records` — investor application → eligibility check → approval workflow
- `decision_records` — temporal decision archive (rule version snapshot + inputs + output + timestamp)
- `regulatory_reports` — generated report metadata and export history

**Modifications to existing tables:**
- `investors`: add `investor_type` (enum: institutional, professional, semi_professional, retail, well_informed), `kyc_status`, `kyc_expiry`, `tax_id`, `lei` (Legal Entity Identifier)
- `assets`: add `fund_structure_id` FK, `regulatory_framework` (AIFMD, UCITS, ELTIF, national), `domicile`, `inception_date`, `aifm_id`
- `rules`: add `minimum_investment` (BIGINT), `maximum_investors` (INTEGER), `investor_type_whitelist` (JSONB)
- `events`: add `rule_version_snapshot` (JSONB) to capture the exact rules that applied at decision time

### WORKING_RULES.md → MINOR UPDATE

Add conventions for:
- AI integration layer (LLM calls always logged, never auto-execute)
- Regulatory template versioning (templates tagged with regulatory framework + jurisdiction + effective date)
- pgvector usage conventions

### CAELITH_REPORT.md → UPDATE Part 5 Roadmap

Replace the multi-vertical roadmap with Vertical B-focused sprints. The rest of the report (market context, competitive landscape, moat analysis) remains valid — just narrow the "next 12 weeks" section to AIFMD execution.

### CODEX_REPORT.md → NO CHANGE

Historical document. Already marked as superseded.

### package.json → UPDATE

Add dependencies for AI integration: `@anthropic-ai/sdk` or `openai`, `pgvector`, `langchain` (or custom orchestration), `pdf-parse` (for LPA ingestion).

### tsconfig.json → NO CHANGE

Current config is fine.

---

## 3. Step-by-Step Execution Plan

### Phase 1: Domain Model Upgrade (Week 1-2)
**Goal:** Make the data model speak AIFMD, not generic "private assets."

**Step 1.1 — Extend the investor model**
- Add `investor_type` enum: `institutional`, `professional`, `semi_professional`, `retail`, `well_informed`
- Add fields: `kyc_status` (pending/verified/expired), `kyc_expiry` (date), `tax_id`, `lei`
- Migration: backward-compatible (existing investors get `investor_type = 'professional'` if `accredited = true`, `'retail'` otherwise)
- Keep `accredited` as computed/derived field for backward compatibility with existing rules

**Step 1.2 — Extend the asset/fund model**
- New `fund_structures` table: `id`, `name`, `legal_form` (SICAV, SIF, RAIF, ELTIF, SCSp, SCA), `domicile` (ISO country), `regulatory_framework` (AIFMD, UCITS, national), `aifm_name`, `aifm_lei`, `inception_date`, `target_size`, `currency`
- Add `fund_structure_id` FK to `assets` table
- This maps to real fund structures that Luxembourg, Ireland, and Germany use

**Step 1.3 — Jurisdiction-specific eligibility rules**
- New `eligibility_criteria` table: `id`, `fund_structure_id`, `jurisdiction`, `investor_type`, `minimum_investment` (in fund currency), `maximum_allocation_pct`, `documentation_required` (JSONB), `effective_date`, `source_reference` (e.g., "CSSF Circular 15/633, Section 4.2")
- Pre-populate with real data for 3 jurisdictions:
  - **Luxembourg:** SIF (€125K semi-professional), RAIF (same), ELTIF 2.0 (€10K retail with suitability)
  - **Germany:** Spezial-AIF (€200K semi-professional), open-ended retail (€50 minimum)
  - **Ireland:** QIAIF (€100K qualifying investor), RIAIF (€0 but retail suitability required)

**Step 1.4 — Decision provenance records**
- New `decision_records` table: `id`, `decision_type` (transfer_validation, eligibility_check, onboarding_approval), `entity_id`, `input_snapshot` (JSONB — full input data), `rule_version_snapshot` (JSONB — exact rules applied), `output` (JSONB — result + per-rule details), `decided_at`, `decided_by` (user or system)
- Every validation now creates a decision record. This is the temporal decision archive.

**Step 1.5 — Update seed data**
- Replace generic "Fund A, Investor 1" with realistic AIFMD scenarios:
  - Luxembourg RAIF "European Private Credit Fund I" — 500M units, 3 investor classes, DACH + Benelux jurisdiction whitelist
  - German Spezial-AIF "Berlin Real Estate Opportunities" — 100M units, professional-only, 180-day lockup
  - Irish QIAIF "Atlantic Infrastructure Fund" — 250M units, qualifying investor threshold €100K
  - 15 investors across 6 jurisdictions with different classifications

**Deliverable:** A data model that a fund administrator recognizes as their world.

---

### Phase 2: AIFMD Rules Engine Enhancement (Week 2-3)
**Goal:** The rules engine validates real AIFMD compliance scenarios, not just generic transfer restrictions.

**Step 2.1 — New built-in rule types**
Add to the validator alongside existing 7 rules:
- `investor_type_eligible`: Check receiver's investor classification against fund's allowed types
- `minimum_investment_met`: Check transfer units × unit price ≥ jurisdiction-specific minimum for receiver's investor type
- `maximum_investors_check`: Fund hasn't exceeded maximum number of investors (relevant for certain fund structures)
- `kyc_valid`: Receiver's KYC status is verified and not expired
- `concentration_limit`: Single investor can't exceed X% of total fund units

**Step 2.2 — Jurisdiction-aware eligibility validation**
- When validating a transfer, the engine now:
  1. Looks up the fund's structure and regulatory framework
  2. Looks up the receiver's investor type and jurisdiction
  3. Finds the applicable eligibility criteria for that combination
  4. Validates minimum investment, documentation requirements, and classification
- This is the core differentiator: jurisdiction-specific, configurable, deterministic eligibility checking.

**Step 2.3 — Enhanced composite rules for AIFMD scenarios**
- Add new field conditions: `to.investor_type`, `fund.legal_form`, `fund.domicile`, `to.kyc_status`
- Example composite rule: "IF fund.legal_form = 'SIF' AND to.investor_type = 'semi_professional' AND to.jurisdiction = 'DE' THEN transfer.units × unit_price >= 200000"

**Step 2.4 — AIFMD-specific templates (replace current generic EU templates)**
- Luxembourg SIF (semi-professional): EEA + CH, semi-professional + professional + institutional, €125K minimum, 90-day lockup
- Luxembourg RAIF (professional): EEA, professional + institutional only, no lockup
- German Spezial-AIF: DACH, semi-professional (€200K min) + professional, 180-day lockup
- Irish QIAIF: EU + UK + CH, qualifying investor (€100K min), 30-day lockup
- ELTIF 2.0 (retail): EU-wide, all investor types, €10K minimum for retail (with suitability flag), 5-year lockup (or per ELTIF redemption policy)
- AIFMD 2.0 Loan Origination Fund: origination limits, leverage caps modeled as rules

**Step 2.5 — Tests**
- Unit tests for every new rule type (target: 15-20 new tests)
- E2E tests: full scenario — create Luxembourg SIF, register 5 investors across 3 jurisdictions and 3 types, simulate 10 transfers (valid + invalid), verify eligibility checks
- Test the temporal decision record: validate, then change rules, validate again, verify both decision records have correct rule snapshots

**Deliverable:** A rules engine that handles real AIFMD compliance scenarios with jurisdiction-specific investor eligibility.

---

### Phase 3: AI-Powered Compliance Layer (Week 3-5)
**Goal:** The innovative layer that makes Caelith genuinely differentiated — AI that interprets regulations, humans that enforce them.

**Step 3.1 — Natural Language → Rule Compiler**
- API endpoint: `POST /api/rules/from-natural-language`
- Input: `{ "description": "Block retail investors from this fund unless they're in Luxembourg and commit at least 125,000 euros", "asset_id": "..." }`
- Process: LLM (Claude API) parses intent → generates rule JSON → deterministic validator checks structure → returns proposed rule for human review
- Output: `{ "proposed_rule": {...}, "confidence": 0.92, "explanation": "This creates a composite rule with...", "requires_approval": true }`
- The rule NEVER auto-activates. Compliance officer reviews and approves.
- All LLM calls logged in events table: `copilot.rule_proposed`

**Step 3.2 — Regulatory Document RAG Pipeline**
- Install pgvector extension in PostgreSQL
- Ingest pipeline: PDF/HTML → chunk by article/section → embed → store in `regulatory_documents` table with vectors
- Initial corpus: AIFMD 2.0 full text (Directive 2024/927), CSSF implementation circulars (15/633 on SIF, 18/698 on RAIF), CBI AIFMD Q&A, BaFin KAGB guidance
- Query endpoint: `POST /api/regulatory/query` — "What are the investor eligibility requirements for a Luxembourg RAIF?" → returns relevant text chunks with citations
- Template suggestion endpoint: `POST /api/regulatory/suggest-rules` — given a fund structure + jurisdiction, suggest rules based on regulatory text with citations to specific articles
- This is the wedge product: compliance officers can ask "what does the regulation actually require?" and get an answer grounded in the actual regulatory text, not an LLM hallucination.

**Step 3.3 — Compliance Copilot (Embedded in UI)**
- Sidebar chat interface in the dashboard
- Capabilities:
  - "Why was this transfer rejected?" → queries decision record, explains each rule violation in plain language
  - "What rules apply to this fund?" → lists active rules with regulatory source citations
  - "Create a rule for..." → NL rule compiler (Step 3.1) invoked from the chat
  - "What if we changed the minimum investment to €150K?" → scenario simulation
- All copilot interactions logged as events for auditability
- The copilot itself produces auditable records — "Caelith practices what it preaches" about AI governance

**Step 3.4 — Scenario Modeling Endpoint**
- `POST /api/scenarios/what-if`
- Input: proposed rule change + asset_id
- Output: impact analysis against existing investor base
  - "12 of 45 current investors would no longer meet eligibility"
  - "3 pending transfers would be blocked under new rules"
  - List of affected investors with reasons
- This is what compliance officers actually do before rule changes — currently in spreadsheets.

**Deliverable:** AI-powered rule creation, regulatory intelligence, and scenario modeling that no competitor offers.

---

### Phase 4: Investor Onboarding Workflow + Reporting (Week 5-7)
**Goal:** Complete the operational workflow from investor application to ongoing compliance monitoring.

**Step 4.1 — Investor onboarding flow**
- New `onboarding_records` table: application → eligibility check (automated) → classification assignment → approval (manual) → allocation
- API endpoints: `POST /api/onboarding/apply`, `GET /api/onboarding/:id/eligibility-check`, `POST /api/onboarding/:id/approve`
- The eligibility check is automated (rules engine), the approval is human (RBAC-gated to admin/compliance_officer)
- Onboarding creates a decision record with full provenance

**Step 4.2 — AIFMD Annex IV reporting data export**
- Endpoint: `GET /api/reports/annex-iv/:asset_id`
- Generates the data structure required for AIFMD Article 24 reporting to NCAs
- Fields: fund identification, AIF type, jurisdictions of investors, concentration data, leverage, liquidity profile, risk profile
- Export formats: JSON (for API consumers), CSV (for spreadsheet users), PDF (for manual submission)
- Note: this doesn't need to be the final NCA submission format — it needs to generate the data that fund administrators currently compile manually from 5 different systems

**Step 4.3 — Enhanced cap table with investor classification breakdown**
- Cap table now shows: investor name, type, jurisdiction, units held, % of fund, eligibility status, KYC expiry
- PDF export includes classification breakdown: "Professional: 65%, Semi-Professional: 30%, Institutional: 5%"
- This is the report fund administrators send to boards and regulators quarterly

**Step 4.4 — Transfer history with decision provenance**
- Transfer history now includes: link to decision record, which rules were checked, which passed/failed, rule versions at time of decision
- "Click any transfer to see exactly why it was approved or rejected, under what rules, at that point in time"
- This is the decision provenance capability — the core architectural differentiator

**Step 4.5 — Compliance dashboard**
- Dashboard page showing:
  - Fund overview: # investors by type, allocation utilization, upcoming KYC expirations
  - Recent transfer activity with pass/fail summary
  - Rule health: which rules are most commonly triggered, which are blocking the most transfers
  - Regulatory calendar: upcoming deadlines (Annex IV reporting, KYC renewals)

**Deliverable:** A complete operational workflow that a fund administrator could pilot for a real fund.

---

### Phase 5: Polish, Test, and Pilot-Ready (Week 7-9)
**Goal:** Production-quality tool ready for first pilot customer.

**Step 5.1 — API key management**
- Platforms integrate via API keys, not JWT login
- `POST /api/keys` (admin only) → generate API key with scoped permissions
- API keys are the integration path for fund administrators who want to connect Caelith to their existing systems

**Step 5.2 — Comprehensive test suite**
- Target: 120+ tests (up from 65)
- Full AIFMD scenario tests: Luxembourg RAIF lifecycle, German Spezial-AIF onboarding, Irish QIAIF transfer restrictions
- AI layer tests: NL rule compiler accuracy (mock LLM responses), RAG retrieval relevance
- Decision provenance tests: create rule → validate → change rule → validate again → verify both decisions have correct snapshots
- Scenario modeling tests: what-if analysis produces correct impact counts

**Step 5.3 — Demo environment refresh**
- Seed script creates a realistic AIFMD scenario with:
  - 3 funds (Luxembourg RAIF, German Spezial-AIF, Irish QIAIF)
  - 15 investors across 6 jurisdictions, 4 investor types
  - Pre-configured jurisdiction-specific eligibility rules
  - 10 executed transfers + 5 rejected transfers with decision records
  - Active composite rules demonstrating AIFMD compliance
- This is what you demo. This is what prospects pilot.

**Step 5.4 — CI/CD pipeline**
- GitHub Actions: lint → type-check → test → build on every push
- Automated deployment to staging environment (Hetzner)

**Step 5.5 — Documentation**
- Updated README with AIFMD-focused quick start
- "Configure Your First Fund in 5 Minutes" guide
- API reference (Swagger is already there, but add AIFMD-specific examples)
- Architecture decision records (ADRs) for key choices

**Deliverable:** A pilotable product with realistic demo data, comprehensive tests, and clear documentation.

---

### Phase 6: Go-to-Market Materials (Week 9-10)
**Goal:** Everything you need to get a pilot signed.

**Step 6.1 — One-pager (PDF)**
- Problem: "Sub-€500M AIFMs managing investor eligibility and transfer restrictions across multiple EU jurisdictions using spreadsheets and manual processes"
- Solution: "Automated, auditable compliance orchestration with jurisdiction-specific rules, AI-powered configuration, and regulator-ready reporting"
- Differentiation: deterministic + AI-assisted + source-available + temporal decision provenance
- Social proof: (pilot data when available)
- Ask: "Free 3-month pilot for qualified AIFMs"

**Step 6.2 — 3-minute product demo video**
- Screen recording: create fund → configure rules via natural language → add investors → simulate transfer → show decision provenance → export cap table
- Post on LinkedIn, include in outreach

**Step 6.3 — Pitch deck (10 slides)**
- For incubator applications and co-founder conversations
- Problem → Market → Product demo → AI innovation → Traction → Team → Ask

**Step 6.4 — LinkedIn content**
- 3 posts about AIFMD 2.0 compliance challenges
- 1 thought leadership piece: "Why Spreadsheets Won't Survive AIFMD 2.0"
- Position yourself as the person building the solution

---

## 4. What Makes This Pilotable and Innovative

A fund administrator or AIFM compliance officer piloting Caelith would:

1. **Set up their fund structure** in 5 minutes (select legal form, domicile, regulatory framework)
2. **Get pre-configured eligibility rules** for their jurisdiction (auto-suggested from regulatory templates)
3. **Ask the AI copilot** to create custom rules from their LPA terms in natural language
4. **Register test investors** with realistic profiles (type, jurisdiction, KYC status)
5. **Simulate secondary transfers** and see which pass/fail with detailed explanations
6. **View decision provenance** — click any decision, see the exact rules that applied at that moment
7. **Run what-if scenarios** — "What if we open to retail under ELTIF 2.0? Which current rules would need to change?"
8. **Export cap table** with investor classification breakdown
9. **Generate Annex IV data** for their next regulatory submission
10. **Query the regulatory knowledge base** — "What does CSSF Circular 15/633 say about semi-professional investor thresholds?"

**Why this is innovative:** No existing tool combines AI-assisted regulatory interpretation → deterministic rule enforcement → temporal decision provenance → regulator-ready export. GRC platforms don't execute. Tokenization platforms don't explain. FundApps targets large hedge funds, not sub-€500M AIFMs. Spreadsheets don't scale or audit.

**Why this has real value:** The AIFMD 2.0 deadline is April 16, 2026. Sub-€500M AIFMs need to demonstrate compliant investor eligibility processes to their NCAs. Currently, most do this manually. A tool that automates this and produces auditable decision records is immediately valuable — it's not speculative future demand, it's a deadline-driven need.

---

## 5. Risk Acknowledgments

- **AI integration depends on API costs.** Claude API calls for NL rule compilation and RAG queries will cost money. Budget ~€50-100/month during development. Consider offering AI features as a premium tier later.
- **Regulatory accuracy requires legal review.** The jurisdiction-specific eligibility thresholds you hard-code must be verified. Mark them as "community templates — verify with your legal counsel" until you have a compliance advisor.
- **This is a 9-10 week sprint.** It's aggressive but achievable with AI-assisted development, especially since the foundation (rules engine, auth, API, frontend) already exists.
- **Pilot customers may not materialize by week 10.** The outreach is already happening in parallel. If discovery calls reveal different priorities, be ready to adjust Phase 3-4 scope based on feedback.

---

*Build the thing they need for April 16, 2026. Make it smart. Make it auditable. Ship it.*
