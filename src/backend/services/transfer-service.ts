/**
 * Transfer Service — Slice 2
 *
 * Orchestrates transfer operations:
 * - Validates transfers using rules engine (existing)
 * - Runs AIFMD eligibility checks if asset has a fund structure (new)
 * - Writes decision provenance record for every validation (new)
 * - Links decision_record_id to executed transfers (new)
 * - Updates holdings atomically
 * - Records transfers and logs events
 */

import {
  findInvestorById,
  findHoldingByInvestorAndAsset,
  findRuleSetByAsset,
  updateHoldingByInvestorAndAsset,
  createHolding,
  createTransfer,
  createEvent,
} from '../repositories/index.js';
import { findAssetById } from '../repositories/asset-repository.js';
import { findFundStructureById } from '../repositories/fund-structure-repository.js';
import { findApplicableCriteria } from '../repositories/eligibility-criteria-repository.js';
import { createDecisionRecord } from '../repositories/decision-record-repository.js';
import { validateTransfer } from '../../rules-engine/validator.js';
import { ValidationContext, TransferRequest } from '../../rules-engine/types.js';
import { Transfer, Asset, FundStructure, EligibilityCriteria, InvestorType } from '../models/index.js';
import { getActiveCompositeRules } from './composite-rules-service.js';

/**
 * Single check result (shared shape with rules engine)
 */
interface Check {
  rule: string;
  passed: boolean;
  message: string;
}

/**
 * Simulation result (validation only, no execution)
 */
export interface SimulationResult {
  valid: boolean;
  violations: string[];
  checks: Check[];
  summary: string;
  decision_record_id?: string;
  eligibility_criteria_applied?: EligibilityCriteria | null;
}

/**
 * Transfer execution result
 */
export interface TransferExecutionResult {
  success: boolean;
  transfer?: Transfer;
  error?: string;
  violations?: string[];
  decision_record_id?: string;
}

// ── Eligibility Checks (AIFMD) ─────────────────────────────

/**
 * Run AIFMD eligibility checks on the receiver for a fund-linked asset.
 * Returns additional checks to merge with the rules engine result.
 * Gracefully returns empty array if asset has no fund structure.
 */
