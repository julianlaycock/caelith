-- Migration 028: Functional indexes for case-insensitive dedup during CSV import
-- Date: 2026-02-17
-- Description: Adds composite functional indexes on investors and fund_structures
--              to support the LOWER() dedup queries in import-service.ts.

CREATE INDEX IF NOT EXISTS idx_investors_dedup
  ON investors (tenant_id, LOWER(name), LOWER(jurisdiction));

CREATE INDEX IF NOT EXISTS idx_fund_structures_dedup
  ON fund_structures (tenant_id, LOWER(name), legal_form, domicile);
