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
-- Amounts in cents (smallest currency unit). €125,000 = 12500000.
-- ============================================================================

-- ── Luxembourg SIF ──────────────────────────────────────────────────────────
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000001', '*', 'institutional', 0, '[]',
     'CSSF Circular 15/633', '2015-08-17'),
    ('00000000-0000-0000-0000-000000000001', '*', 'professional', 0, '[]',
     'CSSF Circular 15/633', '2015-08-17'),
    ('00000000-0000-0000-0000-000000000001', '*', 'semi_professional', 12500000,
     '["risk_declaration"]',
     'CSSF Circular 15/633, Section 4.2 — €125,000 minimum', '2015-08-17'),
    ('00000000-0000-0000-0000-000000000001', '*', 'well_informed', 12500000,
     '["risk_declaration", "professional_certification"]',
     'CSSF Circular 15/633, Section 4.2', '2015-08-17');

-- ── Luxembourg RAIF ─────────────────────────────────────────────────────────
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000002', '*', 'institutional', 0, '[]',
     'Law of 23 July 2016, Art. 2', '2016-07-23'),
    ('00000000-0000-0000-0000-000000000002', '*', 'professional', 0, '[]',
     'Law of 23 July 2016, Art. 2', '2016-07-23'),
    ('00000000-0000-0000-0000-000000000002', '*', 'semi_professional', 12500000,
     '["risk_declaration"]',
     'Law of 23 July 2016, Art. 2 — €125,000 minimum', '2016-07-23');

-- ── ELTIF 2.0 (EU-wide) ────────────────────────────────────────────────────
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, suitability_required, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000003', '*', 'institutional', 0, false, '[]',
     'Reg 2023/606', '2024-01-10'),
    ('00000000-0000-0000-0000-000000000003', '*', 'professional', 0, false, '[]',
     'Reg 2023/606', '2024-01-10'),
    ('00000000-0000-0000-0000-000000000003', '*', 'retail', 1000000, true,
     '["suitability_assessment"]',
     'Reg 2023/606, Art. 30(1) — €10,000 minimum, suitability required', '2024-01-10');

-- ── German Spezial-AIF ──────────────────────────────────────────────────────
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000004', 'DE', 'institutional', 0, '[]',
     'KAGB §1(6)', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'DE', 'professional', 0, '[]',
     'KAGB §1(6)', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'DE', 'semi_professional', 20000000,
     '["risk_declaration", "investment_advisory_confirmation"]',
     'KAGB §1(19) Nr. 33 — €200,000 minimum', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'AT', 'institutional', 0, '[]',
     'KAGB §1(6) — Austrian institutional via AIFMD passport', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'AT', 'professional', 0, '[]',
     'KAGB §1(6) — Austrian professional via AIFMD passport', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'CH', 'institutional', 0, '[]',
     'KAGB §1(6) — Swiss institutional via bilateral agreement', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000004', 'CH', 'professional', 0, '[]',
     'KAGB §1(6) — Swiss professional via bilateral agreement', '2013-07-22');

-- ── Irish QIAIF ─────────────────────────────────────────────────────────────
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000005', '*', 'institutional', 0, '[]',
     'CBI AIF Rulebook, Chapter 2', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000005', '*', 'professional', 10000000,
     '["qualifying_investor_declaration"]',
     'CBI AIF Rulebook, Chapter 2 — €100,000 minimum qualifying investor', '2013-07-22');

-- ── Irish RIAIF ─────────────────────────────────────────────────────────────
INSERT INTO eligibility_criteria
    (fund_structure_id, jurisdiction, investor_type, minimum_investment, suitability_required, documentation_required, source_reference, effective_date)
VALUES
    ('00000000-0000-0000-0000-000000000006', '*', 'institutional', 0, false, '[]',
     'CBI AIF Rulebook, Chapter 3', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000006', '*', 'professional', 0, false, '[]',
     'CBI AIF Rulebook, Chapter 3', '2013-07-22'),
    ('00000000-0000-0000-0000-000000000006', '*', 'retail', 0, true,
     '["suitability_assessment", "risk_warning_acknowledgment"]',
     'CBI AIF Rulebook, Chapter 3 — No minimum, suitability required', '2013-07-22');

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