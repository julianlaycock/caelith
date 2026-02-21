-- Migration 035: AIFMD II Readiness Assessment
-- Stores structured readiness responses per tenant, tracks progress over time.

CREATE TABLE IF NOT EXISTS aifmd_readiness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    category VARCHAR(50) NOT NULL
        CHECK (category IN (
            'delegation', 'liquidity', 'reporting', 'disclosure', 'loan_origination', 'governance'
        )),
    question_key VARCHAR(100) NOT NULL,
    answer JSONB NOT NULL DEFAULT '{}',
    -- answer schema: { "status": "yes"|"no"|"partial"|"na", "notes": "...", "auto": true|false }
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, question_key)
);

CREATE INDEX IF NOT EXISTS idx_aifmd_readiness_tenant ON aifmd_readiness(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aifmd_readiness_category ON aifmd_readiness(category);

-- RLS
ALTER TABLE aifmd_readiness ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_aifmd_readiness') THEN
    CREATE POLICY tenant_isolation_aifmd_readiness ON aifmd_readiness
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
