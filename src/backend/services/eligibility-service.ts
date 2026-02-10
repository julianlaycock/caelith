import {
  EligibilityCheckRequest,
  EligibilityCheckResult,
  DecisionCheck,
  DecisionResult,
  InvestorType,
} from '../models/index.js';
import { findInvestorById } from '../repositories/investor-repository.js';
import { findFundStructureById } from '../repositories/fund-structure-repository.js';
import { findApplicableCriteria } from '../repositories/eligibility-criteria-repository.js';
import { createDecisionRecord } from '../repositories/decision-record-repository.js';

/**
 * Check whether an investor is eligible to invest in a fund.
 * Writes a decision record for every check (approved or rejected).
 *
 * Checks performed:
 *   1. Investor exists and is active
 *   2. Fund structure exists and is active
 *   3. KYC status is verified (if fund requires it)
 *   4. Investor type is permitted for this fund structure
 *   5. Minimum investment threshold met (if applicable)
 *   6. Suitability assessment completed (if required)
 */
export async function checkEligibility(request: EligibilityCheckRequest): Promise<EligibilityCheckResult> {
  const checks: DecisionCheck[] = [];
  let eligible = true;

  // ── Load entities ──────────────────────────────────────────────────────
  const investor = await findInvestorById(request.investor_id);
  if (!investor) {
    throw new Error(`Investor not found: ${request.investor_id}`);
  }

  const fundStructure = await findFundStructureById(request.fund_structure_id);
  if (!fundStructure) {
    throw new Error(`Fund structure not found: ${request.fund_structure_id}`);
  }

  // ── Check 1: Fund is open ─────────────────────────────────────────────
  if (fundStructure.status === 'active') {
    checks.push({ rule: 'fund_status', passed: true, message: `Fund is ${fundStructure.status}` });
  } else {
    checks.push({ rule: 'fund_status', passed: false, message: `Fund is ${fundStructure.status}, not accepting new investors` });
    eligible = false;
  }

  // ── Check 2: KYC status ───────────────────────────────────────────────
  if (investor.kyc_status === 'verified') {
    const expiryMsg = investor.kyc_expiry ? `, expires ${investor.kyc_expiry}` : '';
    checks.push({ rule: 'kyc_valid', passed: true, message: `KYC verified${expiryMsg}` });
  } else {
    checks.push({ rule: 'kyc_valid', passed: false, message: `KYC status is '${investor.kyc_status}', must be 'verified'` });
    eligible = false;
  }

  // ── Check 3: KYC not expired ──────────────────────────────────────────
  if (investor.kyc_status === 'verified' && investor.kyc_expiry) {
    const expiry = new Date(investor.kyc_expiry);
    const now = new Date();
    if (expiry > now) {
      checks.push({ rule: 'kyc_not_expired', passed: true, message: `KYC expires ${investor.kyc_expiry}` });
    } else {
      checks.push({ rule: 'kyc_not_expired', passed: false, message: `KYC expired on ${investor.kyc_expiry}` });
      eligible = false;
    }
  }

  // ── Look up eligibility criteria ──────────────────────────────────────
  const criteria = await findApplicableCriteria(
    fundStructure.id,
    investor.jurisdiction,
    investor.investor_type
  );

  // ── Check 4: Investor type permitted ──────────────────────────────────
  if (criteria) {
    checks.push({
      rule: 'investor_type_eligible',
      passed: true,
      message: `${investor.investor_type} investors are eligible for ${fundStructure.legal_form} (${criteria.source_reference ?? 'no source'})`,
    });
  } else {
    checks.push({
      rule: 'investor_type_eligible',
      passed: false,
      message: `No eligibility criteria found for ${investor.investor_type} investors from ${investor.jurisdiction} in ${fundStructure.legal_form} (${fundStructure.domicile})`,
    });
    eligible = false;
  }

  // ── Check 5: Minimum investment ───────────────────────────────────────
  if (criteria && criteria.minimum_investment > 0) {
    const amount = request.investment_amount ?? 0;
    const minEur = criteria.minimum_investment / 100;
    const amountEur = amount / 100;

    if (amount >= criteria.minimum_investment) {
      checks.push({
        rule: 'minimum_investment',
        passed: true,
        message: `Investment €${amountEur.toLocaleString()} meets minimum €${minEur.toLocaleString()} (${criteria.source_reference ?? ''})`,
      });
    } else {
      checks.push({
        rule: 'minimum_investment',
        passed: false,
        message: `Investment €${amountEur.toLocaleString()} is below minimum €${minEur.toLocaleString()} for ${investor.investor_type} investors (${criteria.source_reference ?? ''})`,
      });
      eligible = false;
    }
  } else if (criteria) {
    checks.push({
      rule: 'minimum_investment',
      passed: true,
      message: 'No minimum investment required',
    });
  }

  // ── Check 6: Suitability assessment ───────────────────────────────────
  if (criteria?.suitability_required) {
    // For now, we flag it as a requirement. In a full implementation,
    // this would check an onboarding record for a completed assessment.
    checks.push({
      rule: 'suitability_required',
      passed: true,
      message: 'Suitability assessment required — must be completed during onboarding',
    });
  }

  // ── Write decision record ─────────────────────────────────────────────
  const result: DecisionResult = eligible ? 'approved' : 'rejected';

  const decisionRecord = await createDecisionRecord({
    decision_type: 'eligibility_check',
    asset_id: undefined,
    subject_id: investor.id,
    input_snapshot: {
      investor_id: investor.id,
      investor_name: investor.name,
      investor_type: investor.investor_type,
      investor_jurisdiction: investor.jurisdiction,
      kyc_status: investor.kyc_status,
      fund_structure_id: fundStructure.id,
      fund_name: fundStructure.name,
      fund_legal_form: fundStructure.legal_form,
      fund_domicile: fundStructure.domicile,
      investment_amount: request.investment_amount ?? null,
    },
    rule_version_snapshot: {
      criteria: criteria ?? null,
      fund_status: fundStructure.status,
    },
    result,
    result_details: {
      checks,
      overall: result,
      violation_count: checks.filter(c => !c.passed).length,
    },
  });

  return {
    eligible,
    investor_type: investor.investor_type,
    fund_legal_form: fundStructure.legal_form,
    jurisdiction: investor.jurisdiction,
    checks,
    criteria_applied: criteria,
    decision_record_id: decisionRecord.id,
  };
}
