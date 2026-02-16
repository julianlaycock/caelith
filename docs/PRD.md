# PRD.md

## Product: Caelith — Compliance Orchestration Platform for EU Alternative Investment Fund Managers

### Overview

Caelith automates investor eligibility verification, transfer restriction enforcement, and regulatory reporting for EU-regulated alternative investment fund managers. The platform combines a deterministic compliance rules engine with an AI-powered regulatory intelligence layer, producing auditable decision records with full temporal provenance.

The product targets sub-€500M AUM alternative investment fund managers (AIFMs), fund administrators, and compliance officers operating under AIFMD 2.0 (Directive 2024/927, applicable April 16, 2026) across Luxembourg, Germany, and Ireland.

### Core Value Proposition

Replace manual, spreadsheet-based investor eligibility checks and transfer restriction enforcement with an automated, auditable system that understands jurisdiction-specific rules, generates regulator-ready decision records, and lets compliance officers configure rules in natural language.

### Target User

**Primary:**
- Compliance officers at sub-€500M EU AIFMs managing investor eligibility and transfer approvals
- Fund administrators (Luxembourg, Ireland, Germany) servicing multiple AIFs with different investor class requirements
- COOs/CFOs at fund management companies responsible for regulatory reporting (AIFMD Annex IV)

**Secondary:**
- CTOs at fund administration platforms evaluating embeddable compliance APIs
- Legal counsel reviewing transfer restriction logic for LPA compliance

### Product Scope

#### Foundation Layer (Complete)

These capabilities are built and operational. They form the infrastructure for all AIFMD-specific features.

| Feature | Description | Status |
|---------|-------------|--------|
| Asset registry | Define private assets with metadata | ✅ Built |
| Investor registry | Maintain investor profiles with jurisdiction and attributes | ✅ Built |
| Ownership ledger | Track unit allocations per investor | ✅ Built |
| Deterministic rules engine | 7 built-in validation rules, pure functions, versioned | ✅ Built |
| Composite rules | AND/OR/NOT boolean logic for combining conditions | ✅ Built |
| Transfer simulation | Validate proposed transfers without executing | ✅ Built |
| Transfer execution | Validate + record atomically | ✅ Built |
| Immutable audit trail | Append-only event log for all mutations | ✅ Built |
| Cap table + PDF export | Current ownership snapshot with branded PDF generation | ✅ Built |
| Auth + RBAC | JWT authentication, 3 roles (admin, compliance_officer, viewer) | ✅ Built |
| Webhooks | HMAC-SHA256 signed event notifications with delivery tracking | ✅ Built |
| Security | Headers, rate limiting, input sanitization | ✅ Built |
| API documentation | Swagger UI, OpenAPI 3.0 spec | ✅ Built |
| EU regulatory templates | 6 pre-built templates (MiFID II, AIFMD, DLT Pilot, MiCA, DACH) | ✅ Built (generic — to be replaced with jurisdiction-specific versions) |

#### Vertical B: AIFMD Compliance Orchestration (To Build)

| Feature | Description | Priority |
|---------|-------------|----------|
| Fund structure modeling | Legal form, domicile, regulatory framework, AIFM details | P0 |
| Investor classification | 5-tier system (institutional → retail) per AIFMD definitions | P0 |
| Jurisdiction-specific eligibility | Configurable min investment thresholds per jurisdiction × investor type | P0 |
| AIFMD rule types | Investor type eligibility, minimum investment, KYC validity, concentration limits | P0 |
| AIFMD templates (jurisdiction-specific) | Luxembourg SIF/RAIF, German Spezial-AIF, Irish QIAIF, ELTIF 2.0 | P0 |
| Decision provenance records | Temporal archive with rule version snapshots per decision | P0 |
| Natural language rule configuration | LLM-powered compliance requirement → deterministic rule conversion | P1 |
| Regulatory intelligence (RAG) | Ingest AIFMD text + NCA guidance, suggest rules with citations | P1 |
| Compliance copilot | Embedded AI assistant for rule explanation, what-if analysis, regulatory Q&A | P1 |
| Scenario modeling | Impact analysis for proposed rule changes against existing investor base | P1 |
| Investor onboarding workflow | Application → eligibility check → classification → approval → allocation | P1 |
| AIFMD Annex IV data export | Article 24 reporting data structures (JSON, CSV, PDF) | P1 |
| Enhanced cap table | Investor classification breakdown, KYC status, eligibility summary | P2 |
| Compliance dashboard | Fund overview, rule health, KYC expirations, regulatory calendar | P2 |
| API key management | Platform integration via scoped API keys (not JWT) | P2 |