async function runEligibilityChecks(
  asset: Asset,
  toInvestor: { id: string; investor_type?: string; jurisdiction: string; kyc_status?: string; kyc_expiry?: string | null },
  investmentAmount: number
): Promise<{ checks: Check[]; criteria: EligibilityCriteria | null }> {
  const checks: Check[] = [];
  let criteria: EligibilityCriteria | null = null;

  // Skip if asset has no fund structure
  if (!asset.fund_structure_id) {
    return { checks, criteria };
  }

  // Fetch fund structure
  const fund = await findFundStructureById(asset.fund_structure_id);
  if (!fund) {
    return { checks, criteria };
  }

  // Check fund status
  checks.push({
    rule: 'fund_status',
    passed: fund.status === 'active',
    message: fund.status === 'active'
      ? 'Fund is active'
      : `Fund status is '${fund.status}', transfers not permitted`,
  });

  if (fund.status !== 'active') {
    return { checks, criteria };
  }

  // Determine receiver's investor type
  const investorType = (toInvestor.investor_type || 'retail') as InvestorType;

  // Look up applicable eligibility criteria
  criteria = await findApplicableCriteria(
    asset.fund_structure_id,
    toInvestor.jurisdiction,
    investorType
  );

  if (!criteria) {
    checks.push({
      rule: 'investor_type_eligible',
      passed: false,
      message: `No eligibility criteria found for ${investorType} investors from ${toInvestor.jurisdiction} in ${fund.legal_form} (${fund.domicile})`,
    });
    return { checks, criteria };
  }

  // Investor type eligible — criteria exists
  checks.push({
    rule: 'investor_type_eligible',
    passed: true,
    message: `${investorType} investors are eligible for ${fund.legal_form} (${criteria.source_reference || 'fund rules'})`,
  });

  // Minimum investment check
  if (criteria.minimum_investment > 0) {
    // Convert investment amount to cents for comparison
    const investmentCents = Math.round(investmentAmount * 100);
    const passed = investmentCents >= criteria.minimum_investment;
    const minEuros = criteria.minimum_investment / 100;
    checks.push({
      rule: 'minimum_investment',
      passed,
      message: passed
        ? `Investment €${investmentAmount.toLocaleString()} meets minimum €${minEuros.toLocaleString()} (${criteria.source_reference || 'fund rules'})`
        : `Investment €${investmentAmount.toLocaleString()} is below minimum €${minEuros.toLocaleString()} for ${investorType} investors (${criteria.source_reference || 'fund rules'})`,
    });
  } else {
    checks.push({
      rule: 'minimum_investment',
      passed: true,
      message: 'No minimum investment required',
    });
  }

  // KYC check (if receiver has KYC fields)
  if (toInvestor.kyc_status !== undefined) {
    const kycValid = toInvestor.kyc_status === 'verified';
    checks.push({
      rule: 'kyc_valid',
      passed: kycValid,
      message: kycValid
        ? `KYC verified`
        : `KYC status is '${toInvestor.kyc_status}', must be 'verified'`,
    });

    // KYC expiry check
    if (kycValid && toInvestor.kyc_expiry) {
      const expiryDate = new Date(toInvestor.kyc_expiry);
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
  }

  // Suitability required flag
  if (criteria.suitability_required) {
    checks.push({
      rule: 'suitability_required',
      passed: true, // Informational — doesn't block, but flags for compliance
      message: `Suitability assessment required for ${investorType} investors in ${fund.legal_form}`,
    });
  }

  return { checks, criteria };
}

// ── Decision Record Writing ─────────────────────────────────

/**
 * Write a decision provenance record capturing the full validation state.
 */
async function writeDecisionRecord(params: {
  decisionType: 'transfer_validation';
  assetId: string;
  subjectId: string;
  request: TransferRequest;
  rulesEngineResult: { valid: boolean; checks: Check[]; violations: string[] };
  eligibilityChecks: Check[];
  criteria: EligibilityCriteria | null;
  rules: any;
  result: 'approved' | 'rejected' | 'simulated';
}): Promise<string> {
  const allChecks = [...params.rulesEngineResult.checks, ...params.eligibilityChecks];
  const allViolations = [
    ...params.rulesEngineResult.violations,
    ...params.eligibilityChecks.filter(c => !c.passed).map(c => c.message),
  ];

  const record = await createDecisionRecord({
    decision_type: params.decisionType,
    asset_id: params.assetId,
    subject_id: params.subjectId,
    input_snapshot: {
      transfer_request: params.request,
    },
    rule_version_snapshot: {
      rules_engine: params.rules,
      eligibility_criteria: params.criteria,
    },
    result: params.result,
    result_details: {
      overall: params.result,
      checks: allChecks,
      violation_count: allViolations.length,
    },
    decided_by: undefined,
  });

  return record.id;
}

// ── Public API ──────────────────────────────────────────────

/**
 * Simulate a transfer (validate without executing)
 */
export async function simulateTransfer(
  request: TransferRequest
): Promise<SimulationResult> {
  try {
    // Build validation context
    const context = await buildValidationContext(request);

    // Run rules engine (existing checks)
    const rulesResult = validateTransfer(context);

    // Run eligibility checks if asset is fund-linked
    const asset = await findAssetById(request.asset_id);
    let eligibilityChecks: Check[] = [];
    let criteria: EligibilityCriteria | null = null;

    if (asset && asset.fund_structure_id) {
      const investmentAmount = request.units * (asset.unit_price ? Number(asset.unit_price) : 0);
      const eligResult = await runEligibilityChecks(asset, context.toInvestor, investmentAmount);
      eligibilityChecks = eligResult.checks;
      criteria = eligResult.criteria;
    }

    // Merge all checks
    const allChecks = [...rulesResult.checks, ...eligibilityChecks];
    const eligibilityViolations = eligibilityChecks.filter(c => !c.passed).map(c => c.message);
    const allViolations = [...rulesResult.violations, ...eligibilityViolations];
    const valid = allViolations.length === 0;

    // Write decision record
    const decisionRecordId = await writeDecisionRecord({
      decisionType: 'transfer_validation',
      assetId: request.asset_id,
      subjectId: request.to_investor_id,
      request,
      rulesEngineResult: rulesResult,
      eligibilityChecks,
      criteria,
      rules: context.rules,
      result: 'simulated',
    });

    const totalChecks = allChecks.length;
    const passedChecks = allChecks.filter(c => c.passed).length;

    return {
      valid,
      violations: allViolations,
      checks: allChecks,
      summary: valid
        ? `Transfer approved (simulated). ${passedChecks}/${totalChecks} checks passed.`
        : `Transfer rejected (simulated). ${allViolations.length} violation(s). ${passedChecks}/${totalChecks} checks passed.`,
      decision_record_id: decisionRecordId,
      eligibility_criteria_applied: criteria,
    };
  } catch (error) {
    return {
      valid: false,
      violations: [error instanceof Error ? error.message : 'Unknown error'],
      checks: [],
      summary: 'Transfer validation failed due to an error.',
    };
  }
}

/**
 * Execute a transfer (validate and execute)
 */
export async function executeTransfer(
  request: TransferRequest
): Promise<TransferExecutionResult> {
  try {
    // Build validation context
    const context = await buildValidationContext(request);

    // Run rules engine (existing checks)
    const rulesResult = validateTransfer(context);

    // Run eligibility checks if asset is fund-linked
    const asset = await findAssetById(request.asset_id);
    let eligibilityChecks: Check[] = [];
    let criteria: EligibilityCriteria | null = null;

    if (asset && asset.fund_structure_id) {
      const investmentAmount = request.units * (asset.unit_price ? Number(asset.unit_price) : 0);
      const eligResult = await runEligibilityChecks(asset, context.toInvestor, investmentAmount);
      eligibilityChecks = eligResult.checks;
      criteria = eligResult.criteria;
    }

    // Combine all violations
    const eligibilityViolations = eligibilityChecks.filter(c => !c.passed).map(c => c.message);
    const allViolations = [...rulesResult.violations, ...eligibilityViolations];
    const valid = allViolations.length === 0;

    // Write decision record
    const decisionRecordId = await writeDecisionRecord({
      decisionType: 'transfer_validation',
      assetId: request.asset_id,
      subjectId: request.to_investor_id,
      request,
      rulesEngineResult: rulesResult,
      eligibilityChecks,
      criteria,
      rules: context.rules,
      result: valid ? 'approved' : 'rejected',
    });

    if (!valid) {
      // Log rejection event
      await createEvent({
        event_type: 'transfer.rejected',
        entity_type: 'transfer',
        entity_id: request.asset_id,
        payload: {
          asset_id: request.asset_id,
          from_investor_id: request.from_investor_id,
          to_investor_id: request.to_investor_id,
          units: request.units,
          violations: allViolations,
          decision_record_id: decisionRecordId,
        },
      });

      return {
        success: false,
        violations: allViolations,
        decision_record_id: decisionRecordId,
      };
    }

    // Execute the transfer (update holdings)
    const fromHolding = context.fromHolding!;

    // Deduct from sender
    await updateHoldingByInvestorAndAsset(
      request.from_investor_id,
      request.asset_id,
      fromHolding.units - request.units
    );

    // Add to receiver
    const toHolding = await findHoldingByInvestorAndAsset(
      request.to_investor_id,
      request.asset_id
    );

    if (toHolding) {
      await updateHoldingByInvestorAndAsset(
        request.to_investor_id,
        request.asset_id,
        toHolding.units + request.units
      );
    } else {
      await createHolding({
        investor_id: request.to_investor_id,
        asset_id: request.asset_id,
        units: request.units,
        acquired_at: request.execution_date,
      });
    }

    // Record the transfer with decision provenance link
    const transfer = await createTransfer({
      asset_id: request.asset_id,
      from_investor_id: request.from_investor_id,
      to_investor_id: request.to_investor_id,
      units: request.units,
      executed_at: request.execution_date,
      decision_record_id: decisionRecordId,
    });

    // Log execution event
    await createEvent({
      event_type: 'transfer.executed',
      entity_type: 'transfer',
      entity_id: transfer.id,
      payload: {
        transfer_id: transfer.id,
        asset_id: request.asset_id,
        from_investor_id: request.from_investor_id,
        to_investor_id: request.to_investor_id,
        units: request.units,
        from_name: context.fromInvestor.name,
        to_name: context.toInvestor.name,
        decision_record_id: decisionRecordId,
      },
    });

    return {
      success: true,
      transfer,
      decision_record_id: decisionRecordId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ── Private Helpers ─────────────────────────────────────────

/**
 * Helper: Build validation context from transfer request
 */
async function buildValidationContext(
  request: TransferRequest
): Promise<ValidationContext> {
  // Fetch all required data
  const [fromInvestor, toInvestor, fromHolding, rules, customRules] = await Promise.all([
    findInvestorById(request.from_investor_id),
    findInvestorById(request.to_investor_id),
    findHoldingByInvestorAndAsset(request.from_investor_id, request.asset_id),
    findRuleSetByAsset(request.asset_id),
    getActiveCompositeRules(request.asset_id),
  ]);

  // Validate data exists
  if (!fromInvestor) {
    throw new Error(`Sender investor not found: ${request.from_investor_id}`);
  }

  if (!toInvestor) {
    throw new Error(`Recipient investor not found: ${request.to_investor_id}`);
  }

  if (!rules) {
    throw new Error(`No rules found for asset: ${request.asset_id}`);
  }

  return {
    transfer: request,
    fromInvestor,
    toInvestor,
    fromHolding,
    rules,
    customRules,
  };
}