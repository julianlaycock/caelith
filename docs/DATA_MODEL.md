# DATA_MODEL.md

## Data Model Specification — Vertical B (AIFMD Compliance Orchestration)

This document extends the original MVP schema for AIFMD 2.0 compliance. All changes are backward-compatible via sequential migrations. Existing tables are extended (never broken); new tables are added.

### ER Diagram (Text)
```
FUND_STRUCTURES (1) ──< (M) ASSETS (1) ──< (M) HOLDINGS (M) >── (1) INVESTORS
                                │                                      │
                                │                                      │
                                ▼                                      │
                             RULES                                     │
                                │                                      │
                                ▼                                      │
                          RULE_VERSIONS                                │
                                                                       │
ELIGIBILITY_CRITERIA (M) >── (1) FUND_STRUCTURES                      │
                     (M) ──  scoped by jurisdiction × investor_type    │
                                                                       │
ONBOARDING_RECORDS (M) >── (1) ASSETS                                 │
                   (M) >── (1) INVESTORS                               │
                                                                       │
TRANSFERS (M) ──> (1) ASSETS                                          │
          (M) ──> (1) INVESTORS (from)                                │
          (M) ──> (1) INVESTORS (to)                                  │
                                                                       │
DECISION_RECORDS (M) ──> (1) ASSETS                                   │
                 linked to TRANSFERS or ONBOARDING_RECORDS             │
                                                                       │
REGULATORY_DOCUMENTS (standalone, vector-indexed)                      │
                                                                       │
EVENTS (append-only log)                                               │
```

---

## Tables — Existing (Extended)

### assets
**Purpose:** Asset/fund share class definitions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Asset name (e.g., "European Private Credit Fund I — Class A") |
| asset_type | VARCHAR(100) | NOT NULL | e.g., "Fund", "LP Interest", "Share Class" |
| total_units | BIGINT | NOT NULL, > 0 | Total authorized units |
| **fund_structure_id** | **UUID** | **FK → fund_structures.id, NULL** | **Associated fund structure (NULL for legacy/non-fund assets)** |
| **unit_price** | **DECIMAL(18,4)** | **NULL** | **Current unit price in fund currency (for minimum investment calculations)** |
| created_at | TIMESTAMP | NOT NULL | Creation time |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (fund_structure_id)

**Migration note:** `fund_structure_id` and `unit_price` added as nullable columns. Existing assets continue to work with NULL fund_structure_id.

---

### investors
**Purpose:** Investor registry with AIFMD classification and KYC attributes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Investor name (individual or entity) |
| jurisdiction | VARCHAR(100) | NOT NULL | Country/region code (ISO 3166-1 alpha-2) |
| accredited | BOOLEAN | NOT NULL | **Legacy field — derived from investor_type** |
| **investor_type** | **VARCHAR(50)** | **NOT NULL, DEFAULT 'retail'** | **AIFMD classification (see enum below)** |
| **kyc_status** | **VARCHAR(20)** | **NOT NULL, DEFAULT 'pending'** | **KYC verification state** |
| **kyc_expiry** | **DATE** | **NULL** | **KYC verification expiry date** |
| **tax_id** | **VARCHAR(100)** | **NULL** | **Tax identification number** |
| **lei** | **VARCHAR(20)** | **NULL** | **Legal Entity Identifier (ISO 17442, 20 chars)** |
| **email** | **VARCHAR(255)** | **NULL** | **Contact email** |
| created_at | TIMESTAMP | NOT NULL | Registration time |
| updated_at | TIMESTAMP | NOT NULL | Last update time |

**Enums:**

`investor_type`:
| Value | AIFMD Definition | Typical Threshold |
|-------|-----------------|-------------------|
| `institutional` | Credit institutions, investment firms, insurance companies, pension funds, central banks, supranationals | Regulated entity status |
| `professional` | MiFID II Annex II professional client (per se or elective) | Meets 2 of 3 MiFID II criteria |
| `semi_professional` | Commits minimum amount + written declaration of risk awareness (jurisdiction-specific thresholds) | €100K–€200K depending on jurisdiction |
| `well_informed` | Luxembourg-specific: experienced in financial sector OR commits €125K+ OR certified by credit institution | €125K or professional certification |
| `retail` | All other investors | No threshold |

`kyc_status`:
| Value | Description |
|-------|-------------|
| `pending` | KYC not yet submitted or under review |
| `verified` | KYC completed and valid |
| `expired` | KYC verification has passed expiry date |
| `rejected` | KYC verification failed |

**Derived field logic:** `accredited` is computed as `investor_type IN ('institutional', 'professional', 'semi_professional', 'well_informed')`. Maintained for backward compatibility with existing rules engine checks.

