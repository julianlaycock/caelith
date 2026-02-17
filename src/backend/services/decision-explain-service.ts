/**
 * Decision Explanation Service
 *
 * Generates structured, human-readable explanations of compliance decisions
 * with regulatory citations. Template-based (no LLM).
 */

import { findDecisionRecordById } from '../repositories/decision-record-repository.js';
import { DecisionRecord, DecisionCheck } from '../models/index.js';

// ============================================================================
// Types
// ============================================================================

export interface DecisionExplanation {
  decision_id: string;
  decision_type: string;
  result: string;
  decided_at: string;
  summary: string;
  context: {
    investor_name?: string;
    investor_type?: string;
    fund_name?: string;
    fund_legal_form?: string;
    investment_amount?: number;
    [key: string]: unknown;
  };
  checks: Array<{
    rule: string;
    passed: boolean;
    message: string;
    explanation: string;
    regulatory_basis: string | null;
    severity: 'pass' | 'fail' | 'warning';
  }>;
  violations: Array<{
    rule: string;
    explanation: string;
    regulatory_basis: string | null;
  }>;
  recommendation: string;
  disclaimer: string;
}

// ============================================================================
// Rule explanation mapping
// ============================================================================

const RULE_EXPLANATIONS: Record<string, { explanation: string; basis: string }> = {
  'fund_status': {
    explanation: 'The fund must be in active status to accept new investments or transfers.',
    basis: 'AIFMD Art 12(1)(d) — operational requirements for AIFMs',
  },
  'investor_type_eligible': {
    explanation: 'The investor\'s classification must match one of the permitted types for this fund structure and jurisdiction.',
    basis: 'AIFMD Art 4(1)(ag-aj), MiFID II Annex II — investor categorization',
  },
  'minimum_investment': {
    explanation: 'The investment amount must meet the regulatory minimum threshold for the investor\'s classification in this jurisdiction.',
    basis: 'Jurisdiction-specific: LU SIF Law Art 2 (€125K well-informed investor), KAGB §1(19) Nr. 33a (€200K semi-professional), CBI SI 257/2013 (€100K qualifying investor)',
  },
  'suitability_required': {
    explanation: 'A suitability assessment is required for this investor type before proceeding.',
    basis: 'ELTIF Regulation (EU) 2023/606 Art 30, MiFID II Art 25(2)',
  },
  'kyc_valid': {
    explanation: 'The investor must have completed KYC verification with status "verified".',
    basis: 'AMLD 4/5/6, AIFMD Art 12(1)(e) — due diligence obligations',
  },
  'kyc_not_expired': {
    explanation: 'KYC verification must be current (not expired). Periodic re-verification is required.',
    basis: 'AMLD Art 14(5) — ongoing monitoring and periodic review',
  },
  'classification_evidence': {
    explanation: 'Classification evidence documents the basis for the investor\'s regulatory categorization.',
    basis: 'MiFID II Art 16(6)-(7), AIFMD Art 22 — record-keeping requirements',
  },
  'self_transfer': {
    explanation: 'Transfers to the same investor are prohibited.',
    basis: 'Internal control policy',
  },
  'positive_units': {
    explanation: 'Transfer units must be a positive number.',
    basis: 'Internal control policy',
  },
  'sufficient_units': {
    explanation: 'The sender must hold enough units to complete the transfer.',
    basis: 'Internal control policy — settlement integrity',
  },
  'qualification': {
    explanation: 'The recipient must be an accredited/qualified investor as required by the fund rules.',
    basis: 'Fund prospectus/LPA terms, AIFMD Art 4(1)',
  },
  'lockup_period': {
    explanation: 'Units cannot be transferred during the lockup period after acquisition.',
    basis: 'Fund prospectus/LPA terms — transfer restrictions',
  },
  'jurisdiction_whitelist': {
    explanation: 'The recipient\'s jurisdiction must be in the approved list for this fund.',
    basis: 'AIFMD Art 35-37 — marketing passport restrictions',
  },
  'transfer_whitelist': {
    explanation: 'The recipient must be on the approved transfer whitelist for this asset.',
    basis: 'Fund prospectus/LPA terms — pre-approved transferees',
  },
  'investor_type_whitelist': {
    explanation: 'The recipient\'s investor classification must be in the permitted types for this asset.',
    basis: 'AIFMD Art 4(1)(ag-aj) — investor categorization requirements',
  },
  'kyc_required': {
    explanation: 'The recipient must have valid, non-expired KYC verification.',
    basis: 'AMLD 4/5/6, AIFMD Art 12(1)(e)',
  },
  'maximum_investors': {
    explanation: 'The maximum number of distinct investors for this asset has been reached.',
    basis: 'Fund prospectus/LPA terms, regulatory investor limits',
  },
  'concentration_limit': {
    explanation: 'The transfer would cause the recipient to exceed the maximum ownership concentration.',
    basis: 'AIFMD Art 14(1), ESMA Guidelines 2014/937 — risk diversification',
  },
  'leverage_compliance': {
    explanation: 'The fund\'s current leverage exceeds the defined limit. New investments may increase systemic risk.',
    basis: 'AIFMD Art 25(3), AIFMD II Art 15(4-5), ESMA Leverage Guidelines',
  },
};

