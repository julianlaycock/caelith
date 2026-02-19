/**
 * Rule Pack Service — Pre-configured AIFMD II Regulatory Rule Packs
 *
 * Applies jurisdiction-specific eligibility criteria, built-in rules,
 * and composite rules for common fund legal forms.
 */

import { randomUUID } from 'crypto';
import { execute, query, DEFAULT_TENANT_ID } from '../db.js';
import { createEvent } from '../repositories/index.js';
// LegalForm type from models used for RULE_PACKS keys

// ── Rule Pack Definitions ───────────────────────────────

interface CriteriaTemplate {
  jurisdiction: string;
  investor_type: string;
  minimum_investment: number; // cents
  maximum_allocation_pct: number | null;
  documentation_required: string[];
  suitability_required: boolean;
  source_reference: string;
}

interface RulePackDefinition {
  name: string;
  description: string;
  criteria: CriteriaTemplate[];
  jurisdiction_whitelist: string[];
  kyc_required: boolean;
  qualification_required: boolean;
  lockup_days: number;
  minimum_investment: number | null; // cents
  concentration_limit_pct: number | null;
}

const RULE_PACKS: Record<string, RulePackDefinition> = {
  SIF: {
    name: 'Luxembourg SIF (Law of 13 Feb 2007)',
    description: 'Specialised Investment Fund — restricted to well-informed investors with EUR 125,000 minimum for non-institutional.',
    criteria: [
      {
        jurisdiction: 'LU', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'Law of 13 February 2007, Art. 2; CSSF Circular 07/309',
      },
      {
        jurisdiction: 'LU', investor_type: 'professional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['MiFID_professional_classification'],
        suitability_required: false,
        source_reference: 'Law of 13 February 2007, Art. 2; CSSF Circular 07/309',
      },
      {
        jurisdiction: 'LU', investor_type: 'well_informed', minimum_investment: 12500000,
        maximum_allocation_pct: null, documentation_required: ['written_confirmation_of_well_informed_status', 'proof_of_experience'],
        suitability_required: false,
        source_reference: 'Law of 13 February 2007, Art. 2(1); CSSF Circular 07/309, Section 4',
      },
      {
        jurisdiction: 'LU', investor_type: 'semi_professional', minimum_investment: 12500000,
        maximum_allocation_pct: null, documentation_required: ['written_confirmation_of_well_informed_status', 'proof_of_experience'],
        suitability_required: true,
        source_reference: 'Law of 13 February 2007, Art. 2(1); CSSF FAQ SIF Q4',
      },
      // EU passport jurisdictions
      {
        jurisdiction: 'DE', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'AIFMD Passport, Art. 32; Law of 13 February 2007, Art. 2',
      },
      {
        jurisdiction: 'DE', investor_type: 'professional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['MiFID_professional_classification'],
        suitability_required: false,
        source_reference: 'AIFMD Passport, Art. 32; Law of 13 February 2007, Art. 2',
      },
      {
        jurisdiction: 'FR', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'AIFMD Passport, Art. 32; Law of 13 February 2007, Art. 2',
      },
      {
        jurisdiction: 'FR', investor_type: 'professional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['MiFID_professional_classification'],
        suitability_required: false,
        source_reference: 'AIFMD Passport, Art. 32; Law of 13 February 2007, Art. 2',
      },
    ],
    jurisdiction_whitelist: ['LU', 'DE', 'FR', 'NL', 'BE', 'AT', 'IT', 'ES', 'IE', 'GB', 'CH', 'LI'],
    kyc_required: true,
    qualification_required: true,
    lockup_days: 0,
    minimum_investment: 12500000,
    concentration_limit_pct: null,
  },

  RAIF: {
    name: 'Luxembourg RAIF (Law of 23 July 2016)',
    description: 'Reserved Alternative Investment Fund — same investor eligibility as SIF but without CSSF product approval.',
    criteria: [
      {
        jurisdiction: 'LU', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'Law of 23 July 2016, Art. 2; mirrors SIF investor requirements',
      },
      {
        jurisdiction: 'LU', investor_type: 'professional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['MiFID_professional_classification'],
        suitability_required: false,
        source_reference: 'Law of 23 July 2016, Art. 2',
      },
      {
        jurisdiction: 'LU', investor_type: 'well_informed', minimum_investment: 12500000,
        maximum_allocation_pct: null, documentation_required: ['written_confirmation_of_well_informed_status', 'proof_of_experience'],
        suitability_required: false,
        source_reference: 'Law of 23 July 2016, Art. 2(1)',
      },
      {
        jurisdiction: 'DE', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'AIFMD Passport, Art. 32; Law of 23 July 2016, Art. 2',
      },
      {
        jurisdiction: 'DE', investor_type: 'professional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['MiFID_professional_classification'],
        suitability_required: false,
        source_reference: 'AIFMD Passport, Art. 32; Law of 23 July 2016, Art. 2',
      },
    ],
    jurisdiction_whitelist: ['LU', 'DE', 'FR', 'NL', 'BE', 'AT', 'IT', 'ES', 'IE', 'GB', 'CH', 'LI'],
    kyc_required: true,
    qualification_required: true,
    lockup_days: 0,
    minimum_investment: 12500000,
    concentration_limit_pct: null,
  },

  SICAV: {
    name: 'Luxembourg Part II UCI (Law of 17 Dec 2010)',
    description: 'Part II Undertaking for Collective Investment — may be offered to retail investors with suitability assessment.',
    criteria: [
      {
        jurisdiction: 'LU', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'Law of 17 December 2010, Part II, Art. 88 et seq.',
      },
      {
        jurisdiction: 'LU', investor_type: 'professional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['MiFID_professional_classification'],
        suitability_required: false,
        source_reference: 'Law of 17 December 2010, Part II, Art. 88 et seq.',
      },
      {
        jurisdiction: 'LU', investor_type: 'retail', minimum_investment: 0,
        maximum_allocation_pct: 10, documentation_required: ['KYC_identity', 'suitability_questionnaire'],
        suitability_required: true,
        source_reference: 'Law of 17 December 2010, Part II; MiFID II Suitability Requirements',
      },
      {
        jurisdiction: 'DE', investor_type: 'retail', minimum_investment: 0,
        maximum_allocation_pct: 10, documentation_required: ['KYC_identity', 'suitability_questionnaire'],
        suitability_required: true,
        source_reference: 'AIFMD Passport; Law of 17 December 2010, Part II',
      },
      {
        jurisdiction: 'FR', investor_type: 'retail', minimum_investment: 0,
        maximum_allocation_pct: 10, documentation_required: ['KYC_identity', 'suitability_questionnaire'],
        suitability_required: true,
        source_reference: 'AIFMD Passport; Law of 17 December 2010, Part II',
      },
    ],
    jurisdiction_whitelist: [],
    kyc_required: true,
    qualification_required: false,
    lockup_days: 0,
    minimum_investment: null,
    concentration_limit_pct: 10,
  },

  QIAIF: {
    name: 'Irish QIAIF (Qualifying Investor AIF)',
    description: 'Qualifying Investor AIF — restricted to qualifying investors with EUR 100,000 minimum.',
    criteria: [
      {
        jurisdiction: 'IE', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'Central Bank AIF Rulebook, Chapter 2; S.I. No. 257/2013',
      },
      {
        jurisdiction: 'IE', investor_type: 'professional', minimum_investment: 10000000,
        maximum_allocation_pct: null, documentation_required: ['qualifying_investor_declaration'],
        suitability_required: false,
        source_reference: 'Central Bank AIF Rulebook, Chapter 2; S.I. No. 257/2013',
      },
      {
        jurisdiction: 'LU', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'AIFMD Passport, Art. 32; Central Bank AIF Rulebook',
      },
      {
        jurisdiction: 'LU', investor_type: 'professional', minimum_investment: 10000000,
        maximum_allocation_pct: null, documentation_required: ['qualifying_investor_declaration'],
        suitability_required: false,
        source_reference: 'AIFMD Passport, Art. 32; Central Bank AIF Rulebook',
      },
    ],
    jurisdiction_whitelist: ['IE', 'LU', 'DE', 'FR', 'NL', 'BE', 'GB', 'CH'],
    kyc_required: true,
    qualification_required: true,
    lockup_days: 0,
    minimum_investment: 10000000,
    concentration_limit_pct: null,
  },

  Spezial_AIF: {
    name: 'German Spezial-AIF (KAGB)',
    description: 'German special AIF — restricted to semi-professional and professional investors under KAGB.',
    criteria: [
      {
        jurisdiction: 'DE', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'KAGB ss 282, 1(1); BaFin Guidelines on KAGB',
      },
      {
        jurisdiction: 'DE', investor_type: 'professional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['MiFID_professional_classification'],
        suitability_required: false,
        source_reference: 'KAGB ss 282, 1(1); BaFin Guidelines on KAGB',
      },
      {
        jurisdiction: 'DE', investor_type: 'semi_professional', minimum_investment: 20000000,
        maximum_allocation_pct: null, documentation_required: ['semi_professional_declaration', 'proof_of_experience'],
        suitability_required: true,
        source_reference: 'KAGB ss 282, 1(2); Minimum EUR 200,000 for semi-professional investors',
      },
      {
        jurisdiction: 'AT', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'AIFMD Passport; KAGB ss 282',
      },
      {
        jurisdiction: 'CH', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'AIFMD Passport; bilateral agreement DE-CH; KAGB ss 282',
      },
    ],
    jurisdiction_whitelist: ['DE', 'AT', 'CH', 'LU', 'NL', 'FR', 'IE', 'GB'],
    kyc_required: true,
    qualification_required: true,
    lockup_days: 0,
    minimum_investment: 20000000,
    concentration_limit_pct: null,
  },

  ELTIF: {
    name: 'ELTIF 2.0 (EU Regulation 2015/760 as amended)',
    description: 'European Long-Term Investment Fund — accessible to retail investors with EUR 10,000 minimum and suitability assessment.',
    criteria: [
      {
        jurisdiction: 'LU', investor_type: 'institutional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['proof_of_institutional_status'],
        suitability_required: false,
        source_reference: 'Regulation (EU) 2015/760, Art. 30 as amended by Regulation (EU) 2023/606',
      },
      {
        jurisdiction: 'LU', investor_type: 'professional', minimum_investment: 0,
        maximum_allocation_pct: null, documentation_required: ['MiFID_professional_classification'],
        suitability_required: false,
        source_reference: 'Regulation (EU) 2015/760, Art. 30 as amended by Regulation (EU) 2023/606',
      },
      {
        jurisdiction: 'LU', investor_type: 'retail', minimum_investment: 1000000,
        maximum_allocation_pct: 10, documentation_required: ['KYC_identity', 'suitability_questionnaire'],
        suitability_required: true,
        source_reference: 'Regulation (EU) 2015/760, Art. 30(3) as amended; ELTIF 2.0 EUR 10,000 minimum',
      },
      {
        jurisdiction: 'DE', investor_type: 'retail', minimum_investment: 1000000,
        maximum_allocation_pct: 10, documentation_required: ['KYC_identity', 'suitability_questionnaire'],
        suitability_required: true,
        source_reference: 'ELTIF 2.0; AIFMD Passport',
      },
    ],
    jurisdiction_whitelist: [],
    kyc_required: true,
    qualification_required: false,
    lockup_days: 365,
    minimum_investment: 1000000,
    concentration_limit_pct: 10,
  },
};

