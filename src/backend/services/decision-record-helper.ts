/**
 * Decision Record Helper
 *
 * Reduces boilerplate when creating decision records across services.
 * Automatically computes violations, overall result, and result_details
 * from an array of checks.
 */

import { createDecisionRecord } from '../repositories/decision-record-repository.js';
import { DecisionRecord, DecisionType, DecisionResult, DecisionCheck } from '../models/index.js';

export interface DecisionRecordParams {
  decisionType: DecisionType;
  assetId?: string;
  subjectId: string;
  inputSnapshot: Record<string, unknown>;
  ruleVersionSnapshot: Record<string, unknown>;
  checks: DecisionCheck[];
  decidedBy?: string;
}

/**
 * Create a decision record where the result (approved/rejected) is
 * automatically derived from the checks: all passed = approved,
 * any failure = rejected.
 */
export async function recordDecision(params: DecisionRecordParams): Promise<DecisionRecord> {
  const violations = params.checks.filter(c => !c.passed);
  const result: DecisionResult = violations.length === 0 ? 'approved' : 'rejected';

  return createDecisionRecord({
    decision_type: params.decisionType,
    asset_id: params.assetId,
    subject_id: params.subjectId,
    input_snapshot: params.inputSnapshot,
    rule_version_snapshot: params.ruleVersionSnapshot,
    result,
    result_details: {
      checks: params.checks,
      overall: result,
      violation_count: violations.length,
    },
    decided_by: params.decidedBy,
  });
}

/**
 * Create a decision record with an explicit result value.
 * Use this when the result is not simply derived from checks
 * (e.g., 'simulated' for dry-run transfers, or manual review decisions).
 */
export async function recordDecisionWithResult(
  params: DecisionRecordParams & { result: DecisionResult }
): Promise<DecisionRecord> {
  const violations = params.checks.filter(c => !c.passed);

  return createDecisionRecord({
    decision_type: params.decisionType,
    asset_id: params.assetId,
    subject_id: params.subjectId,
    input_snapshot: params.inputSnapshot,
    rule_version_snapshot: params.ruleVersionSnapshot,
    result: params.result,
    result_details: {
      checks: params.checks,
      overall: params.result,
      violation_count: violations.length,
    },
    decided_by: params.decidedBy,
  });
}