#### Regulatory Framework Compliance — Legal Logic Implementation

Caelith implements deterministic compliance logic against the following regulatory frameworks. All logic is codified in the rules engine and eligibility check helper, producing auditable decision records with regulatory citations.

**Primary Framework: AIFMD II (Directive 2024/927)**
- **Transposition Deadline:** 16 April 2026 (Member States must transpose and apply)
- **Transitional Provisions:** Loan origination grandfathering through 2029 (Art. 15a)
- Some Member States may be late; the platform tracks effective dates per jurisdiction

**Implemented Legal Logic (Deterministic Enforcement):**

| # | Legal Requirement | Source | Implementation | Status |
|---|-------------------|--------|----------------|--------|
| L1 | **5-tier investor classification** | AIFMD Art 4(1)(ag-aj), MiFID II Annex II | `investor_type` enum: institutional, professional, semi_professional, well_informed, retail | ✅ Enforced |
| L2 | **Investor classification evidence trail** | AIFMD II Art 4, MiFID II Art 69 | `classification_evidence` JSONB on investors: document type, reference, verification date, verifier. Methods: self_declaration, documentation, professional_assessment, regulatory_status | ✅ Implemented |
| L3 | **Jurisdiction-specific eligibility criteria** | CSSF Circ 15/633, KAGB §1, CBI AIF Rulebook | `eligibility_criteria` table: per fund × jurisdiction × investor type, with min investment thresholds, suitability flags, source citations | ✅ Enforced |
| L4 | **Minimum investment thresholds** | LU SIF Law Art 2 (€125K), KAGB §1 (€200K), CBI SI 257/2013 (€100K), ELTIF Reg Art 30 (€10K retail) | Rules engine `minimum_investment` check + eligibility criteria cross-reference | ✅ Enforced |
| L5 | **KYC status and expiry validation** | AMLD 4/5/6, AIFMD Art 12(1)(e) | `kyc_required` rule: receiver must have verified, non-expired KYC. 30-day expiry warning triggers pending_approval | ✅ Enforced |
| L6 | **Concentration limits** | AIFMD Art 14(1), ESMA Guidelines 2014/937 | `concentration_limit_pct` rule: max % of total units per investor. Checked with real-time asset aggregates | ✅ Enforced |
| L7 | **Maximum investor limits** | SIF Law Art 2, fund-specific LPA terms | `maximum_investors` rule: max distinct investors per asset class | ✅ Enforced |
| L8 | **Investor type whitelist per asset** | AIFMD Art 4(1), fund prospectus/LPA | `investor_type_whitelist` rule: only permitted investor types can receive transfers | ✅ Enforced |
| L9 | **Leverage limits (commitment + gross method)** | AIFMD Art 25(3), AIFMD II Art 15(4-5), ESMA Guidelines on Leverage | `leverage_limit_commitment` and `leverage_limit_gross` on fund structures; rules engine blocks transfers if fund exceeds limits | ✅ Enforced |
| L10 | **Liquidity Management Tools (LMTs)** | AIFMD II Art 16(2b), ESMA LMT Guidelines 2024 | `lmt_types` JSONB on fund structures: redemption gates, notice periods, swing pricing, anti-dilution levies, side pockets, suspension, redemption in kind. Per-fund configuration with activation thresholds | ✅ Tracked |
| L11 | **Liquidity profile (Annex IV buckets)** | AIFMD Annex IV, Art 24(2) | 7-bucket liquidity profile: 1d, 2-7d, 8-30d, 31-90d, 91-180d, 181-365d, >365d | ✅ Reported |
| L12 | **Geographic exposure** | AIFMD Annex IV | Per-fund geographic allocation breakdown | ✅ Reported |
| L13 | **Counterparty exposure** | AIFMD Annex IV, Art 24(2)(d) | Top counterparties with LEI identifiers and exposure % | ✅ Reported |
| L14 | **Decision provenance with integrity chain** | AIFMD Art 12(1)(d), GDPR Art 22(3) | Every compliance decision creates an immutable record with SHA-256 integrity chain, rule version snapshots, and temporal reconstruction capability | ✅ Enforced |
| L15 | **AIFMD Annex IV reporting data** | AIFMD Art 24, Annex IV | AIF identification, investor concentration, principal exposures, leverage, liquidity, geographic/counterparty exposure, risk profile, compliance status | ✅ ~80% coverage |
| L16 | **Fund structure modeling** | AIFMD Art 4(1)(a-f) | Legal form, domicile, regulatory framework, AIFM details with LEI, inception date, target size, currency | ✅ Implemented |
| L17 | **Transfer approval workflow** | AIFMD Art 12(1), internal controls | Transfers exceeding threshold → pending_approval. KYC expiring within 30 days → pending_approval. RBAC-gated approval/rejection with decision records | ✅ Enforced |
| L18 | **Onboarding workflow** | AIFMD Art 12(1)(e), AMLD due diligence | 6-step lifecycle: applied → eligible/ineligible → approved/rejected → allocated. Automated eligibility + manual approval gate | ✅ Implemented |

