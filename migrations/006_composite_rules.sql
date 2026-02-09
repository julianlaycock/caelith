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