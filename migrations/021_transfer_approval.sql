-- Add approval workflow columns to transfers
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'executed';
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Index for pending transfers lookup
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status) WHERE status = 'pending_approval';

-- Update existing transfers to 'executed' status
UPDATE transfers SET status = 'executed' WHERE status IS NULL;
