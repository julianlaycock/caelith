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
-- CONSTRAINTS (idempotent — skip if already present)
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rules_min_investment') THEN
    ALTER TABLE rules ADD CONSTRAINT chk_rules_min_investment CHECK (
      minimum_investment IS NULL OR minimum_investment >= 0
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rules_max_investors') THEN
    ALTER TABLE rules ADD CONSTRAINT chk_rules_max_investors CHECK (
      maximum_investors IS NULL OR maximum_investors > 0
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rules_concentration') THEN
    ALTER TABLE rules ADD CONSTRAINT chk_rules_concentration CHECK (
      concentration_limit_pct IS NULL OR (concentration_limit_pct > 0 AND concentration_limit_pct <= 100)
    );
  END IF;
END $$;

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