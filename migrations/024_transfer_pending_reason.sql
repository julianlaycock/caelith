-- Migration 024: Transfer Pending Approval Reason
-- Date: 2026-02-15
-- Description: Persist why a transfer was routed to manual approval.

ALTER TABLE transfers
  ADD COLUMN IF NOT EXISTS pending_reason TEXT;
