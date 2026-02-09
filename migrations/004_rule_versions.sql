-- Migration 004: Rule Versioning
-- Date: 2026-02-09
-- Keeps full history of all rule changes per asset

CREATE TABLE IF NOT EXISTS rule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL,
    config JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(asset_id, version)
);

CREATE INDEX IF NOT EXISTS idx_rule_versions_asset ON rule_versions(asset_id, version DESC);