**Constraints:**
- CHECK (investor_type IN ('institutional', 'professional', 'semi_professional', 'well_informed', 'retail'))
- CHECK (kyc_status IN ('pending', 'verified', 'expired', 'rejected'))
- CHECK (lei IS NULL OR length(lei) = 20)

**Indexes:**
- PRIMARY KEY (id)
- INDEX (jurisdiction)
- INDEX (investor_type)
- INDEX (kyc_status)

**Migration note:** Existing investors migrated: `accredited = true` → `investor_type = 'professional'`; `accredited = false` → `investor_type = 'retail'`. All get `kyc_status = 'verified'` to avoid breaking existing validation flows.

---

### rules
**Purpose:** Active rule configuration per asset — extended with AIFMD parameters

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| asset_id | UUID | FK → assets.id, UNIQUE | Asset (one active ruleset per asset) |
| version | INTEGER | NOT NULL | Version number (starts at 1) |
| qualification_required | BOOLEAN | NOT NULL | **Legacy: must be accredited investor (use investor_type_whitelist for new rules)** |
| lockup_days | INTEGER | NOT NULL, >= 0 | Days after acquisition before transfer |
| jurisdiction_whitelist | JSONB | NOT NULL | Array of allowed jurisdiction codes |
| transfer_whitelist | JSONB | NULL | Array of investor IDs or null (unrestricted) |
| **investor_type_whitelist** | **JSONB** | **NULL** | **Array of allowed investor_type values, or null (unrestricted). e.g., `["professional", "institutional"]`** |
| **minimum_investment** | **BIGINT** | **NULL, >= 0** | **Minimum units per transfer/allocation (0 or null = no minimum)** |
| **maximum_investors** | **INTEGER** | **NULL, > 0** | **Maximum distinct investors for this asset (null = unlimited)** |
| **concentration_limit_pct** | **DECIMAL(5,2)** | **NULL, > 0, <= 100** | **Max % of total units a single investor can hold (null = unlimited)** |
| **kyc_required** | **BOOLEAN** | **NOT NULL, DEFAULT false** | **Receiver must have kyc_status = 'verified' and non-expired KYC** |
| created_at | TIMESTAMP | NOT NULL | Rule creation time |

**Constraints:**
- UNIQUE (asset_id)
- CHECK (lockup_days >= 0)
- CHECK (minimum_investment IS NULL OR minimum_investment >= 0)
- CHECK (maximum_investors IS NULL OR maximum_investors > 0)
- CHECK (concentration_limit_pct IS NULL OR (concentration_limit_pct > 0 AND concentration_limit_pct <= 100))

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX (asset_id)

**Migration note:** New columns added as nullable (except `kyc_required` which defaults to `false`). Existing rules continue to work unchanged.

---

### events
**Purpose:** Immutable audit trail — extended with AIFMD and AI event types

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| event_type | VARCHAR(100) | NOT NULL | Event category |
| entity_type | VARCHAR(100) | NOT NULL | Affected entity type |
| entity_id | UUID | NOT NULL | Affected entity ID |
| payload | JSONB | NOT NULL | Event data (schema varies by type) |
| timestamp | TIMESTAMP | NOT NULL | Event occurrence time |

**Event Types (original):**
- `asset.created`
- `investor.created`
- `investor.updated`
- `holding.allocated`
- `holding.updated`
- `rules.created`
- `rules.updated`
- `transfer.executed`
- `transfer.rejected`

**Event Types (new — AIFMD):**
- `fund_structure.created` — fund structure registered
- `fund_structure.updated` — fund structure metadata changed
- `investor.classified` — investor_type changed (with old/new values in payload)
- `investor.kyc_updated` — KYC status changed
- `eligibility.checked` — automated eligibility check ran (pass/fail + criteria used)
- `onboarding.submitted` — investor application received
- `onboarding.approved` — investor approved for fund (by whom)
- `onboarding.rejected` — investor rejected (with reasons)
- `decision.recorded` — decision provenance record created (links to decision_records.id)

**Event Types (new — AI layer):**
- `copilot.query` — user asked the compliance copilot a question (input + output summary)
- `copilot.rule_proposed` — AI generated a proposed rule from natural language (NL input, generated JSON, confidence)
- `copilot.rule_approved` — user approved an AI-proposed rule
- `copilot.rule_rejected` — user rejected an AI-proposed rule
- `scenario.analyzed` — what-if scenario analysis ran (parameters + results summary)
- `report.generated` — regulatory report exported (type, format, asset_id)

**Indexes:**
- PRIMARY KEY (id)
- INDEX (timestamp DESC)
- INDEX (entity_type, entity_id)
- INDEX (event_type)

