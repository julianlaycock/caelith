CREATE TABLE IF NOT EXISTS fund_lmts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  fund_structure_id UUID NOT NULL REFERENCES fund_structures(id) ON DELETE CASCADE,
  lmt_type TEXT NOT NULL,
  activation_threshold TEXT,
  activation_policy TEXT,
  status TEXT NOT NULL DEFAULT 'configured',
  last_activated_at TIMESTAMPTZ,
  last_deactivated_at TIMESTAMPTZ,
  nca_notified BOOLEAN DEFAULT false,
  nca_notified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fund_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  fund_structure_id UUID NOT NULL REFERENCES fund_structures(id) ON DELETE CASCADE,
  delegate_name TEXT NOT NULL,
  delegate_lei TEXT,
  function_delegated TEXT NOT NULL,
  jurisdiction TEXT,
  start_date DATE,
  oversight_frequency TEXT,
  last_review_date DATE,
  next_review_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  letterbox_risk TEXT DEFAULT 'low',
  termination_clause TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fund_lmts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fund_lmts_tenant ON fund_lmts;
CREATE POLICY fund_lmts_tenant ON fund_lmts
  USING (tenant_id = COALESCE(current_setting('app.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid));

ALTER TABLE fund_delegations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fund_delegations_tenant ON fund_delegations;
CREATE POLICY fund_delegations_tenant ON fund_delegations
  USING (tenant_id = COALESCE(current_setting('app.tenant_id', true)::uuid, '00000000-0000-0000-0000-000000000001'::uuid));

CREATE INDEX IF NOT EXISTS idx_fund_lmts_fund ON fund_lmts(fund_structure_id);
CREATE INDEX IF NOT EXISTS idx_fund_delegations_fund ON fund_delegations(fund_structure_id);
