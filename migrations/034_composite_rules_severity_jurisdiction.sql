-- Migration 034: Add severity and jurisdiction to composite_rules
-- These columns allow rules to specify their severity level and applicable jurisdiction.

ALTER TABLE composite_rules ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE composite_rules ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(10);
-- e.g., 'DE', 'AT', 'LU', 'EU', NULL (applies to all)

COMMENT ON COLUMN composite_rules.severity IS 'Rule severity: low | medium | high | critical';
COMMENT ON COLUMN composite_rules.jurisdiction IS 'Applicable jurisdiction code (NULL = all)';