---

### holdings
**Purpose:** Current ownership positions — **no schema changes**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| investor_id | UUID | FK → investors.id | Owner |
| asset_id | UUID | FK → assets.id | Asset |
| units | BIGINT | NOT NULL, >= 0 | Units held |
| acquired_at | TIMESTAMP | NOT NULL | Initial acquisition time (for lockup) |
| created_at | TIMESTAMP | NOT NULL | Record creation |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Constraints:**
- UNIQUE (investor_id, asset_id)
- CHECK (units >= 0)

**Indexes:**
- PRIMARY KEY (id)
- INDEX (asset_id)
- INDEX (investor_id)

---

### transfers
**Purpose:** Transfer history (executed only) — extended with decision record link

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| asset_id | UUID | FK → assets.id | Asset transferred |
| from_investor_id | UUID | FK → investors.id | Sender |
| to_investor_id | UUID | FK → investors.id | Receiver |
| units | BIGINT | NOT NULL, > 0 | Units transferred |
| **decision_record_id** | **UUID** | **FK → decision_records.id, NULL** | **Link to the decision provenance record for this transfer** |
| executed_at | TIMESTAMP | NOT NULL | Transfer execution time |
| created_at | TIMESTAMP | NOT NULL | Record creation (for ordering) |

**Constraints:**
- CHECK (units > 0)
- CHECK (from_investor_id != to_investor_id)

**Indexes:**
- PRIMARY KEY (id)
- INDEX (asset_id, executed_at DESC)
- INDEX (from_investor_id)
- INDEX (to_investor_id)
- INDEX (decision_record_id)

---

## Tables — New

### fund_structures
**Purpose:** Fund legal structure, domicile, and AIFM registration details. One fund structure can have multiple assets (share classes).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Fund name (e.g., "European Private Credit Fund I") |
| legal_form | VARCHAR(50) | NOT NULL | Legal structure type (see enum) |
| domicile | VARCHAR(10) | NOT NULL | Fund domicile (ISO 3166-1 alpha-2) |
| regulatory_framework | VARCHAR(50) | NOT NULL | Governing regulatory framework (see enum) |
| aifm_name | VARCHAR(255) | NULL | Managing AIFM entity name |
| aifm_lei | VARCHAR(20) | NULL | AIFM Legal Entity Identifier |
| inception_date | DATE | NULL | Fund inception/launch date |
| target_size | BIGINT | NULL | Target fund size in smallest currency unit (cents) |
| currency | VARCHAR(3) | NOT NULL, DEFAULT 'EUR' | Fund currency (ISO 4217) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | Fund status |
| created_at | TIMESTAMP | NOT NULL | Record creation |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Enums:**

`legal_form`:
| Value | Jurisdiction | Description |
|-------|-------------|-------------|
| `SICAV` | Luxembourg | Société d'Investissement à Capital Variable |
| `SIF` | Luxembourg | Specialised Investment Fund (Law of 13 February 2007) |
| `RAIF` | Luxembourg | Reserved Alternative Investment Fund |
| `SCSp` | Luxembourg | Société en Commandite Spéciale (limited partnership) |
| `SCA` | Luxembourg | Société en Commandite par Actions |
| `ELTIF` | EU-wide | European Long-Term Investment Fund (Reg 2015/760, reformed 2023) |
| `Spezial_AIF` | Germany | Spezial-AIF under KAGB (professional/semi-professional only) |
| `Publikums_AIF` | Germany | Open-ended retail AIF under KAGB |
| `QIAIF` | Ireland | Qualifying Investor AIF (CBI AIF Rulebook) |
| `RIAIF` | Ireland | Retail Investor AIF |
| `LP` | General | Generic limited partnership |
| `other` | General | Other legal form |

`regulatory_framework`:
| Value | Description |
|-------|-------------|
| `AIFMD` | Alternative Investment Fund Managers Directive (2011/61/EU + 2024/927) |
| `UCITS` | Undertakings for Collective Investment in Transferable Securities |
| `ELTIF` | European Long-Term Investment Fund Regulation |
| `national` | National-only framework (no EU passport) |

`status`:
| Value | Description |
|-------|-------------|
| `active` | Fund is open and operational |
| `closing` | Fund is in closing period |
| `closed` | Fund is closed to new investors |
| `liquidating` | Fund is being wound down |

**Constraints:**
- CHECK (legal_form IN ('SICAV', 'SIF', 'RAIF', 'SCSp', 'SCA', 'ELTIF', 'Spezial_AIF', 'Publikums_AIF', 'QIAIF', 'RIAIF', 'LP', 'other'))
- CHECK (regulatory_framework IN ('AIFMD', 'UCITS', 'ELTIF', 'national'))
- CHECK (status IN ('active', 'closing', 'closed', 'liquidating'))
- CHECK (aifm_lei IS NULL OR length(aifm_lei) = 20)
- CHECK (currency ~ '^[A-Z]{3}$')

