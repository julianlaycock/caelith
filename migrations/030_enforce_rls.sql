-- Migration 030: Enforce RLS for Table Owner
--
-- Migrations 019/020 enabled RLS and created strict policies, but RLS
-- does not apply to the table owner by default. FORCE ROW LEVEL SECURITY
-- ensures policies apply even when connecting as the table owner role.
-- This closes the gap where application-layer bugs could bypass tenant isolation.
--
-- Also adds RLS to tables missed in migration 019: composite_rules,
-- rule_versions, webhooks, webhook_deliveries.

-- ─── Force RLS on existing tables ────────────────────────────

ALTER TABLE investors FORCE ROW LEVEL SECURITY;
ALTER TABLE assets FORCE ROW LEVEL SECURITY;
ALTER TABLE holdings FORCE ROW LEVEL SECURITY;
ALTER TABLE transfers FORCE ROW LEVEL SECURITY;
ALTER TABLE rules FORCE ROW LEVEL SECURITY;
ALTER TABLE fund_structures FORCE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;
ALTER TABLE decision_records FORCE ROW LEVEL SECURITY;
ALTER TABLE onboarding_records FORCE ROW LEVEL SECURITY;
ALTER TABLE eligibility_criteria FORCE ROW LEVEL SECURITY;

-- ─── Enable + Force RLS on previously missed tables ──────────

DO $$
BEGIN
  -- composite_rules
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'composite_rules') THEN
    ALTER TABLE composite_rules ENABLE ROW LEVEL SECURITY;
    ALTER TABLE composite_rules FORCE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_composite_rules') THEN
      CREATE POLICY tenant_isolation_composite_rules ON composite_rules
        USING (
          current_setting('app.tenant_id', true) IS NOT NULL
          AND current_setting('app.tenant_id', true) != ''
          AND tenant_id = current_setting('app.tenant_id', true)::uuid
        );
    END IF;
  END IF;

  -- rule_versions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rule_versions') THEN
    ALTER TABLE rule_versions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE rule_versions FORCE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_rule_versions') THEN
      CREATE POLICY tenant_isolation_rule_versions ON rule_versions
        USING (
          current_setting('app.tenant_id', true) IS NOT NULL
          AND current_setting('app.tenant_id', true) != ''
          AND tenant_id = current_setting('app.tenant_id', true)::uuid
        );
    END IF;
  END IF;

  -- webhooks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks') THEN
    ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE webhooks FORCE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_webhooks') THEN
      CREATE POLICY tenant_isolation_webhooks ON webhooks
        USING (
          current_setting('app.tenant_id', true) IS NOT NULL
          AND current_setting('app.tenant_id', true) != ''
          AND tenant_id = current_setting('app.tenant_id', true)::uuid
        );
    END IF;
  END IF;

  -- webhook_deliveries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_deliveries') THEN
    ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_webhook_deliveries') THEN
      CREATE POLICY tenant_isolation_webhook_deliveries ON webhook_deliveries
        USING (
          current_setting('app.tenant_id', true) IS NOT NULL
          AND current_setting('app.tenant_id', true) != ''
          AND tenant_id = current_setting('app.tenant_id', true)::uuid
        );
    END IF;
  END IF;
END $$;
