-- Auto-generated from migrations/ on 2026-02-10T19:16:25Z
-- Skips 001_initial_schema.sql (SQLite only)

-- ============================================
-- 002_postgresql_schema.sql
-- ============================================

-- Migration 002: PostgreSQL Schema
-- Date: 2026-02-09
-- Description: PostgreSQL version of the core schema (replaces SQLite 001)

-- ============================================================================
-- ASSETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    total_units BIGINT NOT NULL CHECK (total_units > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);

-- ============================================================================
-- INVESTORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(100) NOT NULL,
    accredited BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investors_jurisdiction ON investors(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_investors_created_at ON investors(created_at);

-- ============================================================================
-- HOLDINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    units BIGINT NOT NULL CHECK (units >= 0),
    acquired_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(investor_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_holdings_asset_id ON holdings(asset_id);
CREATE INDEX IF NOT EXISTS idx_holdings_investor_id ON holdings(investor_id);

-- ============================================================================
-- RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL UNIQUE REFERENCES assets(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL,
    qualification_required BOOLEAN NOT NULL DEFAULT false,
    lockup_days INTEGER NOT NULL CHECK (lockup_days >= 0),
    jurisdiction_whitelist JSONB NOT NULL DEFAULT '[]',
    transfer_whitelist JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TRANSFERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    from_investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    to_investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    units BIGINT NOT NULL CHECK (units > 0),
    executed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (from_investor_id != to_investor_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_asset_executed ON transfers(asset_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_investor_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_investor_id);

-- ============================================================================
-- EVENTS TABLE (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- ============================================
-- 003_users_auth.sql
-- ============================================

-- Migration 003: Users & Authentication
-- Date: 2026-02-09

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'compliance_officer', 'viewer')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- 004_rule_versions.sql
-- ============================================

-- Migration 004: Rule Versioning
-- Date: 2026-02-09
-- Keeps full history of all rule changes per asset

CREATE TABLE IF NOT EXISTS rule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL,
    config JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(asset_id, version)
);

CREATE INDEX IF NOT EXISTS idx_rule_versions_asset ON rule_versions(asset_id, version DESC);

-- ============================================
-- 005_webhooks.sql
-- ============================================

-- Migration 005: Webhook System
-- Date: 2026-02-09

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(2048) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    event_types JSONB NOT NULL DEFAULT '["*"]',
    active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    response_code INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries(status);

-- ============================================
-- 006_composite_rules.sql
-- ============================================

-- Migration 006: Composite Rules Storage
-- Date: 2026-02-09

CREATE TABLE IF NOT EXISTS composite_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    operator VARCHAR(10) NOT NULL CHECK (operator IN ('AND', 'OR', 'NOT')),
    conditions JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_composite_rules_asset ON composite_rules(asset_id);
CREATE INDEX IF NOT EXISTS idx_composite_rules_active ON composite_rules(asset_id, enabled);

-- ============================================
-- 007_fund_structures.sql
-- ============================================

-- Migration 007: Fund Structures + Extend Assets
-- Date: 2026-02-10
-- Description: Add fund_structures table for AIFMD fund modeling.
--              Extend assets table with fund_structure_id and unit_price.
--              One fund_structure can have multiple assets (share classes).

-- ============================================================================
-- FUND STRUCTURES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS fund_structures (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(255) NOT NULL,
    legal_form           VARCHAR(50)  NOT NULL,
    domicile             VARCHAR(10)  NOT NULL,
    regulatory_framework VARCHAR(50)  NOT NULL,
    aifm_name            VARCHAR(255),
    aifm_lei             VARCHAR(20),
    inception_date       DATE,
    target_size          BIGINT,
    currency             VARCHAR(3)   NOT NULL DEFAULT 'EUR',
    status               VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_fs_legal_form CHECK (
        legal_form IN (
            'SICAV', 'SIF', 'RAIF', 'SCSp', 'SCA',
            'ELTIF', 'Spezial_AIF', 'Publikums_AIF',
            'QIAIF', 'RIAIF', 'LP', 'other'
        )
    ),
    CONSTRAINT chk_fs_regulatory_framework CHECK (
        regulatory_framework IN ('AIFMD', 'UCITS', 'ELTIF', 'national')
    ),
    CONSTRAINT chk_fs_status CHECK (
        status IN ('active', 'closing', 'closed', 'liquidating')
    ),
    CONSTRAINT chk_fs_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_fs_aifm_lei_length CHECK (aifm_lei IS NULL OR length(aifm_lei) = 20)
);

CREATE INDEX IF NOT EXISTS idx_fund_structures_domicile ON fund_structures(domicile);
CREATE INDEX IF NOT EXISTS idx_fund_structures_legal_form ON fund_structures(legal_form);
CREATE INDEX IF NOT EXISTS idx_fund_structures_framework ON fund_structures(regulatory_framework);

-- ============================================================================
-- EXTEND ASSETS TABLE
-- ============================================================================
ALTER TABLE assets ADD COLUMN IF NOT EXISTS fund_structure_id UUID REFERENCES fund_structures(id) ON DELETE RESTRICT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS unit_price DECIMAL(18,4);

CREATE INDEX IF NOT EXISTS idx_assets_fund_structure_id ON assets(fund_structure_id);

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_assets_fund_structure_id;
-- ALTER TABLE assets DROP COLUMN IF EXISTS unit_price;
-- ALTER TABLE assets DROP COLUMN IF EXISTS fund_structure_id;
-- DROP INDEX IF EXISTS idx_fund_structures_framework;
-- DROP INDEX IF EXISTS idx_fund_structures_legal_form;
-- DROP INDEX IF EXISTS idx_fund_structures_domicile;
-- DROP TABLE IF EXISTS fund_structures;

-- ============================================
-- 008_extend_investors.sql
-- ============================================

-- Migration 008: Extend Investors for AIFMD Classification
-- Date: 2026-02-10
-- Description: Add investor_type (5-tier AIFMD classification), KYC lifecycle
--              fields, tax_id, LEI, and email. Migrate existing investor data
--              from binary accredited to investor_type.

-- ============================================================================
-- ADD NEW COLUMNS
-- ============================================================================
ALTER TABLE investors ADD COLUMN IF NOT EXISTS investor_type VARCHAR(50) NOT NULL DEFAULT 'retail';
ALTER TABLE investors ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE investors ADD COLUMN IF NOT EXISTS kyc_expiry DATE;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100);
ALTER TABLE investors ADD COLUMN IF NOT EXISTS lei VARCHAR(20);
ALTER TABLE investors ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================
ALTER TABLE investors ADD CONSTRAINT chk_inv_investor_type CHECK (
    investor_type IN ('institutional', 'professional', 'semi_professional', 'well_informed', 'retail')
);

ALTER TABLE investors ADD CONSTRAINT chk_inv_kyc_status CHECK (
    kyc_status IN ('pending', 'verified', 'expired', 'rejected')
);

ALTER TABLE investors ADD CONSTRAINT chk_inv_lei_length CHECK (
    lei IS NULL OR length(lei) = 20
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_investors_investor_type ON investors(investor_type);
CREATE INDEX IF NOT EXISTS idx_investors_kyc_status ON investors(kyc_status);

-- ============================================================================
-- DATA MIGRATION
-- Existing investors: accredited=true â†’ professional, accredited=false â†’ retail
-- All existing investors get kyc_status='verified' to avoid breaking validation
-- ============================================================================
UPDATE investors SET investor_type = 'professional' WHERE accredited = true;
UPDATE investors SET investor_type = 'retail' WHERE accredited = false;
UPDATE investors SET kyc_status = 'verified';
UPDATE investors SET kyc_expiry = (now() + INTERVAL '1 year')::date WHERE kyc_status = 'verified';

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_investors_kyc_status;
-- DROP INDEX IF EXISTS idx_investors_investor_type;
-- ALTER TABLE investors DROP CONSTRAINT IF EXISTS chk_inv_lei_length;
-- ALTER TABLE investors DROP CONSTRAINT IF EXISTS chk_inv_kyc_status;
-- ALTER TABLE investors DROP CONSTRAINT IF EXISTS chk_inv_investor_type;
-- ALTER TABLE investors DROP COLUMN IF EXISTS email;
-- ALTER TABLE investors DROP COLUMN IF EXISTS lei;
-- ALTER TABLE investors DROP COLUMN IF EXISTS tax_id;
-- ALTER TABLE investors DROP COLUMN IF EXISTS kyc_expiry;
-- ALTER TABLE investors DROP COLUMN IF EXISTS kyc_status;
-- ALTER TABLE investors DROP COLUMN IF EXISTS investor_type;

-- ============================================
-- 009_extend_rules.sql
-- ============================================

-- Migration 009: Extend Rules for AIFMD Compliance
-- Date: 2026-02-10
-- Description: Add AIFMD-specific rule parameters to the rules table.
--              All new columns are nullable or have defaults for backward compatibility.

-- ============================================================================
-- ADD NEW COLUMNS
-- ============================================================================
ALTER TABLE rules ADD COLUMN IF NOT EXISTS investor_type_whitelist JSONB;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS minimum_investment BIGINT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS maximum_investors INTEGER;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS concentration_limit_pct DECIMAL(5,2);
ALTER TABLE rules ADD COLUMN IF NOT EXISTS kyc_required BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================
ALTER TABLE rules ADD CONSTRAINT chk_rules_min_investment CHECK (
    minimum_investment IS NULL OR minimum_investment >= 0
);

ALTER TABLE rules ADD CONSTRAINT chk_rules_max_investors CHECK (
    maximum_investors IS NULL OR maximum_investors > 0
);

ALTER TABLE rules ADD CONSTRAINT chk_rules_concentration CHECK (
    concentration_limit_pct IS NULL OR (concentration_limit_pct > 0 AND concentration_limit_pct <= 100)
);

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- ALTER TABLE rules DROP CONSTRAINT IF EXISTS chk_rules_concentration;
-- ALTER TABLE rules DROP CONSTRAINT IF EXISTS chk_rules_max_investors;
-- ALTER TABLE rules DROP CONSTRAINT IF EXISTS chk_rules_min_investment;
-- ALTER TABLE rules DROP COLUMN IF EXISTS kyc_required;
-- ALTER TABLE rules DROP COLUMN IF EXISTS concentration_limit_pct;
-- ALTER TABLE rules DROP COLUMN IF EXISTS maximum_investors;
-- ALTER TABLE rules DROP COLUMN IF EXISTS minimum_investment;
-- ALTER TABLE rules DROP COLUMN IF EXISTS investor_type_whitelist;

-- ============================================
-- 010_eligibility_criteria.sql
-- ============================================

-- Migration 010: Eligibility Criteria Table
-- Date: 2026-02-10
-- Description: Jurisdiction-specific investor eligibility rules per fund structure.
--              Defines who can invest under what conditions, scoped by jurisdiction
--              and investor type. Pre-populated with verified data for 3 launch
--              jurisdictions (Luxembourg, Germany, Ireland).

-- ============================================================================
-- ELIGIBILITY CRITERIA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS eligibility_criteria (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_structure_id     UUID NOT NULL REFERENCES fund_structures(id) ON DELETE RESTRICT,
    jurisdiction          VARCHAR(10)  NOT NULL,
    investor_type         VARCHAR(50)  NOT NULL,
    minimum_investment    BIGINT       NOT NULL DEFAULT 0,
    maximum_allocation_pct DECIMAL(5,2),
    documentation_required JSONB       NOT NULL DEFAULT '[]',
    suitability_required  BOOLEAN      NOT NULL DEFAULT false,
    source_reference      VARCHAR(500),
    effective_date        DATE         NOT NULL,
    superseded_at         DATE,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_ec_investor_type CHECK (
        investor_type IN ('institutional', 'professional', 'semi_professional', 'well_informed', 'retail')
    ),
    CONSTRAINT chk_ec_min_investment CHECK (minimum_investment >= 0),
    CONSTRAINT chk_ec_max_alloc CHECK (
        maximum_allocation_pct IS NULL OR (maximum_allocation_pct > 0 AND maximum_allocation_pct <= 100)
    ),
    CONSTRAINT uq_ec_fund_jurisdiction_type_date UNIQUE (
        fund_structure_id, jurisdiction, investor_type, effective_date
    )
);

CREATE INDEX IF NOT EXISTS idx_ec_fund_structure ON eligibility_criteria(fund_structure_id);
CREATE INDEX IF NOT EXISTS idx_ec_jurisdiction_type ON eligibility_criteria(jurisdiction, investor_type);
CREATE INDEX IF NOT EXISTS idx_ec_effective_date ON eligibility_criteria(effective_date);

-- ============================================================================
-- PRE-POPULATE: Template fund structures for 3 launch jurisdictions
-- These are reference structures used by eligibility criteria seed data.
-- Real user funds will be created via the API.
-- ============================================================================

-- Luxembourg SIF
INSERT INTO fund_structures (id, name, legal_form, domicile, regulatory_framework, currency, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Template: Luxembourg SIF',
    'SIF', 'LU', 'AIFMD', 'EUR', 'active'
);

-- Luxembourg RAIF
INSERT INTO fund_structures (id, name, legal_form, domicile, regulatory_framework, currency, status)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Template: Luxembourg RAIF',
    'RAIF', 'LU', 'AIFMD', 'EUR', 'active'
);

-- ELTIF 2.0 (EU-wide)
INSERT INTO fund_structures (id, name, legal_form, domicile, regulatory_framework, currency, status)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Template: ELTIF 2.0',
    'ELTIF', 'LU', 'ELTIF', 'EUR', 'active'
);

-- German Spezial-AIF
INSERT INTO fund_structures (id, name, legal_form, domicile, regulatory_framework, currency, status)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    'Template: German Spezial-AIF',
    'Spezial_AIF', 'DE', 'AIFMD', 'EUR', 'active'
);

