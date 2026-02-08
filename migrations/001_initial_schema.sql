-- Migration 001: Initial Schema
-- Date: 2026-02-07
-- Description: Create core tables for Private Asset Registry

-- Enable foreign keys (SQLite specific)
PRAGMA foreign_keys = ON;

-- ============================================================================
-- ASSETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    total_units INTEGER NOT NULL CHECK (total_units > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_assets_created_at ON assets(created_at);

-- ============================================================================
-- INVESTORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS investors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    accredited INTEGER NOT NULL CHECK (accredited IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_investors_jurisdiction ON investors(jurisdiction);
CREATE INDEX idx_investors_created_at ON investors(created_at);

-- ============================================================================
-- HOLDINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS holdings (
    id TEXT PRIMARY KEY,
    investor_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    units INTEGER NOT NULL CHECK (units >= 0),
    acquired_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE RESTRICT,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
    UNIQUE(investor_id, asset_id)
);

CREATE INDEX idx_holdings_asset_id ON holdings(asset_id);
CREATE INDEX idx_holdings_investor_id ON holdings(investor_id);
CREATE INDEX idx_holdings_acquired_at ON holdings(acquired_at);

-- ============================================================================
-- RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL UNIQUE,
    version INTEGER NOT NULL,
    qualification_required INTEGER NOT NULL CHECK (qualification_required IN (0, 1)),
    lockup_days INTEGER NOT NULL CHECK (lockup_days >= 0),
    jurisdiction_whitelist TEXT NOT NULL, -- JSON array stored as TEXT
    transfer_whitelist TEXT, -- JSON array stored as TEXT, NULL = unrestricted
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_rules_asset_id ON rules(asset_id);
CREATE INDEX idx_rules_created_at ON rules(created_at);

-- ============================================================================
-- TRANSFERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    from_investor_id TEXT NOT NULL,
    to_investor_id TEXT NOT NULL,
    units INTEGER NOT NULL CHECK (units > 0),
    executed_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
    FOREIGN KEY (from_investor_id) REFERENCES investors(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_investor_id) REFERENCES investors(id) ON DELETE RESTRICT,
    CHECK (from_investor_id != to_investor_id)
);

CREATE INDEX idx_transfers_asset_id_executed_at ON transfers(asset_id, executed_at DESC);
CREATE INDEX idx_transfers_from_investor_id ON transfers(from_investor_id);
CREATE INDEX idx_transfers_to_investor_id ON transfers(to_investor_id);
CREATE INDEX idx_transfers_executed_at ON transfers(executed_at DESC);

-- ============================================================================
-- EVENTS TABLE (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON stored as TEXT
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_entity_type_entity_id ON events(entity_type, entity_id);
CREATE INDEX idx_events_event_type ON events(event_type);

-- ============================================================================
-- END OF MIGRATION 001
-- ============================================================================