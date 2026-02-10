-- Migration 012: Onboarding Records
-- Date: 2026-02-10
-- Description: Investor onboarding workflow tracking. Lifecycle:
--              applied → eligible/ineligible → approved/rejected → allocated
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