-- Irish QIAIF
INSERT INTO fund_structures (id, name, legal_form, domicile, regulatory_framework, currency, status)
VALUES (
    '00000000-0000-0000-0000-000000000005',
    'Template: Irish QIAIF',
    'QIAIF', 'IE', 'AIFMD', 'EUR', 'active'
);

-- Irish RIAIF
INSERT INTO fund_structures (id, name, legal_form, domicile, regulatory_framework, currency, status)
VALUES (
    '00000000-0000-0000-0000-000000000006',
    'Template: Irish RIAIF',
    'RIAIF', 'IE', 'AIFMD', 'EUR', 'active'
);

-- ============================================================================
-- PRE-POPULATE: Eligibility criteria for 3 jurisdictions
-- Amounts in cents (smallest currency unit). â‚¬125,000 = 12500000.
-- ============================================================================

-- â”€â”€ Luxembourg SIF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000001', '*', 'institutional', 0, '[]',
     'CSSF Circular 15/633', '2015-08-17'),
    ('00000000-0000-0000-0000-000000000001', '*', 'professional', 0, '[]',
     'CSSF Circular 15/633', '2015-08-17'),
    ('00000000-0000-0000-0000-000000000001', '*', 'semi_professional', 12500000,
     '["risk_declaration"]',
     'CSSF Circular 15/633, Section 4.2 â€” â‚¬125,000 minimum', '2015-08-17'),
    ('00000000-0000-0000-0000-000000000001', '*', 'well_informed', 12500000,
     '["risk_declaration", "professional_certification"]',
     'CSSF Circular 15/633, Section 4.2', '2015-08-17');

