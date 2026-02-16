-- Migration 027: Germany-specific KAGB Spezial-AIF fund structure + eligibility criteria
-- Date: 2026-02-16
-- Description: Adds a German Spezial-AIF fund structure with KAGB-specific eligibility criteria
--              and German regulatory citations for pilot readiness.

-- German Spezial-AIF fund structure
INSERT INTO fund_structures (id, name, legal_form, domicile, regulatory_framework, aifm_name, aifm_lei, inception_date, target_size, currency, status, 
  lmt_types, leverage_limit_commitment, leverage_limit_gross, leverage_current_commitment, leverage_current_gross,
  liquidity_profile, geographic_exposure, counterparty_exposure, created_at, updated_at)
VALUES (
  '10000000-0000-0000-0000-000000000005',
  'Berlin Immobilien Spezial-AIF I',
  'Spezial_AIF',
  'DE',
  'AIFMD',
  'Berliner Kapitalverwaltung GmbH',
  '529900EXAMPLEDEA0001',
  '2025-09-01',
  75000000,
  'EUR',
  'active',
  '[{"type":"notice_period","description":"Quartalskündigung mit 6 Monaten Vorankündigung (KAGB §98)","active":true},{"type":"redemption_gate","description":"Rücknahmebegrenzung bei 10% des NAV pro Quartal","threshold_pct":10,"active":true},{"type":"swing_pricing","description":"Swing Pricing ±1.5% bei Nettomittelabfluss >5% NAV","active":true}]',
  2.0, 3.0, 1.6, 2.2,
  '[{"bucket":"1d","pct":2},{"bucket":"2-7d","pct":5},{"bucket":"8-30d","pct":8},{"bucket":"31-90d","pct":15},{"bucket":"91-180d","pct":25},{"bucket":"181-365d","pct":25},{"bucket":">365d","pct":20}]',
  '[{"region":"Deutschland","pct":55},{"region":"Westeuropa (ex DE)","pct":25},{"region":"Nordamerika","pct":15},{"region":"Asien-Pazifik","pct":5}]',
  '[{"name":"Deutsche Bank AG","lei":"549300MZYIJZEP4ANP14","exposure_pct":14.2},{"name":"Commerzbank AG","lei":"851WYGNLUQLFZBSBER43","exposure_pct":8.5},{"name":"DZ Bank AG","lei":"529900HNOAA1KXQJUQ27","exposure_pct":5.3}]',
  now(), now()
) ON CONFLICT (id) DO NOTHING;

-- KAGB §1 Abs. 6: Eligibility criteria for German Spezial-AIF
-- Semi-professional: minimum €200,000 investment
INSERT INTO eligibility_criteria (id, fund_structure_id, jurisdiction, investor_type, minimum_investment, suitability_required, documentation_required, source_reference, effective_date, created_at)
VALUES
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000005', '*', 'institutional', 0, false, '[]', 'KAGB §1 Abs. 6 Nr. 1 — Institutionelle Anleger', CURRENT_DATE, now()),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000005', '*', 'professional', 0, false, '[]', 'KAGB §1 Abs. 6 Nr. 1 — Professionelle Anleger gem. MiFID II Anhang II', CURRENT_DATE, now()),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000005', '*', 'semi_professional', 20000000, true, '["Anlegereignungserklärung","Vermögensnachweis"]', 'KAGB §1 Abs. 6 Nr. 2 — Semiprofessionelle Anleger, Mindestanlage €200.000', CURRENT_DATE, now())
ON CONFLICT DO NOTHING;

-- German investors for the Spezial-AIF demo
INSERT INTO investors (id, name, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry, lei, classification_method, classification_date, classification_evidence, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Bayerische Versorgungskammer', 'DE', true, 'institutional', 'verified', CURRENT_DATE + INTERVAL '2 years', '529900EXAMPLEDEA0002', 'regulatory_status', CURRENT_DATE, '[{"type":"BaFin_registration","document_ref":"BaFin Registrierung Nr. 123456","verified_at":"2025-12-01","verified_by":"admin@caelith.com"}]', now(), now()),
  (gen_random_uuid(), 'Münchner Rück Investments GmbH', 'DE', true, 'professional', 'verified', CURRENT_DATE + INTERVAL '18 months', '529900EXAMPLEDEA0003', 'documentation', CURRENT_DATE, '[{"type":"mifid_classification","document_ref":"MiFID II Professioneller Kunde Vereinbarung MR-2025-001","verified_at":"2025-11-15","verified_by":"admin@caelith.com"}]', now(), now()),
  (gen_random_uuid(), 'Schmidt Family Office GmbH', 'DE', true, 'semi_professional', 'verified', CURRENT_DATE + INTERVAL '1 year', NULL, 'self_declaration', CURRENT_DATE, '[{"type":"wealth_declaration","document_ref":"Vermögenserklärung Schmidt FO 2025","verified_at":"2025-10-01","verified_by":"admin@caelith.com"},{"type":"experience_assessment","document_ref":"Anlegereignungsprüfung Schmidt-2025","verified_at":"2025-10-01","verified_by":"admin@caelith.com"}]', now(), now()),
  (gen_random_uuid(), 'Hans Weber', 'DE', false, 'retail', 'verified', CURRENT_DATE + INTERVAL '1 year', NULL, NULL, NULL, '[]', now(), now())
ON CONFLICT DO NOTHING;
