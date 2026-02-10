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
-- EXTEND TRANSFERS TABLE — link to decision record
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