-- â”€â”€ Luxembourg RAIF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000002', '*', 'institutional', 0, '[]',
     'Law of 23 July 2016, Art. 2', '2016-07-23'),
    ('00000000-0000-0000-0000-000000000002', '*', 'professional', 0, '[]',
     'Law of 23 July 2016, Art. 2', '2016-07-23'),
    ('00000000-0000-0000-0000-000000000002', '*', 'semi_professional', 12500000,
     '["risk_declaration"]',
     'Law of 23 July 2016, Art. 2 â€” â‚¬125,000 minimum', '2016-07-23');

-- â”€â”€ ELTIF 2.0 (EU-wide) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, suitability_required, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000003', '*', 'institutional', 0, false, '[]',
     'Reg 2023/606', '2024-01-10'),
    ('00000000-0000-0000-0000-000000000003', '*', 'professional', 0, false, '[]',
     'Reg 2023/606', '2024-01-10'),
    ('00000000-0000-0000-0000-000000000003', '*', 'retail', 1000000, true,
     '["suitability_assessment"]',
     'Reg 2023/606, Art. 30(1) â€” â‚¬10,000 minimum, suitability required', '2024-01-10');

-- â”€â”€ German Spezial-AIF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000004', 'DE', 'institutional', 0, '[]',
     'KAGB Â§1(6)', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'DE', 'professional', 0, '[]',
     'KAGB Â§1(6)', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'DE', 'semi_professional', 20000000,
     '["risk_declaration", "investment_advisory_confirmation"]',
     'KAGB Â§1(19) Nr. 33 â€” â‚¬200,000 minimum', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'AT', 'institutional', 0, '[]',
     'KAGB Â§1(6) â€” Austrian institutional via AIFMD passport', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'AT', 'professional', 0, '[]',
     'KAGB Â§1(6) â€” Austrian professional via AIFMD passport', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'CH', 'institutional', 0, '[]',
     'KAGB Â§1(6) â€” Swiss institutional via bilateral agreement', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'CH', 'professional', 0, '[]',
     'KAGB Â§1(6) â€” Swiss professional via bilateral agreement', '2013-07-22');

