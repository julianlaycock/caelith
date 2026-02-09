-- Migration 002: PostgreSQL Schema
-- Date: 2026-02-09
-- Description: PostgreSQL version of the core schema (replaces SQLite 001)

-- ============================================================================
-- ASSETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    total_units BIGINT NOT NULL CHECK (total_units > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);

-- ============================================================================
-- INVESTORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(100) NOT NULL,
    accredited BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investors_jurisdiction ON investors(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_investors_created_at ON investors(created_at);

-- ============================================================================
-- HOLDINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    units BIGINT NOT NULL CHECK (units >= 0),
    acquired_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(investor_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_holdings_asset_id ON holdings(asset_id);
CREATE INDEX IF NOT EXISTS idx_holdings_investor_id ON holdings(investor_id);

-- ============================================================================
-- RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL UNIQUE REFERENCES assets(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL,
    qualification_required BOOLEAN NOT NULL DEFAULT false,
    lockup_days INTEGER NOT NULL CHECK (lockup_days >= 0),
    jurisdiction_whitelist JSONB NOT NULL DEFAULT '[]',
    transfer_whitelist JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TRANSFERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    from_investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    to_investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE RESTRICT,
    units BIGINT NOT NULL CHECK (units > 0),
    executed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (from_investor_id != to_investor_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_asset_executed ON transfers(asset_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_investor_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_investor_id);

-- ============================================================================
-- EVENTS TABLE (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
-- Migration 003: Users & Authentication
-- Date: 2026-02-09

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'compliance_officer', 'viewer')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
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
-- Migration 005: Webhook System
-- Date: 2026-02-09

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(2048) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    event_types JSONB NOT NULL DEFAULT '["*"]',
    active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    response_code INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries(status);
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