**Indexes:**
- PRIMARY KEY (id)
- INDEX (domicile)
- INDEX (legal_form)
- INDEX (regulatory_framework)

---

### eligibility_criteria
**Purpose:** Jurisdiction-specific investor eligibility rules per fund structure. Defines who can invest under what conditions, scoped by jurisdiction and investor type. This is the core AIFMD compliance table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| fund_structure_id | UUID | FK → fund_structures.id | Which fund structure this criterion applies to |
| jurisdiction | VARCHAR(10) | NOT NULL | Investor jurisdiction this criterion applies to (ISO 3166-1 alpha-2, or `*` for all) |
| investor_type | VARCHAR(50) | NOT NULL | Investor classification this criterion applies to |
| minimum_investment | BIGINT | NOT NULL, >= 0 | Minimum investment in smallest currency unit (cents). 0 = no minimum. |
| maximum_allocation_pct | DECIMAL(5,2) | NULL | Max % of fund this investor type can hold in aggregate (null = unlimited) |
| documentation_required | JSONB | NOT NULL, DEFAULT '[]' | Array of required document types (e.g., `["risk_declaration", "suitability_assessment"]`) |
| suitability_required | BOOLEAN | NOT NULL, DEFAULT false | Whether a suitability assessment is required (ELTIF retail, RIAIF) |
| source_reference | VARCHAR(500) | NULL | Regulatory citation (e.g., "SIF Law 13 Feb 2007, Art. 2") |
| effective_date | DATE | NOT NULL | Date this criterion becomes effective |
| superseded_at | DATE | NULL | Date this criterion was replaced (NULL = currently active) |
| created_at | TIMESTAMP | NOT NULL | Record creation |

**Constraints:**
- UNIQUE (fund_structure_id, jurisdiction, investor_type, effective_date)
- CHECK (minimum_investment >= 0)
- CHECK (investor_type IN ('institutional', 'professional', 'semi_professional', 'well_informed', 'retail'))
- CHECK (maximum_allocation_pct IS NULL OR (maximum_allocation_pct > 0 AND maximum_allocation_pct <= 100))

**Indexes:**
- PRIMARY KEY (id)
- INDEX (fund_structure_id)
- INDEX (jurisdiction, investor_type)
- INDEX (effective_date)

**Pre-populated data (3 launch jurisdictions):**

| Fund Type | Jurisdiction | Investor Type | Min Investment | Source |
|-----------|-------------|---------------|---------------|--------|
| SIF | LU | semi_professional | €125,000 (12500000 cents) | SIF Law 13 Feb 2007, Art. 2 |
| SIF | LU | professional | €0 | SIF Law 13 Feb 2007 |
| SIF | LU | institutional | €0 | SIF Law 13 Feb 2007 |
| RAIF | LU | semi_professional | €100,000 (10000000 cents) | Law of 23 July 2016, Art. 2(1)(b)(i) |
| RAIF | LU | professional | €0 | Law of 23 July 2016 |
| ELTIF | * | retail | €0 | Reg 2023/606, Recital 47 + Art. 30 — minimum removed, suitability_required = true |
| ELTIF | * | professional | €0 | Reg 2023/606 |
| Spezial_AIF | DE | semi_professional | €200,000 (20000000 cents) | KAGB §1(19) Nr. 33 |
| Spezial_AIF | DE | professional | €0 | KAGB §1(6) |
| QIAIF | IE | professional | €100,000 (10000000 cents) | CBI AIF Rulebook, Chapter 2 |
| QIAIF | IE | institutional | €0 | CBI AIF Rulebook |
| RIAIF | IE | retail | €0 | CBI AIF Rulebook — suitability_required = true |

---

### decision_records
**Purpose:** Temporal decision archive. Every compliance decision (transfer validation, eligibility check, onboarding approval) is recorded with the exact rule version and input data that existed at decision time. This enables regulators to reconstruct any historical decision.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| decision_type | VARCHAR(50) | NOT NULL | Type of decision |
| asset_id | UUID | FK → assets.id, NULL | Asset involved (null for investor-only decisions) |
| subject_id | UUID | NOT NULL | Primary entity the decision is about (transfer ID, investor ID, etc.) |
| input_snapshot | JSONB | NOT NULL | Complete input data at decision time |
| rule_version_snapshot | JSONB | NOT NULL | Exact rules + eligibility criteria that applied |
| result | VARCHAR(20) | NOT NULL | Decision outcome |
| result_details | JSONB | NOT NULL | Per-rule check results with pass/fail and explanations |
| decided_by | UUID | NULL | User ID who made/triggered the decision (null for system) |
| decided_at | TIMESTAMP | NOT NULL | When the decision was made |
| created_at | TIMESTAMP | NOT NULL | Record creation |