// ── Public API ──────────────────────────────────────────

export function getAvailableRulePacks(): Array<{ legal_form: string; name: string; description: string }> {
  return Object.entries(RULE_PACKS).map(([key, pack]) => ({
    legal_form: key,
    name: pack.name,
    description: pack.description,
  }));
}

export interface ApplyRulePackResult {
  criteria_created: number;
  rules_updated: boolean;
  rule_pack: string;
  legal_form: string;
}

export async function applyRulePack(
  fundStructureId: string,
  legalForm?: string
): Promise<ApplyRulePackResult> {
  // Resolve legal form from fund if not provided
  let resolvedLegalForm = legalForm;
  if (!resolvedLegalForm) {
    const funds = await query<{ legal_form: string }>(
      'SELECT legal_form FROM fund_structures WHERE id = $1',
      [fundStructureId]
    );
    if (funds.length === 0) {
      throw new Error(`Fund structure not found: ${fundStructureId}`);
    }
    resolvedLegalForm = funds[0].legal_form;
  }

  const pack = RULE_PACKS[resolvedLegalForm];
  if (!pack) {
    throw new Error(
      `No rule pack available for legal form: ${resolvedLegalForm}. Available: ${Object.keys(RULE_PACKS).join(', ')}`
    );
  }

  const now = new Date().toISOString().split('T')[0];

  // 1. Delete existing criteria for this fund (replace with rule pack)
  await execute(
    'DELETE FROM eligibility_criteria WHERE fund_structure_id = $1',
    [fundStructureId]
  );

  // 2. Insert new criteria from the rule pack
  let criteriaCreated = 0;
  for (const c of pack.criteria) {
    const id = randomUUID();
    await execute(
      `INSERT INTO eligibility_criteria
        (id, tenant_id, fund_structure_id, jurisdiction, investor_type,
         minimum_investment, maximum_allocation_pct, documentation_required,
         suitability_required, source_reference, effective_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id, DEFAULT_TENANT_ID, fundStructureId,
        c.jurisdiction, c.investor_type,
        c.minimum_investment, c.maximum_allocation_pct,
        JSON.stringify(c.documentation_required),
        c.suitability_required, c.source_reference, now,
      ]
    );
    criteriaCreated++;
  }

  // 3. Update or create built-in rules for each asset in the fund
  const assets = await query<{ id: string }>(
    'SELECT id FROM assets WHERE fund_structure_id = $1',
    [fundStructureId]
  );

  for (const asset of assets) {
    const existing = await query<{ id: string; version: number }>(
      'SELECT id, version FROM rules WHERE asset_id = $1',
      [asset.id]
    );

    if (existing.length > 0) {
      const newVersion = existing[0].version + 1;
      await execute(
        `UPDATE rules SET
           qualification_required = $1, lockup_days = $2,
           jurisdiction_whitelist = $3, kyc_required = $4,
           minimum_investment = $5, concentration_limit_pct = $6,
           version = $7
         WHERE asset_id = $8`,
        [
          pack.qualification_required, pack.lockup_days,
          JSON.stringify(pack.jurisdiction_whitelist),
          pack.kyc_required, pack.minimum_investment,
          pack.concentration_limit_pct, newVersion, asset.id,
        ]
      );
    } else {
      const ruleId = randomUUID();
      await execute(
        `INSERT INTO rules
          (id, tenant_id, asset_id, version, qualification_required, lockup_days,
           jurisdiction_whitelist, kyc_required, minimum_investment, concentration_limit_pct)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          ruleId, DEFAULT_TENANT_ID, asset.id, 1,
          pack.qualification_required, pack.lockup_days,
          JSON.stringify(pack.jurisdiction_whitelist),
          pack.kyc_required, pack.minimum_investment,
          pack.concentration_limit_pct,
        ]
      );
    }
  }

  // 4. Log event
  await createEvent({
    event_type: 'eligibility_criteria.created',
    entity_type: 'fund_structure',
    entity_id: fundStructureId,
    payload: {
      action: 'rule_pack_applied',
      rule_pack: resolvedLegalForm,
      criteria_created: criteriaCreated,
      assets_updated: assets.length,
    },
  });

  return {
    criteria_created: criteriaCreated,
    rules_updated: assets.length > 0,
    rule_pack: pack.name,
    legal_form: resolvedLegalForm,
  };
}
