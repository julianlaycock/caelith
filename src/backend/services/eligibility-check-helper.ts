/**
 * Shared eligibility check logic used by:
 *   - eligibility-service (standalone eligibility checks)
 *   - onboarding-service (step 2: automated eligibility)
 *   - transfer-service (AIFMD checks on receiver)
 *
 * Produces a list of checks and resolved criteria without writing decision records.
 * Callers handle their own decision record writing and status transitions.
 */

import { findFundStructureById } from '../repositories/fund-structure-repository.js';
import { findApplicableCriteria } from '../repositories/eligibility-criteria-repository.js';
import { EligibilityCriteria, FundStructure, InvestorType, DecisionCheck } from '../models/index.js';

export interface EligibilityInput {
  investor: {
    investor_type: string;
    jurisdiction: string;
    kyc_status: string;
    kyc_expiry: string | null;
    classification_method?: string | null;
    classification_evidence?: unknown[] | null;
    classification_date?: string | null;
  };
  fundStructureId: string;
  /** Investment amount in cents (for comparison with criteria.minimum_investment) */
  investmentAmountCents?: number;
}

export interface EligibilityOutput {
  checks: DecisionCheck[];
  criteria: EligibilityCriteria | null;
  fundStructure: FundStructure | null;
  eligible: boolean;
}

/**
 * Run AIFMD eligibility checks against a fund structure.
 *
 * Checks performed (in order):
 *   1. Fund status is 'active'
 *   2. Investor type is eligible (criteria exist)
 *   3. Minimum investment threshold met
 *   4. Suitability assessment flag
 *   5. KYC is verified
 *   6. KYC is not expired
 */
export async function runCoreEligibilityChecks(input: EligibilityInput): Promise<EligibilityOutput> {
  const checks: DecisionCheck[] = [];
  let criteria: EligibilityCriteria | null = null;

  const fund = await findFundStructureById(input.fundStructureId);
  if (!fund) {
    return { checks, criteria, fundStructure: null, eligible: false };
  }

  // ── Check 1: Fund is open ─────────────────────────────────────────────
  if (fund.status === 'active') {
    checks.push({ rule: 'fund_status', passed: true, message: `Fund is ${fund.status}` });
  } else {
    checks.push({ rule: 'fund_status', passed: false, message: `Fund is ${fund.status}, not accepting new investors` });
    return { checks, criteria, fundStructure: fund, eligible: false };
  }

  // ── Check 2: Investor type eligibility (criteria lookup) ──────────────
  const investorType = (input.investor.investor_type || 'retail') as InvestorType;

  criteria = await findApplicableCriteria(
    input.fundStructureId,
    input.investor.jurisdiction,
    investorType
  );

  if (!criteria) {
    checks.push({
      rule: 'investor_type_eligible',
      passed: false,
      message: `No eligibility criteria found for ${investorType} investors from ${input.investor.jurisdiction} in ${fund.legal_form} (${fund.domicile})`,
    });
  } else {
    checks.push({
      rule: 'investor_type_eligible',
      passed: true,
      message: `${investorType} investors are eligible for ${fund.legal_form} (${criteria.source_reference ?? 'fund rules'})`,
    });

    // ── Check 3: Minimum investment ───────────────────────────────────────
    if (criteria.minimum_investment > 0) {
      const amountCents = input.investmentAmountCents ?? 0;
      const passed = amountCents >= criteria.minimum_investment;
      const minEuros = criteria.minimum_investment / 100;
      const amountEuros = amountCents / 100;
      checks.push({
        rule: 'minimum_investment',
        passed,
        message: passed
          ? `Investment \u20AC${amountEuros.toLocaleString()} meets minimum \u20AC${minEuros.toLocaleString()} (${criteria.source_reference ?? ''})`
          : `Investment \u20AC${amountEuros.toLocaleString()} is below minimum \u20AC${minEuros.toLocaleString()} for ${investorType} investors (${criteria.source_reference ?? ''})`,
      });
    } else {
      checks.push({
        rule: 'minimum_investment',
        passed: true,
        message: 'No minimum investment required',
      });
    }

    // ── Check 4: Suitability assessment ─────────────────────────────────
    if (criteria.suitability_required) {
      checks.push({
        rule: 'suitability_required',
        passed: true,
        message: `Suitability assessment required for ${investorType} investors in ${fund.legal_form}`,
      });
    }
  }

  // ── Check 4b: Classification evidence ────────────────────────────────
  if (investorType !== 'retail') {
    if (input.investor.classification_method) {
      checks.push({
        rule: 'classification_evidence',
        passed: true,
        message: `Investor classification method: ${input.investor.classification_method}`,
      });
    } else if (
      (!input.investor.classification_evidence || input.investor.classification_evidence.length === 0) &&
      !input.investor.classification_date
    ) {
      checks.push({
        rule: 'classification_evidence',
        passed: false,
        message: `No classification evidence on file for ${investorType} investor. Evidence of investor classification is required under applicable regulation (MiFID II Annex II, Loi SIF Art 2).`,
      });
    }
  }

  // ── Check 5: KYC verified ───────────────────────────────────────────
  const kycValid = input.investor.kyc_status === 'verified';
  checks.push({
    rule: 'kyc_valid',
    passed: kycValid,
    message: kycValid
      ? 'KYC verified'
      : `KYC status is '${input.investor.kyc_status}', must be 'verified'`,
  });

  // ── Check 6: KYC not expired ────────────────────────────────────────
  if (kycValid && input.investor.kyc_expiry) {
    const expiryDate = new Date(input.investor.kyc_expiry);
    const now = new Date();
    const notExpired = expiryDate > now;
    checks.push({
      rule: 'kyc_not_expired',
      passed: notExpired,
      message: notExpired
        ? `KYC expires ${expiryDate.toISOString().split('T')[0]}`
        : `KYC expired on ${expiryDate.toISOString().split('T')[0]}`,
    });
  }

  const violations = checks.filter(c => !c.passed);
  const eligible = violations.length === 0;

  return { checks, criteria, fundStructure: fund, eligible };
}
