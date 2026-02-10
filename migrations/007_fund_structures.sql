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