**Pre-populated Jurisdiction Data:**

| Jurisdiction | Fund Types | Investor Types | Min Investment | Source |
|-------------|-----------|---------------|---------------|--------|
| Luxembourg (SIF) | SIF | Professional, semi-professional, institutional | €0 / €125,000 (semi-pro) | SIF Law 13 Feb 2007, Art. 2 |
| Luxembourg (RAIF) | RAIF | Professional, semi-professional, institutional | €0 / €125,000 (semi-pro) | RAIF Law 23 Jul 2016, Art. 3 |
| Ireland (QIAIF) | QIAIF | Professional, institutional | €100,000 (professional) | CBI SI 257/2013 |
| EU (ELTIF 2.0) | ELTIF | All types (retail-friendly) | €0 (retail, suitability req) / €10,000 (semi-pro/well-informed) | Regulation (EU) 2023/606, Art. 30 |

**Known Gaps (Planned):**

| # | Gap | Priority | Target |
|---|-----|----------|--------|
| G1 | Full Annex IV NCA electronic submission | P2 | Post-pilot |
| G2 | ELTIF 2.0 suitability assessment questionnaire workflow | P1 | Sprint 5 |
| G3 | Regulatory document RAG pipeline (AIFMD text ingestion) | P1 | Sprint 6 |
| G4 | DORA ICT risk management integration | P3 | Vertical A |
| G5 | MiCA tokenized fund shares compliance | P3 | Vertical C |

#### Explicitly Out of Scope (This Phase)

- Blockchain integration / on-chain rule export
- AI Act explainability bridge (Vertical C — deferred)
- DORA compliance module (Vertical A — deferred)
- KYC/AML provider integration (IDnow, Onfido — deferred to post-pilot)
- Multi-tenancy
- Payment processing / NAV calculation
- Custodial services
- Full Annex IV NCA submission (generate data, not submit electronically)
- Visual drag-and-drop rule builder (deferred — NL rule config replaces this)

---

### Functional Requirements

#### FR-1: Asset Management (Existing — Extend)

**Existing:** Create asset with name, total units, asset type. Immutable after creation.

**Extension:**
- Associate asset with a fund structure (legal form, domicile, regulatory framework)
- Fund structure defines: `legal_form` (SICAV, SIF, RAIF, ELTIF, SCSp, SCA, Spezial-AIF, QIAIF, RIAIF), `domicile` (ISO 3166), `regulatory_framework` (AIFMD, UCITS, ELTIF, national), `aifm_name`, `aifm_lei`, `inception_date`, `target_size`, `currency`
- Fund structure is created first, then one or more assets are linked to it
- View fund structure details alongside asset information

#### FR-2: Investor Registry (Existing — Extend)

**Existing:** Add investor with name, jurisdiction, accreditation status. Update attributes.

