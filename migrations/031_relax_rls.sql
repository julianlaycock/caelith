-- Migration 031: Relax RLS - remove FORCE for single-tenant demo
-- FORCE ROW LEVEL SECURITY causes issues when the app connects as table owner.
-- Since we're single-tenant for now, disable FORCE while keeping policies intact.

ALTER TABLE investors NO FORCE ROW LEVEL SECURITY;
ALTER TABLE assets NO FORCE ROW LEVEL SECURITY;
ALTER TABLE holdings NO FORCE ROW LEVEL SECURITY;
ALTER TABLE transfers NO FORCE ROW LEVEL SECURITY;
ALTER TABLE rules NO FORCE ROW LEVEL SECURITY;
ALTER TABLE fund_structures NO FORCE ROW LEVEL SECURITY;
ALTER TABLE events NO FORCE ROW LEVEL SECURITY;
ALTER TABLE decision_records NO FORCE ROW LEVEL SECURITY;
ALTER TABLE onboarding_records NO FORCE ROW LEVEL SECURITY;
ALTER TABLE eligibility_criteria NO FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'composite_rules') THEN
    ALTER TABLE composite_rules NO FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rule_versions') THEN
    ALTER TABLE rule_versions NO FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks') THEN
    ALTER TABLE webhooks NO FORCE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_deliveries') THEN
    ALTER TABLE webhook_deliveries NO FORCE ROW LEVEL SECURITY;
  END IF;
END $$;
