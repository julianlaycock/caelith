-- Migration 016: Multi-tenancy infrastructure
-- Date: 2026-02-12
-- Description: Add tenants table and tenant_id to core tables.

-- ============================================================================
-- TENANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    domain VARCHAR(255),
    settings JSONB NOT NULL DEFAULT '{}',
    max_funds INTEGER DEFAULT 10,
    max_investors INTEGER DEFAULT 500,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tenants (id, name, slug, status) VALUES
    ('00000000-0000-0000-0000-000000000099', 'Caelith Demo', 'demo', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADD tenant_id TO TABLES
-- ============================================================================

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE users SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- Fund Structures
ALTER TABLE fund_structures ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE fund_structures SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE fund_structures ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE fund_structures ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_fund_structures_tenant ON fund_structures(tenant_id);

-- Investors
ALTER TABLE investors ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE investors SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE investors ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE investors ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_investors_tenant ON investors(tenant_id);

-- Assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE assets SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE assets ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE assets ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_assets_tenant ON assets(tenant_id);

-- Holdings
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE holdings SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE holdings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE holdings ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_holdings_tenant ON holdings(tenant_id);

-- Rules
ALTER TABLE rules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE rules SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE rules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE rules ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_rules_tenant ON rules(tenant_id);

-- Transfers
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE transfers SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE transfers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE transfers ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_transfers_tenant ON transfers(tenant_id);

-- Decision Records
ALTER TABLE decision_records ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE decision_records SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE decision_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE decision_records ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_decision_records_tenant ON decision_records(tenant_id);

-- Onboarding Records
ALTER TABLE onboarding_records ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE onboarding_records SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE onboarding_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE onboarding_records ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_onboarding_records_tenant ON onboarding_records(tenant_id);

-- Events
ALTER TABLE events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE events SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE events ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE events ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_events_tenant ON events(tenant_id);

-- Eligibility Criteria
ALTER TABLE eligibility_criteria ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE eligibility_criteria SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE eligibility_criteria ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE eligibility_criteria ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_eligibility_criteria_tenant ON eligibility_criteria(tenant_id);

-- Composite Rules
ALTER TABLE composite_rules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE composite_rules SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE composite_rules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE composite_rules ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_composite_rules_tenant ON composite_rules(tenant_id);

-- Regulatory Documents
ALTER TABLE regulatory_documents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE regulatory_documents SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
ALTER TABLE regulatory_documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE regulatory_documents ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
CREATE INDEX IF NOT EXISTS idx_regulatory_documents_tenant ON regulatory_documents(tenant_id);

-- Rule Versions (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rule_versions') THEN
        ALTER TABLE rule_versions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
        UPDATE rule_versions SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
        ALTER TABLE rule_versions ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE rule_versions ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
        CREATE INDEX IF NOT EXISTS idx_rule_versions_tenant ON rule_versions(tenant_id);
    END IF;
END $$;

-- Webhooks
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'webhooks') THEN
        ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
        UPDATE webhooks SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
        ALTER TABLE webhooks ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE webhooks ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
        CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
    END IF;
END $$;

-- Webhook Deliveries
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'webhook_deliveries') THEN
        ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
        UPDATE webhook_deliveries SET tenant_id = '00000000-0000-0000-0000-000000000099' WHERE tenant_id IS NULL;
        ALTER TABLE webhook_deliveries ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE webhook_deliveries ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000099';
        CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant ON webhook_deliveries(tenant_id);
    END IF;
END $$;

-- ============================================================================
-- RLS (READY TO ENABLE)
-- ============================================================================
-- ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation_investors ON investors
--   USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