**Extension:**
- Replace binary `accredited` with `investor_type` enum: `institutional`, `professional`, `semi_professional`, `well_informed`, `retail`
- Retain `accredited` as a derived field for backward compatibility (`true` if type is professional, semi_professional, well_informed, or institutional)
- Add fields: `kyc_status` (pending, verified, expired), `kyc_expiry` (date), `tax_id`, `lei` (Legal Entity Identifier, optional), `email`
- Investor classification is per-investor (not per-fund), reflecting their regulatory status in their home jurisdiction
- Support updating investor type (e.g., retail → semi_professional after meeting threshold)

#### FR-3: Ownership Records (Existing — No Change)

Unchanged. Allocation, holdings view, and cap table remain as built.

#### FR-4: Rule Configuration (Existing — Extend)

**Existing:** Rule set per asset with `qualification_required`, `lockup_days`, `jurisdiction_whitelist`, `transfer_whitelist`. Versioned. Composite rules with AND/OR/NOT.

**Extension — new built-in rule parameters:**
- `investor_type_whitelist` (string array): Allowed investor classifications for this asset (e.g., `["professional", "semi_professional", "institutional"]`)
- `minimum_investment` (bigint): Minimum units for a transfer/allocation (enforced per transaction)
- `maximum_investors` (integer, nullable): Maximum number of distinct investors in this asset
- `concentration_limit_pct` (decimal, nullable): Maximum % of total units a single investor can hold
- `kyc_required` (boolean): Receiver must have `kyc_status = 'verified'` and non-expired KYC

**Extension — new composite rule field conditions:**
- `to.investor_type`: Receiver's investor classification
- `to.kyc_status`: Receiver's KYC status
- `to.kyc_expiry`: Receiver's KYC expiry date
- `fund.legal_form`: Fund's legal structure
- `fund.domicile`: Fund's domicile jurisdiction
- `fund.regulatory_framework`: Fund's regulatory framework

#### FR-5: Transfer Operations (Existing — Extend)

**Existing:** Simulate and execute transfers with validation. Return pass/fail with reasons.

**Extension:**
- Validation now checks all new rule types (investor type, minimum investment, KYC, concentration, max investors)
- Jurisdiction-specific eligibility: when validating, the engine cross-references the receiver's jurisdiction + investor type against the fund's eligibility criteria table to check minimum investment thresholds
- Every validation (simulate or execute) creates a **decision provenance record** containing:
  - Full input snapshot (from, to, units, timestamp)
  - Rule version snapshot (exact rules + eligibility criteria that applied)
  - Per-rule check results with pass/fail + human-readable explanation
  - Timestamp and acting user
- Decision records are immutable and queryable: "Show me the exact rules that applied to transfer X on date Y"

#### FR-6: Audit Trail (Existing — Extend)

**Existing:** Append-only event log with timestamp, type, entity, payload.

**Extension:**
- New event types: `investor.classified`, `eligibility.checked`, `onboarding.submitted`, `onboarding.approved`, `onboarding.rejected`, `copilot.query`, `copilot.rule_proposed`, `scenario.analyzed`, `report.generated`
- Events for AI-assisted actions include the LLM input/output summary and confidence score
- Rule version snapshot stored in event payload for all validation events (enables temporal reconstruction)

#### FR-7: Reporting (Existing — Extend)

**Existing:** Cap table, transfer history, validation failures.

**Extension:**
- **Enhanced cap table:** Includes investor classification, jurisdiction, KYC status, eligibility status, and % allocation per investor. PDF export includes classification breakdown summary.
- **AIFMD Annex IV data export:** Generate the data required for Article 24 reporting to NCAs. Includes: fund identification, AIF type, investor concentration by jurisdiction and type, principal exposures, liquidity profile. Export as JSON (API), CSV (manual use), PDF (submission-ready format).
- **Decision provenance report:** For any asset, export a chronological log of all compliance decisions with full rule version context. Intended audience: regulators during examinations.
- **Compliance summary dashboard data:** Investors by type, allocation utilization, upcoming KYC expirations, recent rule violations, regulatory deadlines.

#### FR-8: Jurisdiction-Specific Eligibility Criteria (New)