**Enums:**

`decision_type`:
| Value | Description |
|-------|-------------|
| `transfer_validation` | Transfer simulate or execute — full rule check |
| `eligibility_check` | Investor eligibility for a specific fund |
| `onboarding_approval` | Investor onboarding approval/rejection |
| `scenario_analysis` | What-if scenario (read-only, informational) |

`result`:
| Value | Description |
|-------|-------------|
| `approved` | All checks passed |
| `rejected` | One or more checks failed |
| `simulated` | Validation only, no execution |

**Constraints:**
- CHECK (decision_type IN ('transfer_validation', 'eligibility_check', 'onboarding_approval', 'scenario_analysis'))
- CHECK (result IN ('approved', 'rejected', 'simulated'))

**Indexes:**
- PRIMARY KEY (id)
- INDEX (asset_id, decided_at DESC)
- INDEX (decision_type)
- INDEX (subject_id)
- INDEX (decided_at DESC)

**Example `input_snapshot` for transfer_validation:**
```json
{
  "from_investor_id": "uuid",
  "to_investor_id": "uuid",
  "asset_id": "uuid",
  "units": 50000,
  "timestamp": "2026-03-15T14:32:00Z",
  "from_investor": { "name": "...", "jurisdiction": "DE", "investor_type": "professional", "kyc_status": "verified" },
  "to_investor": { "name": "...", "jurisdiction": "LU", "investor_type": "semi_professional", "kyc_status": "verified" },
  "fund_structure": { "legal_form": "SIF", "domicile": "LU", "regulatory_framework": "AIFMD" }
}
```

**Example `rule_version_snapshot`:**
```json
{
  "rules_version": 3,
  "rules": {
    "lockup_days": 90,
    "jurisdiction_whitelist": ["DE", "LU", "AT", "CH", "NL", "BE"],
    "investor_type_whitelist": ["professional", "semi_professional", "institutional"],
    "minimum_investment": 12500000,
    "kyc_required": true
  },
  "eligibility_criteria": {
    "jurisdiction": "LU",
    "investor_type": "semi_professional",
    "minimum_investment": 12500000,
    "source_reference": "CSSF Circular 15/633, Section 4.2"
  },
  "composite_rules": [ ... ]
}
```

**Example `result_details`:**
```json
{
  "checks": [
    { "rule": "self_transfer", "passed": true, "message": "Sender and receiver are different" },
    { "rule": "positive_units", "passed": true, "message": "Transfer units (50000) > 0" },
    { "rule": "sufficient_units", "passed": true, "message": "Sender holds 200000 units, transferring 50000" },
    { "rule": "investor_type_eligible", "passed": true, "message": "semi_professional is in allowed types [professional, semi_professional, institutional]" },
    { "rule": "minimum_investment_met", "passed": false, "message": "Transfer value €100,000 is below minimum €125,000 for semi_professional investors in LU (CSSF Circular 15/633)" },
    { "rule": "kyc_valid", "passed": true, "message": "Receiver KYC verified, expires 2027-01-15" },
    { "rule": "lockup_period", "passed": true, "message": "Acquired 180 days ago, lockup is 90 days" },
    { "rule": "jurisdiction_whitelist", "passed": true, "message": "LU is in allowed jurisdictions" }
  ],
  "overall": "rejected",
  "violation_count": 1
}
```

---

### onboarding_records
**Purpose:** Investor onboarding workflow for fund subscription. Tracks the lifecycle from application through eligibility check to approval/rejection.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| investor_id | UUID | FK → investors.id | Applying investor |
| asset_id | UUID | FK → assets.id | Target fund/asset |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'applied' | Current workflow state |
| requested_units | BIGINT | NOT NULL, > 0 | Units the investor wants to subscribe for |
| eligibility_decision_id | UUID | FK → decision_records.id, NULL | Link to automated eligibility check result |
| approval_decision_id | UUID | FK → decision_records.id, NULL | Link to manual approval decision |
| reviewed_by | UUID | NULL | User who approved/rejected |
| rejection_reasons | JSONB | NULL | Array of reasons if rejected |
| applied_at | TIMESTAMP | NOT NULL | When application was submitted |
| reviewed_at | TIMESTAMP | NULL | When manual review occurred |
| created_at | TIMESTAMP | NOT NULL | Record creation |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Enum — `status`:**
| Value | Description |
|-------|-------------|
| `applied` | Application received, not yet checked |
| `eligible` | Automated eligibility check passed |
| `ineligible` | Automated eligibility check failed |
| `approved` | Manually approved by compliance officer |
| `rejected` | Manually rejected by compliance officer |
| `allocated` | Units allocated to investor (terminal state) |
| `withdrawn` | Investor withdrew application |

