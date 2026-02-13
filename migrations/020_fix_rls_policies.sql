-- Migration 020: Fix RLS Policies — Remove COALESCE Fallback
-- SECURITY FIX: The COALESCE(current_setting('app.tenant_id', true)::uuid, tenant_id)
-- pattern means that when app.tenant_id is NOT set, the policy evaluates to
-- tenant_id = tenant_id (always true), effectively disabling tenant isolation.
-- Fix: Require app.tenant_id to be set; deny access if not.

-- Drop existing permissive policies and recreate with strict isolation
DO $$
DECLARE
  tbl TEXT;
  policy_name TEXT;
  tables TEXT[] := ARRAY[
    'investors', 'assets', 'holdings', 'transfers', 'rules',
    'fund_structures', 'events', 'decision_records', 'onboarding_records', 'eligibility_criteria'
  ];
  policy_names TEXT[] := ARRAY[
    'tenant_isolation_investors', 'tenant_isolation_assets', 'tenant_isolation_holdings',
    'tenant_isolation_transfers', 'tenant_isolation_rules', 'tenant_isolation_fund_structures',
    'tenant_isolation_events', 'tenant_isolation_decision_records', 'tenant_isolation_onboarding',
    'tenant_isolation_eligibility'
  ];
BEGIN
  FOR i IN 1..array_length(tables, 1) LOOP
    tbl := tables[i];
    policy_name := policy_names[i];

    -- Drop old permissive policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, tbl);

    -- Recreate with strict check: if app.tenant_id is not set, deny all rows
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (
        current_setting(''app.tenant_id'', true) IS NOT NULL
        AND current_setting(''app.tenant_id'', true) != ''''
        AND tenant_id = current_setting(''app.tenant_id'', true)::uuid
      )',
      policy_name, tbl
    );
  END LOOP;
END $$;