- Define eligibility rules per fund structure, scoped by jurisdiction and investor type
- Each eligibility rule specifies: `jurisdiction`, `investor_type`, `minimum_investment` (in fund currency), `maximum_allocation_pct` (optional), `documentation_required` (list of document types), `effective_date`, `source_reference` (regulatory citation)
- Pre-populate with verified criteria for 3 launch jurisdictions:
  - **Luxembourg:** SIF/RAIF — €125,000 minimum for semi-professional investors (CSSF Circular 15/633); ELTIF 2.0 — €10,000 retail (with suitability flag)
  - **Germany:** Spezial-AIF — €200,000 minimum for semi-professional investors (KAGB §1); open-ended retail — €50 minimum
  - **Ireland:** QIAIF — €100,000 minimum for qualifying investors (CBI AIF Rulebook); RIAIF — no minimum (retail suitability required)
- Eligibility criteria are versioned alongside rules. When criteria change, historical decisions retain the criteria that were active at decision time.
- Compliance officers can add/modify criteria for additional jurisdictions through the UI or API

#### FR-9: Investor Onboarding Workflow (New)

- Structured workflow: investor submits application → automated eligibility check (rules engine) → classification assignment → manual approval (admin/compliance_officer role) → allocation
- Eligibility check validates: investor type is permitted for the fund, minimum investment threshold met for investor's jurisdiction, KYC is valid, jurisdiction is whitelisted
- Approval step is RBAC-gated (admin or compliance_officer only) and creates a decision provenance record
- Rejection includes reasons (which eligibility criteria failed) and is logged as an event
- Onboarding status visible per investor: `applied`, `eligible`, `ineligible`, `approved`, `rejected`, `allocated`

#### FR-10: Natural Language Rule Configuration (New — AI-Powered)

- Endpoint accepts a natural language compliance requirement and an asset ID
- LLM interprets the intent and generates a structured rule configuration matching the existing rule JSON schema
- The deterministic validator checks the generated rule for structural validity
- Response includes: proposed rule (JSON), confidence score, plain-language explanation of what the rule does, and `requires_approval: true` flag
- Rules generated via NL **never auto-activate**. Compliance officer must review and explicitly approve.
- All NL rule generation attempts are logged in the events table (`copilot.rule_proposed`) with the original natural language input, generated rule, and confidence score

**Example input:** "Block retail investors from this Luxembourg SIF unless they commit at least 125,000 euros and have verified KYC"

**Example output:**
```json
{
  "proposed_rule": {
    "operator": "AND",
    "conditions": [
      { "field": "to.investor_type", "operator": "eq", "value": "retail" },
      { "field": "fund.legal_form", "operator": "eq", "value": "SIF" }
    ],
    "then_check": {
      "operator": "AND",
      "conditions": [
        { "field": "transfer.units_value", "operator": "gte", "value": 125000 },
        { "field": "to.kyc_status", "operator": "eq", "value": "verified" }
      ]
    }
  },
  "confidence": 0.94,
  "explanation": "This rule blocks transfers to retail investors in SIF funds unless the transfer value is at least €125,000 and the receiving investor has verified KYC status.",
  "source_suggestion": "Consistent with CSSF Circular 15/633 Section 4.2",
  "requires_approval": true
}
```

#### FR-11: Regulatory Intelligence Layer (New — AI-Powered)

- RAG pipeline ingests regulatory documents (PDF/HTML): AIFMD 2.0 full text, NCA implementation circulars, fund structure guidance
- Documents are chunked by article/section, embedded, and stored with metadata (jurisdiction, framework, article number, effective date)
- Query endpoint: accepts a natural language question about regulatory requirements, returns relevant text chunks with source citations
- Template suggestion endpoint: given a fund structure + domicile, suggests applicable eligibility criteria and rule configurations with citations to specific regulatory articles
- Every AI-generated suggestion includes a confidence score and a "verify with legal counsel" disclaimer
- Initial corpus (3 jurisdictions):
  - AIFMD 2.0 (Directive 2024/927) full text
  - Luxembourg: CSSF Circular 15/633 (SIF), CSSF Circular 18/698 (RAIF), CSSF FAQ on ELTIF 2.0
  - Germany: KAGB (Kapitalanlagegesetzbuch) relevant sections, BaFin guidance on Spezial-AIF
  - Ireland: CBI AIF Rulebook, CBI AIFMD Q&A