-- â”€â”€ Irish QIAIF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000005', '*', 'institutional', 0, '[]',
     'CBI AIF Rulebook, Chapter 2', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000005', '*', 'professional', 10000000,
     '["qualifying_investor_declaration"]',
     'CBI AIF Rulebook, Chapter 2 â€” â‚¬100,000 minimum qualifying investor', '2013-07-22');

-- â”€â”€ Irish RIAIF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, suitability_required, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000006', '*', 'institutional', 0, false, '[]',
     'CBI AIF Rulebook, Chapter 3', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000006', '*', 'professional', 0, false, '[]',
     'CBI AIF Rulebook, Chapter 3', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000006', '*', 'retail', 0, true,
     '["suitability_assessment", "risk_warning_acknowledgment"]',
     'CBI AIF Rulebook, Chapter 3 â€” No minimum, suitability required', '2013-07-22');

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- DELETE FROM eligibility_criteria WHERE fund_structure_id IN (
--     '00000000-0000-0000-0000-000000000001',
--     '00000000-0000-0000-0000-000000000002',
--     '00000000-0000-0000-0000-000000000003',
--     '00000000-0000-0000-0000-000000000004',
--     '00000000-0000-0000-0000-000000000005',
--     '00000000-0000-0000-0000-000000000006'
-- );
-- DELETE FROM fund_structures WHERE id IN (
--     '00000000-0000-0000-0000-000000000001',
--     '00000000-0000-0000-0000-000000000002',
--     '00000000-0000-0000-0000-000000000003',
--     '00000000-0000-0000-0000-000000000004',
--     '00000000-0000-0000-0000-000000000005',
--     '00000000-0000-0000-0000-000000000006'
-- );
-- DROP INDEX IF EXISTS idx_ec_effective_date;
-- DROP INDEX IF EXISTS idx_ec_jurisdiction_type;
-- DROP INDEX IF EXISTS idx_ec_fund_structure;
-- DROP TABLE IF EXISTS eligibility_criteria;