**Constraints:**
- CHECK (status IN ('applied', 'eligible', 'ineligible', 'approved', 'rejected', 'allocated', 'withdrawn'))
- CHECK (requested_units > 0)
- UNIQUE (investor_id, asset_id, applied_at) — prevent duplicate simultaneous applications

**Indexes:**
- PRIMARY KEY (id)
- INDEX (investor_id)
- INDEX (asset_id)
- INDEX (status)
- INDEX (applied_at DESC)

---

### regulatory_documents
**Purpose:** Ingested regulatory document corpus for RAG pipeline. Stores chunked, embedded regulatory text for AI-powered regulatory intelligence queries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| source_name | VARCHAR(255) | NOT NULL | Document name (e.g., "AIFMD 2.0 — Directive 2024/927") |
| jurisdiction | VARCHAR(10) | NOT NULL | Jurisdiction this document applies to (`EU` for pan-European) |
| framework | VARCHAR(50) | NOT NULL | Regulatory framework (AIFMD, UCITS, MiCA, DORA, national) |
| article_ref | VARCHAR(100) | NULL | Specific article/section reference (e.g., "Article 24(1)") |
| chunk_index | INTEGER | NOT NULL | Sequential chunk number within source document |
| content | TEXT | NOT NULL | Raw text content of this chunk |
| embedding | vector(1536) | NULL | Vector embedding for similarity search (pgvector) |
| metadata | JSONB | NOT NULL, DEFAULT '{}' | Additional metadata (effective_date, recitals, cross-references) |
| created_at | TIMESTAMP | NOT NULL | Record creation |

**Constraints:**
- UNIQUE (source_name, chunk_index)

**Indexes:**
- PRIMARY KEY (id)
- INDEX (jurisdiction)
- INDEX (framework)
- HNSW INDEX on embedding using vector_cosine_ops (pgvector)

**Note:** Requires `CREATE EXTENSION vector;` (pgvector) in PostgreSQL. If pgvector is not available, embedding column is omitted and RAG uses external vector store.

---

## Relationships

### Foreign Keys (Original)
- holdings.investor_id → investors.id (ON DELETE RESTRICT)
- holdings.asset_id → assets.id (ON DELETE RESTRICT)
- rules.asset_id → assets.id (ON DELETE RESTRICT)
- transfers.asset_id → assets.id (ON DELETE RESTRICT)
- transfers.from_investor_id → investors.id (ON DELETE RESTRICT)
- transfers.to_investor_id → investors.id (ON DELETE RESTRICT)

### Foreign Keys (New)
- assets.fund_structure_id → fund_structures.id (ON DELETE RESTRICT)
- eligibility_criteria.fund_structure_id → fund_structures.id (ON DELETE RESTRICT)
- decision_records.asset_id → assets.id (ON DELETE RESTRICT)
- transfers.decision_record_id → decision_records.id (ON DELETE SET NULL)
- onboarding_records.investor_id → investors.id (ON DELETE RESTRICT)
- onboarding_records.asset_id → assets.id (ON DELETE RESTRICT)
- onboarding_records.eligibility_decision_id → decision_records.id (ON DELETE SET NULL)
- onboarding_records.approval_decision_id → decision_records.id (ON DELETE SET NULL)

### Invariants (Original)
1. Sum of holdings.units for an asset <= assets.total_units
2. holdings.units cannot go negative
3. Transfer execution must update both sender and receiver holdings atomically
4. Every mutation logged in events table

### Invariants (New)
5. Every transfer execution creates exactly one decision_record with `decision_type = 'transfer_validation'`
6. Every transfer simulation creates exactly one decision_record with `result = 'simulated'`
7. decision_records are append-only — never updated or deleted
8. eligibility_criteria are versioned via `effective_date` / `superseded_at` — never deleted
9. If `fund_structure_id` is set on an asset, eligibility criteria for that fund structure are checked during validation
10. If `kyc_required = true` in rules, receiver must have `kyc_status = 'verified'` AND `kyc_expiry > NOW()`
11. Onboarding status transitions: applied → eligible/ineligible → approved/rejected → allocated (or withdrawn from any state)

---

## Query Patterns