const DISCLAIMER = 'This explanation is generated by the Caelith Compliance Engine for informational purposes. It does not constitute legal or regulatory advice. Consult qualified legal counsel for definitive compliance guidance.';

// ============================================================================
// Main function
// ============================================================================

export async function explainDecision(decisionId: string): Promise<DecisionExplanation> {
  const record = await findDecisionRecordById(decisionId);
  if (!record) {
    const err = new Error(`Decision record not found: ${decisionId}`) as Error & { status?: number };
    err.status = 404;
    throw err;
  }

  const inputSnapshot = record.input_snapshot as Record<string, unknown>;
  const resultDetails = record.result_details;
  const rawChecks: DecisionCheck[] = resultDetails?.checks ?? [];

  // Extract context from input_snapshot
  const context: DecisionExplanation['context'] = {};
  if (inputSnapshot.investor_name) context.investor_name = String(inputSnapshot.investor_name);
  if (inputSnapshot.investor_type) context.investor_type = String(inputSnapshot.investor_type);
  if (inputSnapshot.fund_name) context.fund_name = String(inputSnapshot.fund_name);
  if (inputSnapshot.fund_legal_form) context.fund_legal_form = String(inputSnapshot.fund_legal_form);
  if (inputSnapshot.investment_amount != null) context.investment_amount = Number(inputSnapshot.investment_amount);

  // Also check nested structures
  const investor = inputSnapshot.investor as Record<string, unknown> | undefined;
  if (investor) {
    if (!context.investor_name && investor.name) context.investor_name = String(investor.name);
    if (!context.investor_type && investor.investor_type) context.investor_type = String(investor.investor_type);
  }
  const fund = inputSnapshot.fund as Record<string, unknown> | undefined;
  if (fund) {
    if (!context.fund_name && fund.name) context.fund_name = String(fund.name);
    if (!context.fund_legal_form && fund.legal_form) context.fund_legal_form = String(fund.legal_form);
  }

  // Build enriched checks
  const checks = rawChecks.map((check) => {
    const ruleInfo = RULE_EXPLANATIONS[check.rule];
    return {
      rule: check.rule,
      passed: check.passed,
      message: check.message,
      explanation: ruleInfo?.explanation ?? `Check "${check.rule}" was evaluated.`,
      regulatory_basis: ruleInfo?.basis ?? null,
      severity: (check.passed ? 'pass' : 'fail') as 'pass' | 'fail' | 'warning',
    };
  });

  // Extract violations
  const violations = checks
    .filter((c) => !c.passed)
    .map((c) => ({
      rule: c.rule,
      explanation: c.explanation,
      regulatory_basis: c.regulatory_basis,
    }));

  // Generate summary
  const summary = generateSummary(record, context, violations.length);

  // Generate recommendation
  const recommendation = generateRecommendation(violations);

  return {
    decision_id: record.id,
    decision_type: record.decision_type,
    result: record.result,
    decided_at: record.decided_at,
    summary,
    context,
    checks,
    violations,
    recommendation,
    disclaimer: DISCLAIMER,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function generateSummary(
  record: DecisionRecord,
  context: DecisionExplanation['context'],
  violationCount: number,
): string {
  const resultUpper = record.result.toUpperCase();
  const investorName = context.investor_name ?? 'Unknown investor';
  const fundName = context.fund_name ?? 'Unknown fund';
  const legalForm = context.fund_legal_form;

  switch (record.decision_type) {
    case 'eligibility_check': {
      const formPart = legalForm ? ` (${legalForm})` : '';
      return `Eligibility check for ${investorName} in ${fundName}${formPart} was ${resultUpper}.`;
    }
    case 'transfer_validation': {
      const violPart = violationCount > 0 ? ` ${violationCount} violation(s) found.` : '';
      return `Transfer validation was ${resultUpper}.${violPart}`;
    }
    case 'onboarding_approval':
      return `Onboarding application for ${investorName} was ${resultUpper}.`;
    default:
      return `Decision (${record.decision_type}) was ${resultUpper}.`;
  }
}

function generateRecommendation(
  violations: Array<{ rule: string; explanation: string; regulatory_basis: string | null }>,
): string {
  if (violations.length === 0) {
    return 'All compliance checks passed. No further action required.';
  }

  const recs: string[] = [];
  const rules = new Set(violations.map((v) => v.rule));

  if (rules.has('kyc_valid') || rules.has('kyc_not_expired') || rules.has('kyc_required')) {
    recs.push('Investor must complete KYC verification before re-attempting.');
  }
  if (rules.has('investor_type_eligible') || rules.has('investor_type_whitelist')) {
    recs.push('Investor classification does not meet fund requirements. Consider reclassification if investor meets criteria.');
  }
  if (rules.has('minimum_investment')) {
    recs.push('Increase investment amount to meet the minimum threshold.');
  }

  // Fallback for unrecognized violations
  if (recs.length === 0) {
    recs.push('Review the failing compliance checks and address the identified violations before re-attempting.');
  }

  return recs.join('; ');
}
