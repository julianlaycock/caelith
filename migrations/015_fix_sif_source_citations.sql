-- Migration 015: Fix SIF source citations
-- CSSF Circular 15/633 is about quarterly financial reporting by IFMs.
-- The SIF investor eligibility thresholds come from the Law of 13 February 2007
-- on Specialised Investment Funds (SIF Law), Article 2.
-- This migration corrects the source_reference for all SIF eligibility criteria rows.

BEGIN;

-- Fix SIF semi_professional source
UPDATE eligibility_criteria
SET source_reference = 'SIF Law 13 Feb 2007, Art. 2'
WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001'
  AND investor_type = 'semi_professional'
  AND source_reference LIKE '%CSSF Circular 15/633%';

-- Fix SIF professional source
UPDATE eligibility_criteria
SET source_reference = 'SIF Law 13 Feb 2007'
WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001'
  AND investor_type = 'professional'
  AND source_reference LIKE '%CSSF Circular 15/633%';

-- Fix SIF institutional source
UPDATE eligibility_criteria
SET source_reference = 'SIF Law 13 Feb 2007'
WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001'
  AND investor_type = 'institutional'
  AND source_reference LIKE '%CSSF Circular 15/633%';

COMMIT;

-- Rollback:
-- UPDATE eligibility_criteria SET source_reference = 'CSSF Circular 15/633, Section 4.2' WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001' AND investor_type = 'semi_professional';
-- UPDATE eligibility_criteria SET source_reference = 'CSSF Circular 15/633' WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001' AND investor_type = 'professional';
-- UPDATE eligibility_criteria SET source_reference = 'CSSF Circular 15/633' WHERE fund_structure_id = '00000000-0000-0000-0000-000000000001' AND investor_type = 'institutional';