-- Migration 014: Fix Eligibility Criteria Data Errors
-- Date: 2026-02-10
-- Description: Corrections found by cross-referencing seed data against
--              uploaded regulatory documents.
--
-- ERROR 1: RAIF semi_professional minimum was €125,000 (12500000 cents).
--          Law of 23 July 2016, Art. 2(1)(b)(i) states €100,000.
--
-- ERROR 2: ELTIF retail minimum was €10,000 (1000000 cents).
--          Reg 2023/606 (ELTIF 2.0), Recital 47 removed the €10,000 minimum.
--          Retail investors can invest any amount, subject to suitability.

-- Fix 1: RAIF semi_professional — €125,000 → €100,000
UPDATE eligibility_criteria
SET minimum_investment = 10000000,
    source_reference = 'Law of 23 July 2016, Art. 2(1)(b)(i) — €100,000 minimum'
WHERE fund_structure_id = '00000000-0000-0000-0000-000000000002'
  AND investor_type = 'semi_professional';

-- Fix 2: ELTIF retail — €10,000 → €0 (removed by ELTIF 2.0 reform)
UPDATE eligibility_criteria
SET minimum_investment = 0,
    source_reference = 'Reg 2023/606, Recital 47 + Art. 30 — minimum removed, suitability required'
WHERE fund_structure_id = '00000000-0000-0000-0000-000000000003'
  AND investor_type = 'retail';

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- UPDATE eligibility_criteria
-- SET minimum_investment = 12500000,
--     source_reference = 'Law of 23 July 2016, Art. 2 — €125,000 minimum'
-- WHERE fund_structure_id = '00000000-0000-0000-0000-000000000002'
--   AND investor_type = 'semi_professional';
--
-- UPDATE eligibility_criteria
-- SET minimum_investment = 1000000,
--     source_reference = 'Reg 2023/606, Art. 30(1) — €10,000 minimum, suitability required'
-- WHERE fund_structure_id = '00000000-0000-0000-0000-000000000003'
--   AND investor_type = 'retail';