### Cap Table with Investor Classification (Enhanced)
```sql
SELECT
  i.name,
  i.investor_type,
  i.jurisdiction,
  i.kyc_status,
  i.kyc_expiry,
  h.units,
  (h.units::float / a.total_units * 100) as percentage
FROM holdings h
JOIN investors i ON h.investor_id = i.id
JOIN assets a ON h.asset_id = a.id
WHERE h.asset_id = :asset_id
  AND h.units > 0
ORDER BY h.units DESC;
```

### Cap Table Classification Breakdown
```sql
SELECT
  i.investor_type,
  COUNT(DISTINCT i.id) as investor_count,
  SUM(h.units) as total_units,
  (SUM(h.units)::float / a.total_units * 100) as percentage
FROM holdings h
JOIN investors i ON h.investor_id = i.id
JOIN assets a ON h.asset_id = a.id
WHERE h.asset_id = :asset_id
  AND h.units > 0
GROUP BY i.investor_type, a.total_units
ORDER BY total_units DESC;
```

### Validation Context Fetch (Extended for AIFMD)
```sql
SELECT
  r.*,
  h.units as from_units,
  h.acquired_at,
  fi.investor_type as from_investor_type,
  fi.jurisdiction as from_jurisdiction,
  fi.kyc_status as from_kyc_status,
  fi.kyc_expiry as from_kyc_expiry,
  ti.investor_type as to_investor_type,
  ti.jurisdiction as to_jurisdiction,
  ti.kyc_status as to_kyc_status,
  ti.kyc_expiry as to_kyc_expiry,
  fs.legal_form as fund_legal_form,
  fs.domicile as fund_domicile,
  fs.regulatory_framework as fund_regulatory_framework,
  a.unit_price
FROM rules r
JOIN assets a ON a.id = r.asset_id
LEFT JOIN fund_structures fs ON fs.id = a.fund_structure_id
LEFT JOIN holdings h ON h.asset_id = r.asset_id
  AND h.investor_id = :from_investor_id
JOIN investors fi ON fi.id = :from_investor_id
JOIN investors ti ON ti.id = :to_investor_id
WHERE r.asset_id = :asset_id;
```

### Eligibility Criteria Lookup (for validation)
```sql
SELECT ec.*
FROM eligibility_criteria ec
WHERE ec.fund_structure_id = :fund_structure_id
  AND (ec.jurisdiction = :investor_jurisdiction OR ec.jurisdiction = '*')
  AND ec.investor_type = :investor_type
  AND ec.effective_date <= :validation_date
  AND (ec.superseded_at IS NULL OR ec.superseded_at > :validation_date)
ORDER BY
  CASE WHEN ec.jurisdiction = :investor_jurisdiction THEN 0 ELSE 1 END,
  ec.effective_date DESC
LIMIT 1;
```

### Decision Provenance for a Transfer
```sql
SELECT
  dr.id,
  dr.decision_type,
  dr.input_snapshot,
  dr.rule_version_snapshot,
  dr.result,
  dr.result_details,
  dr.decided_at,
  u.name as decided_by_name
FROM decision_records dr
LEFT JOIN users u ON u.id = dr.decided_by
WHERE dr.subject_id = :transfer_id
  AND dr.decision_type = 'transfer_validation'
ORDER BY dr.decided_at DESC;
```

### Decision History for an Asset (Regulatory Export)
```sql
SELECT
  dr.decided_at,
  dr.decision_type,
  dr.result,
  dr.result_details,
  dr.rule_version_snapshot
FROM decision_records dr
WHERE dr.asset_id = :asset_id
  AND dr.decided_at BETWEEN :start_date AND :end_date
ORDER BY dr.decided_at DESC;
```

### Investor Onboarding Pipeline
```sql
SELECT
  o.id,
  o.status,
  i.name as investor_name,
  i.investor_type,
  i.jurisdiction,
  o.requested_units,
  o.applied_at,
  o.reviewed_at,
  o.rejection_reasons
FROM onboarding_records o
JOIN investors i ON o.investor_id = i.id
WHERE o.asset_id = :asset_id
ORDER BY o.applied_at DESC;
```

### KYC Expiration Alert
```sql
SELECT
  i.id,
  i.name,
  i.jurisdiction,
  i.investor_type,
  i.kyc_expiry,
  array_agg(DISTINCT a.name) as funds_invested
FROM investors i
JOIN holdings h ON h.investor_id = i.id AND h.units > 0
JOIN assets a ON a.id = h.asset_id
WHERE i.kyc_status = 'verified'
  AND i.kyc_expiry <= (CURRENT_DATE + INTERVAL '30 days')
GROUP BY i.id, i.name, i.jurisdiction, i.investor_type, i.kyc_expiry
ORDER BY i.kyc_expiry ASC;
```

