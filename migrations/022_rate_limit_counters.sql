-- Migration 022: Shared rate limiting store
-- Adds a central table that enables consistent throttling across multiple app instances.

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  rate_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_counters_reset_at
  ON rate_limit_counters(reset_at);