-- ============================================
-- 011_decision_records.sql
-- ============================================

-- Migration 011: Decision Records (Temporal Provenance Archive)
-- Date: 2026-02-10
-- Description: Every compliance decision (transfer validation, eligibility check,
--              onboarding approval) is recorded with the exact rule version and
--              input data that existed at decision time. Enables regulators to
--              reconstruct any historical decision.

-- ============================================================================
-- DECISION RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS decision_records (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_type         VARCHAR(50)  NOT NULL,
    asset_id              UUID REFERENCES assets(id) ON DELETE RESTRICT,
    subject_id            UUID         NOT NULL,
    input_snapshot        JSONB        NOT NULL,
    rule_version_snapshot JSONB        NOT NULL,
    result                VARCHAR(20)  NOT NULL,
    result_details        JSONB        NOT NULL,
    decided_by            UUID REFERENCES users(id),
    decided_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_dr_decision_type CHECK (
        decision_type IN ('transfer_validation', 'eligibility_check', 'onboarding_approval', 'scenario_analysis')
    ),
    CONSTRAINT chk_dr_result CHECK (
        result IN ('approved', 'rejected', 'simulated')
    )
);

CREATE INDEX IF NOT EXISTS idx_dr_asset_decided ON decision_records(asset_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_dr_decision_type ON decision_records(decision_type);
CREATE INDEX IF NOT EXISTS idx_dr_subject ON decision_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_dr_decided_at ON decision_records(decided_at DESC);

-- ============================================================================
-- EXTEND TRANSFERS TABLE â€” link to decision record
-- ============================================================================
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS decision_record_id UUID REFERENCES decision_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transfers_decision_record ON transfers(decision_record_id);

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_transfers_decision_record;
-- ALTER TABLE transfers DROP COLUMN IF EXISTS decision_record_id;
-- DROP INDEX IF EXISTS idx_dr_decided_at;
-- DROP INDEX IF EXISTS idx_dr_subject;
-- DROP INDEX IF EXISTS idx_dr_decision_type;
-- DROP INDEX IF EXISTS idx_dr_asset_decided;
-- DROP TABLE IF EXISTS decision_records;

-- ============================================
-- 012_onboarding_records.sql
-- ============================================

-- Migration 012: Onboarding Records
-- Date: 2026-02-10
-- Description: Investor onboarding workflow tracking. Lifecycle:
--              applied â†’ eligible/ineligible â†’ approved/rejected â†’ allocated
--              Links to decision_records for automated eligibility checks
--              and manual approval decisions.

-- ============================================================================
-- ONBOARDING RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS onboarding_records (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id              UUID         NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    asset_id                 UUID         NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    status                   VARCHAR(20)  NOT NULL DEFAULT 'applied',
    requested_units          BIGINT       NOT NULL CHECK (requested_units > 0),
    eligibility_decision_id  UUID REFERENCES decision_records(id) ON DELETE SET NULL,
    approval_decision_id     UUID REFERENCES decision_records(id) ON DELETE SET NULL,
    reviewed_by              UUID REFERENCES users(id),
    rejection_reasons        JSONB,
    applied_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    reviewed_at              TIMESTAMPTZ,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT chk_ob_status CHECK (
        status IN ('applied', 'eligible', 'ineligible', 'approved', 'rejected', 'allocated', 'withdrawn')
    ),
    CONSTRAINT uq_ob_investor_asset_applied UNIQUE (investor_id, asset_id, applied_at)
);

CREATE INDEX IF NOT EXISTS idx_ob_investor ON onboarding_records(investor_id);
CREATE INDEX IF NOT EXISTS idx_ob_asset ON onboarding_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_ob_status ON onboarding_records(status);
CREATE INDEX IF NOT EXISTS idx_ob_applied_at ON onboarding_records(applied_at DESC);

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_ob_applied_at;
-- DROP INDEX IF EXISTS idx_ob_status;
-- DROP INDEX IF EXISTS idx_ob_asset;
-- DROP INDEX IF EXISTS idx_ob_investor;
-- DROP TABLE IF EXISTS onboarding_records;

-- ============================================
-- 013_regulatory_documents.sql
-- ============================================

-- Migration 013: Regulatory Documents (RAG Pipeline)
-- Date: 2026-02-10
-- Description: Stores chunked, embedded regulatory text for AI-powered
--              regulatory intelligence queries. The embedding column requires
--              pgvector extension. If pgvector is not available, the table
--              is created without the embedding column and vector index.

-- ============================================================================
-- ENABLE PGVECTOR (optional â€” fails gracefully if not installed)
-- ============================================================================
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
    RAISE NOTICE 'pgvector extension enabled';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not available â€” embedding column will be skipped';
END
$$;

-- ============================================================================
-- REGULATORY DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS regulatory_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name     VARCHAR(255) NOT NULL,
    jurisdiction    VARCHAR(10)  NOT NULL,
    framework       VARCHAR(50)  NOT NULL,
    article_ref     VARCHAR(100),
    chunk_index     INTEGER      NOT NULL,
    content         TEXT         NOT NULL,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_rd_source_chunk UNIQUE (source_name, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_rd_jurisdiction ON regulatory_documents(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_rd_framework ON regulatory_documents(framework);

-- ============================================================================
-- ADD VECTOR COLUMN (only if pgvector is available)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        ALTER TABLE regulatory_documents ADD COLUMN IF NOT EXISTS embedding vector(1536);
        CREATE INDEX IF NOT EXISTS idx_rd_embedding ON regulatory_documents
            USING hnsw (embedding vector_cosine_ops);
        RAISE NOTICE 'embedding column and HNSW index created';
    ELSE
        RAISE NOTICE 'Skipping embedding column â€” install pgvector to enable semantic search';
    END IF;
END
$$;

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_rd_embedding;
-- DROP INDEX IF EXISTS idx_rd_framework;
-- DROP INDEX IF EXISTS idx_rd_jurisdiction;
-- DROP TABLE IF EXISTS regulatory_documents;
-- DROP EXTENSION IF EXISTS vector;

-- ============================================
-- 014_fix_eligibility_data.sql
-- ============================================

-- Migration 014: Fix Eligibility Criteria Data Errors
-- Date: 2026-02-10
-- Description: Corrections found by cross-referencing seed data against
--              uploaded regulatory documents.
--
-- ERROR 1: RAIF semi_professional minimum was â‚¬125,000 (12500000 cents).
--          Law of 23 July 2016, Art. 2(1)(b)(i) states â‚¬100,000.
--
-- ERROR 2: ELTIF retail minimum was â‚¬10,000 (1000000 cents).
--          Reg 2023/606 (ELTIF 2.0), Recital 47 removed the â‚¬10,000 minimum.
--          Retail investors can invest any amount, subject to suitability.

-- Fix 1: RAIF semi_professional â€” â‚¬125,000 â†’ â‚¬100,000
UPDATE eligibility_criteria
SET minimum_investment = 10000000,
    source_reference = 'Law of 23 July 2016, Art. 2(1)(b)(i) â€” â‚¬100,000 minimum'
WHERE fund_structure_id = '00000000-0000-0000-0000-000000000002'
  AND investor_type = 'semi_professional';

-- Fix 2: ELTIF retail â€” â‚¬10,000 â†’ â‚¬0 (removed by ELTIF 2.0 reform)
UPDATE eligibility_criteria
SET minimum_investment = 0,
    source_reference = 'Reg 2023/606, Recital 47 + Art. 30 â€” minimum removed, suitability required'
WHERE fund_structure_id = '00000000-0000-0000-0000-000000000003'
  AND investor_type = 'retail';

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- UPDATE eligibility_criteria
-- SET minimum_investment = 12500000,
--     source_reference = 'Law of 23 July 2016, Art. 2 â€” â‚¬125,000 minimum'
-- WHERE fund_structure_id = '00000000-0000-0000-0000-000000000002'
--   AND investor_type = 'semi_professional';
--
-- UPDATE eligibility_criteria
-- SET minimum_investment = 1000000,
--     source_reference = 'Reg 2023/606, Art. 30(1) â€” â‚¬10,000 minimum, suitability required'
-- WHERE fund_structure_id = '00000000-0000-0000-0000-000000000003'
--   AND investor_type = 'retail';

-- ============================================
-- 015_fix_sif_source_citations.sql
-- ============================================

-- Migration 015: Fix SIF source citations
-- CSSF Circular 15/633 is about quarterly financial reporting by IFMs.
-- The SIF investor eligibility thresholds come from the Law of 13 February 2007
-- on Specialised Investment Funds (SIF Law), Article 2.
-- This migration corrects the source_reference for all SIF eligibility criteria rows.

BEGIN;

-- Fix SIF semi_professional source
UPDATE eligibility_criteria
SET source_reference = 'SIF Law 13 Feb 2007, Art. 2'
WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001'
  AND investor_type = 'semi_professional'
  AND source_reference LIKE '%CSSF Circular 15/633%';

-- Fix SIF professional source
UPDATE eligibility_criteria
SET source_reference = 'SIF Law 13 Feb 2007'
WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001'
  AND investor_type = 'professional'
  AND source_reference LIKE '%CSSF Circular 15/633%';

-- Fix SIF institutional source
UPDATE eligibility_criteria
SET source_reference = 'SIF Law 13 Feb 2007'
WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001'
  AND investor_type = 'institutional'
  AND source_reference LIKE '%CSSF Circular 15/633%';

COMMIT;

-- Rollback:
-- UPDATE eligibility_criteria SET source_reference = 'CSSF Circular 15/633, Section 4.2' WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001' AND investor_type = 'semi_professional';
-- UPDATE eligibility_criteria SET source_reference = 'CSSF Circular 15/633' WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001' AND investor_type = 'professional';
-- UPDATE eligibility_criteria SET source_reference = 'CSSF Circular 15/633' WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001' AND investor_type = 'institutional';