### Scenario Modeling — Impact of Rule Change
```sql
-- "What if we changed minimum_investment to €150K for this fund?"
SELECT
  i.id,
  i.name,
  i.investor_type,
  i.jurisdiction,
  h.units,
  (h.units * a.unit_price) as current_value,
  ec.minimum_investment as current_threshold,
  :proposed_minimum as proposed_threshold
FROM holdings h
JOIN investors i ON h.investor_id = i.id
JOIN assets a ON h.asset_id = a.id
LEFT JOIN fund_structures fs ON fs.id = a.fund_structure_id
LEFT JOIN eligibility_criteria ec ON ec.fund_structure_id = fs.id
  AND (ec.jurisdiction = i.jurisdiction OR ec.jurisdiction = '*')
  AND ec.investor_type = i.investor_type
  AND ec.superseded_at IS NULL
WHERE h.asset_id = :asset_id
  AND h.units > 0
  AND (h.units * a.unit_price) < :proposed_minimum
ORDER BY (h.units * a.unit_price) ASC;
```

### Regulatory Document Search (RAG)
```sql
SELECT
  id,
  source_name,
  jurisdiction,
  framework,
  article_ref,
  content,
  1 - (embedding <=> :query_embedding) as similarity
FROM regulatory_documents
WHERE jurisdiction IN (:target_jurisdictions)
  AND framework = :target_framework
ORDER BY embedding <=> :query_embedding
LIMIT 10;
```

### Transfer History (Original — Unchanged)
```sql
SELECT
  t.executed_at,
  fi.name as from_name,
  ti.name as to_name,
  t.units
FROM transfers t
JOIN investors fi ON t.from_investor_id = fi.id
JOIN investors ti ON t.to_investor_id = ti.id
WHERE t.asset_id = :asset_id
ORDER BY t.executed_at DESC;
```

### Audit Trail (Original — Unchanged)
```sql
SELECT
  timestamp,
  event_type,
  entity_type,
  payload
FROM events
WHERE entity_id = :entity_id
  OR (payload->>'asset_id' = :entity_id)
ORDER BY timestamp DESC;
```

---

## Migration Strategy

1. **Migration 001:** Initial schema (SQLite — skipped by PostgreSQL runner)
2. **Migration 002:** PostgreSQL schema conversion
3. **Migration 003:** Users + auth + RBAC
4. **Migration 004:** Rule version history
5. **Migration 005:** Webhooks
6. **Migration 006:** Composite rules
7. **Migration 007:** Add `fund_structures` table + extend `assets` with `fund_structure_id`, `unit_price`
8. **Migration 008:** Extend `investors` — add `investor_type`, `kyc_status`, `kyc_expiry`, `tax_id`, `lei`, `email`. Migrate existing data (`accredited = true` → `professional`, `false` → `retail`; all → `kyc_status = 'verified'`).
9. **Migration 009:** Extend `rules` — add `investor_type_whitelist`, `minimum_investment`, `maximum_investors`, `concentration_limit_pct`, `kyc_required`
10. **Migration 010:** Add `eligibility_criteria` table + pre-populate with 3-jurisdiction data (6 template fund structures, 22 criteria rows)
11. **Migration 011:** Add `decision_records` table + extend `transfers` with `decision_record_id`
12. **Migration 012:** Add `onboarding_records` table
13. **Migration 013:** Add `regulatory_documents` table (with pgvector graceful fallback)
14. **Migration 014:** Fix eligibility data — RAIF minimum €125K→€100K, ELTIF retail minimum €10K→€0
15. **Migration 015:** Fix SIF source citations — CSSF Circular 15/633 → SIF Law 13 Feb 2007

**Rules:**
- Never alter existing migrations
- Always include rollback SQL
- Each migration is independently deployable
- Data migrations (008) include backward-compatible defaults
- Data corrections (014, 015) fix regulatory source accuracy

---

## Data Integrity Checks

### Original
- [ ] No orphaned holdings
- [ ] Holdings sum <= total_units per asset
- [ ] No negative balances
- [ ] All transfers have corresponding events
- [ ] All foreign keys valid

### New (Vertical B)
- [ ] Every executed transfer has a decision_record
- [ ] No decision_records have been modified after creation (append-only)
- [ ] All investors have a valid investor_type
- [ ] All investors with kyc_status = 'verified' have a kyc_expiry date
- [ ] All eligibility_criteria reference a valid fund_structure
- [ ] Active eligibility_criteria have superseded_at = NULL
- [ ] No overlapping eligibility_criteria for same (fund_structure, jurisdiction, investor_type, effective_date)
- [ ] Onboarding status transitions follow allowed paths
- [ ] All AI-generated events (copilot.*) have non-empty payload
- [ ] fund_structures referenced by assets are not orphaned
