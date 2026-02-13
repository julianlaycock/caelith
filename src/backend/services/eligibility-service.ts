import {
  EligibilityCheckRequest,
  EligibilityCheckResult,
} from '../models/index.js';
import { findInvestorById } from '../repositories/investor-repository.js';
import { NotFoundError } from '../errors.js';
import { runCoreEligibilityChecks } from './eligibility-check-helper.js';
import { recordDecision } from './decision-record-helper.js';

/**
 * Check whether an investor is eligible to invest in a fund.
 * Writes a decision record for every check (approved or rejected).
 *
 * Delegates the core eligibility checks to the shared helper and then
 * persists a decision record (which is specific to this service entry-point).
 */
export async function checkEligibility(request: EligibilityCheckRequest): Promise<EligibilityCheckResult> {
  // ── Load & validate investor ───────────────────────────────────────────
  const investor = await findInvestorById(request.investor_id);
  if (!investor) {
    throw new NotFoundError('Investor', request.investor_id);
  }

  // ── Run shared eligibility checks ──────────────────────────────────────
  const { checks, criteria, fundStructure, eligible } = await runCoreEligibilityChecks({
    investor: {
      investor_type: investor.investor_type,
      jurisdiction: investor.jurisdiction,
      kyc_status: investor.kyc_status,
      kyc_expiry: investor.kyc_expiry,
    },
    fundStructureId: request.fund_structure_id,
    investmentAmountCents: request.investment_amount,
  });

  if (!fundStructure) {
    throw new NotFoundError('Fund structure', request.fund_structure_id);
  }

  // ── Write decision record ─────────────────────────────────────────────
  const decisionRecord = await recordDecision({
    decisionType: 'eligibility_check',
    assetId: undefined,
    subjectId: investor.id,
    inputSnapshot: {
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
    ruleVersionSnapshot: {
      criteria: criteria ?? null,
      fund_status: fundStructure.status,
    },
    checks,
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
