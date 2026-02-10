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
-- Existing investors: accredited=true → professional, accredited=false → retail
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