#### FR-12: Compliance Copilot (New — AI-Powered)

- Embedded chat interface in the Caelith dashboard
- Capabilities:
  - **Decision explanation:** "Why was this transfer rejected?" — queries the decision provenance record and explains each rule violation in plain language with regulatory citations
  - **Rule exploration:** "What rules apply to this fund?" — lists active rules with explanations and regulatory source references
  - **Rule drafting:** "Create a rule that restricts transfers to..." — invokes NL rule configuration (FR-10) from the chat
  - **Regulatory Q&A:** "What does CSSF Circular 15/633 say about semi-professional thresholds?" — RAG-powered answer (FR-11)
  - **Scenario analysis:** "What if we changed the minimum investment to €150K?" — invokes scenario modeling (FR-13)
- All copilot interactions are logged as events (`copilot.query`) with input, output, and source references
- The copilot is itself subject to decision provenance: every AI-assisted action creates an auditable record

#### FR-13: Scenario Modeling (New)

- Endpoint accepts: proposed rule change (or new eligibility criteria) + asset ID
- Analyzes impact against current investor base and pending transfers
- Returns:
  - Number of current investors who would no longer meet eligibility under proposed change
  - List of affected investors with reasons (which criteria they would fail)
  - Number of pending/recent transfers that would have been blocked
  - Summary statistics (e.g., "This change affects 12 of 45 investors, representing 8.3% of allocated units")
- Scenario results are logged but do not modify any data. Read-only analysis.

#### FR-14: AIFMD Regulatory Templates (New — Replaces Generic EU Templates)

Replace the 6 generic EU templates with jurisdiction-specific AIFMD fund templates:

| Template | Legal Form | Jurisdictions | Investor Types | Min Investment | Lockup | Key Rules |
|----------|-----------|---------------|---------------|---------------|--------|-----------|
| Luxembourg SIF | SIF | EEA + CH | Professional, semi-professional, institutional | €125K (semi-professional) | 90 days | Jurisdiction whitelist, investor type check, min investment |
| Luxembourg RAIF | RAIF | EEA | Professional, institutional | None (professional only) | 0 | Investor type restricted to professional+ |
| German Spezial-AIF | Spezial-AIF | DACH | Professional, semi-professional | €200K (semi-professional) | 180 days | Jurisdiction whitelist, investor type, min investment |
| Irish QIAIF | QIAIF | EU + UK + CH | Qualifying investor | €100K | 30 days | Min investment, jurisdiction whitelist |
| ELTIF 2.0 (Retail) | ELTIF | EU | All types | €10K (retail, with suitability) | Per fund policy (default 5yr) | Min investment, suitability flag for retail |
| AIFMD 2.0 Loan Origination | Per fund | EU | Professional, institutional | Per fund | Per fund | Leverage limits, origination caps |

Each template creates: base rules, composite rules, and eligibility criteria for the target jurisdiction(s). Templates include `source_reference` citations to the specific regulatory articles they implement.

---

### Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| Validation performance | < 100ms p99 for rule validation (including eligibility criteria lookup) |
| Data integrity | ACID transactions for all state mutations |
| Determinism | Identical inputs + identical rule version → identical validation output |
| AI/deterministic separation | LLM outputs are always validated by the deterministic engine before presentation. AI never auto-activates rules or modifies state. |
| Temporal correctness | Any historical decision can be reconstructed with the exact rules that applied at decision time |
| Testability | All validation logic unit-testable without database. AI layer testable with mocked LLM responses. |
| Auditability | Every state mutation, validation, and AI-assisted action logged in immutable events table |
| Deployment | Single-machine Docker Compose (PostgreSQL + backend + frontend) |
| AI transparency | All LLM calls logged with input, output, confidence, and source references |
| Regulatory disclaimer | All AI-generated suggestions marked as "verify with legal counsel" — not legal advice |

### Success Criteria

