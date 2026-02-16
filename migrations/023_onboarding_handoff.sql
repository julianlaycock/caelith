-- Migration 023: Onboarding Handoff Metadata
-- Date: 2026-02-15
-- Description: Adds ownership tag and handoff notes to onboarding records.

ALTER TABLE onboarding_records
  ADD COLUMN IF NOT EXISTS owner_tag VARCHAR(80),
  ADD COLUMN IF NOT EXISTS handoff_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_onboarding_owner_tag
  ON onboarding_records(owner_tag)
  WHERE owner_tag IS NOT NULL;