#### Core AIFMD Scenarios
- [ ] Configure a Luxembourg RAIF with professional-only investor restrictions and 90-day lockup
- [ ] Configure a German Spezial-AIF with €200K minimum for semi-professional investors
- [ ] Configure an Irish QIAIF with €100K qualifying investor threshold
- [ ] Register 15 investors across 6 EU jurisdictions with 4 investor types (institutional, professional, semi-professional, retail)
- [ ] Automatically classify investor eligibility for a specific fund based on their type and jurisdiction
- [ ] Simulate 20 secondary transfers with jurisdiction-specific eligibility checks (mix of valid/invalid)
- [ ] Execute 10 valid transfers with full decision provenance records
- [ ] Reject a transfer because the receiver's investor type is not permitted for the fund structure
- [ ] Reject a transfer because the minimum investment threshold for the receiver's jurisdiction is not met
- [ ] Reject a transfer because the receiver's KYC has expired

#### Decision Provenance
- [ ] View the exact rules and eligibility criteria that applied to any historical transfer
- [ ] Change a rule, validate the same transfer again, and verify both decisions have different rule version snapshots
- [ ] Export a decision provenance report for a fund covering 30 days of activity

#### AI-Powered Features
- [ ] Configure a 3-condition composite rule via natural language input
- [ ] Natural language rule generation achieves 90%+ structural validity (passes deterministic validator)
- [ ] Query the regulatory knowledge base and receive an answer with citations to specific AIFMD articles
- [ ] Compliance copilot explains a rejected transfer with per-rule breakdown and regulatory references
- [ ] Run a what-if scenario: "Change minimum investment from €125K to €150K" and receive impact analysis

#### Reporting
- [ ] Export cap table PDF with investor classification breakdown (type, jurisdiction, KYC status)
- [ ] Generate AIFMD Annex IV data export (JSON + CSV) for a fund
- [ ] View compliance dashboard: investors by type, KYC expirations, recent rule violations

#### Operational
- [ ] Onboard an investor through full workflow: apply → eligibility check → approve → allocate
- [ ] 120+ automated tests passing (up from 65)
- [ ] CI/CD pipeline running on every push
- [ ] Realistic demo environment with 3 funds, 15 investors, pre-configured AIFMD rules

### Hypotheses Under Validation

These assumptions are being tested through customer discovery in parallel with development. Findings may alter feature priority.

| ID | Hypothesis | Validation Method | Impact if False |
|----|-----------|-------------------|-----------------|
| H1 | The decision provenance gap is a buying problem, not just an architectural observation | Ask in discovery calls: "What does reconstructing a compliance decision from 6 months ago look like?" | De-prioritize temporal decision archive; focus on real-time eligibility checking |
| H2 | Sub-€500M AIFMs will pay €500-2K/month for automated eligibility + transfer restriction enforcement | Offer free 3-month pilot to prospects using spreadsheets | Vertical B is not viable at this price point; adjust or pivot |
| H3 | Natural language rule configuration is a 10x UX improvement over form-based interfaces | Demo both approaches; measure preference and time-to-configure | Ship as secondary feature, keep form UI as primary |
| H4 | Regulatory document RAG creates a wedge product for customer acquisition | Demo RAG pipeline to 5 prospects; ask "Would this alone save you time?" | Keep as assistant feature, not standalone capability |
| H8 | Compliance officers (not CTOs) are the primary buyer | Track who has budget authority in discovery calls | Adjust all marketing and UI to compliance officer language |
| H9 | Pre-built jurisdiction templates are the wedge, not the engine | Lead demos with templates; measure engagement vs. engine-first demos | Restructure GTM around "compliance-as-configuration" |

### Future Considerations (Post Vertical B)

- DORA compliance module (Vertical A — decision provenance for ICT risk management)
- AI Act explainability bridge (Vertical C — deterministic policy layer for ML model decisions)
- KYC/AML provider integration (IDnow, Onfido production access)
- On-chain rule export (ERC-3643/ERC-1400 compatible configurations)
- Visual drag-and-drop rule builder
- Multi-tenancy for fund administrator platforms serving multiple AIFMs
- API key marketplace for third-party rule template contributions
- Self-hosted LLM option for enterprise customers with data residency requirements
