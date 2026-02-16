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
  createTransfer,
  createEvent,
} from '../repositories/index.js';
import { findAssetById } from '../repositories/asset-repository.js';
import { randomUUID } from 'crypto';
import { runCoreEligibilityChecks } from './eligibility-check-helper.js';
import { validateTransfer } from '../../rules-engine/validator.js';
import { ValidationContext, TransferRequest, FundContext, AssetAggregates } from '../../rules-engine/types.js';
import { Transfer, Asset, EligibilityCriteria } from '../models/index.js';
import { NotFoundError, BusinessLogicError } from '../errors.js';
import { getActiveCompositeRules } from './composite-rules-service.js';
import { withTransaction } from './transaction-helper.js';
import { recordDecisionWithResult } from './decision-record-helper.js';
import { query } from '../db.js';

/** Configurable threshold — transfers above this require approval */
const APPROVAL_THRESHOLD_UNITS = Number(process.env.TRANSFER_APPROVAL_THRESHOLD || 10000);

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
  // Skip if asset has no fund structure
  if (!asset.fund_structure_id) {
    return { checks: [], criteria: null };
  }

  // Delegate to the shared eligibility check helper
  const result = await runCoreEligibilityChecks({
    investor: {
      investor_type: toInvestor.investor_type || 'retail',
      jurisdiction: toInvestor.jurisdiction,
      kyc_status: toInvestor.kyc_status || 'pending',
      kyc_expiry: toInvestor.kyc_expiry ?? null,
    },
    fundStructureId: asset.fund_structure_id,
    investmentAmountCents: Math.round(investmentAmount * 100),
  });

  // Map helper checks back to the local Check interface (compatible shape)
  const checks: Check[] = result.checks.map(c => ({
    rule: c.rule,
    passed: c.passed,
    message: c.message,
  }));

  return { checks, criteria: result.criteria };
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
    const decisionRecord = await recordDecisionWithResult({
      decisionType: 'transfer_validation',
      assetId: request.asset_id,
      subjectId: request.to_investor_id,
      inputSnapshot: {
        transfer_request: request,
      },
      ruleVersionSnapshot: {
        rules_engine: context.rules,
        eligibility_criteria: criteria,
      },
      checks: allChecks,
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
      decision_record_id: decisionRecord.id,
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
    const allChecks = [...rulesResult.checks, ...eligibilityChecks];
    const decisionRecord = await recordDecisionWithResult({
      decisionType: 'transfer_validation',
      assetId: request.asset_id,
      subjectId: request.to_investor_id,
      inputSnapshot: {
        transfer_request: request,
      },
      ruleVersionSnapshot: {
        rules_engine: context.rules,
        eligibility_criteria: criteria,
      },
      checks: allChecks,
      result: valid ? 'approved' : 'rejected',
    });
    const decisionRecordId = decisionRecord.id;

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

    const approvalReason = needsApproval(request.units, context.toInvestor);
    if (approvalReason) {
      const pendingTransfer = await createTransfer({
        asset_id: request.asset_id,
        from_investor_id: request.from_investor_id,
        to_investor_id: request.to_investor_id,
        units: request.units,
        executed_at: request.execution_date,
        decision_record_id: decisionRecordId,
        status: 'pending_approval',
        pending_reason: approvalReason,
      });

      await createEvent({
        event_type: 'transfer.pending_approval',
        entity_type: 'transfer',
        entity_id: pendingTransfer.id,
        payload: {
          transfer_id: pendingTransfer.id,
          asset_id: request.asset_id,
          from_investor_id: request.from_investor_id,
          to_investor_id: request.to_investor_id,
          units: request.units,
          reason: approvalReason,
          decision_record_id: decisionRecordId,
        },
      });

      return {
        success: true,
        transfer: pendingTransfer,
        decision_record_id: decisionRecordId,
      };
    }

    // Execute the transfer atomically within a database transaction
    const transfer = await withTransaction<Transfer | null>(async (client) => {
      // Lock sender's holding row to prevent concurrent modifications
      const lockResult = await client.query(
        `SELECT units FROM holdings WHERE investor_id = $1 AND asset_id = $2 FOR UPDATE`,
        [request.from_investor_id, request.asset_id]
      );

      if (lockResult.rows.length === 0 || lockResult.rows[0].units < request.units) {
        return null; // signal insufficient units — transaction will be committed (no-op)
      }

      const currentUnits = lockResult.rows[0].units;
      const now = new Date().toISOString();

      // Deduct from sender
      await client.query(
        `UPDATE holdings SET units = $1, updated_at = $2 WHERE investor_id = $3 AND asset_id = $4`,
        [currentUnits - request.units, now, request.from_investor_id, request.asset_id]
      );

      // Add to receiver (lock if exists, insert if not)
      const receiverResult = await client.query(
        `SELECT id, units FROM holdings WHERE investor_id = $1 AND asset_id = $2 FOR UPDATE`,
        [request.to_investor_id, request.asset_id]
      );

      if (receiverResult.rows.length > 0) {
        await client.query(
          `UPDATE holdings SET units = $1, updated_at = $2 WHERE investor_id = $3 AND asset_id = $4`,
          [receiverResult.rows[0].units + request.units, now, request.to_investor_id, request.asset_id]
        );
      } else {
        const holdingId = randomUUID();
        await client.query(
          `INSERT INTO holdings (id, investor_id, asset_id, units, acquired_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [holdingId, request.to_investor_id, request.asset_id, request.units, request.execution_date, now, now]
        );
      }

      // Create transfer record INSIDE the transaction for audit integrity
      const transferId = randomUUID();
      const transferNow = new Date().toISOString();
      await client.query(
        `INSERT INTO transfers (id, asset_id, from_investor_id, to_investor_id, units, executed_at, decision_record_id, created_at, status, approved_by, approved_at, rejection_reason, pending_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'executed', NULL, NULL, NULL, NULL)`,
        [transferId, request.asset_id, request.from_investor_id, request.to_investor_id, request.units, request.execution_date, decisionRecordId, transferNow]
      );

      // Build transfer object from what we just inserted
      return {
        id: transferId,
        asset_id: request.asset_id,
        from_investor_id: request.from_investor_id,
        to_investor_id: request.to_investor_id,
        units: request.units,
        executed_at: request.execution_date,
        decision_record_id: decisionRecordId,
        created_at: transferNow,
        status: 'executed',
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        pending_reason: null,
      } as Transfer;
    });

    if (!transfer) {
      return {
        success: false,
        error: 'Insufficient units (concurrent modification detected)',
        decision_record_id: decisionRecordId,
      };
    }

    // Log execution event (outside transaction — non-critical)
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

// ── Approval Workflow ───────────────────────────────────────

/**
 * Determine if a transfer requires manual approval.
 * Returns a reason string if approval is needed, null otherwise.
 */
function needsApproval(
  units: number,
  toInvestor: { kyc_expiry?: string | null }
): string | null {
  if (units > APPROVAL_THRESHOLD_UNITS) {
    return `Transfer exceeds ${APPROVAL_THRESHOLD_UNITS} unit threshold (${units} units)`;
  }

  if (toInvestor.kyc_expiry) {
    const expiry = new Date(toInvestor.kyc_expiry);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (expiry <= thirtyDaysFromNow) {
      return `Receiving investor KYC expires within 30 days (${toInvestor.kyc_expiry})`;
    }
  }

  return null;
}

/**
 * Get all transfers pending approval for a tenant.
 */
export async function getPendingTransfers(_tenantId: string): Promise<Transfer[]> {
  const rows = await query<Transfer & { from_name?: string; to_name?: string; asset_name?: string }>(
    `SELECT t.*,
       fi.name as from_name,
       ti.name as to_name,
       a.name as asset_name
     FROM transfers t
     LEFT JOIN investors fi ON fi.id = t.from_investor_id
     LEFT JOIN investors ti ON ti.id = t.to_investor_id
     LEFT JOIN assets a ON a.id = t.asset_id
     WHERE t.status = 'pending_approval'
     ORDER BY t.created_at DESC`,
    []
  );
  return rows;
}

/**
 * Approve a pending transfer — executes it atomically.
 */
export async function approveTransfer(
  transferId: string,
  userId: string,
  _tenantId: string
): Promise<Transfer> {
  // Fetch the pending transfer
  const rows = await query<Transfer>(
    `SELECT * FROM transfers WHERE id = $1 AND status = 'pending_approval'`,
    [transferId]
  );
  if (rows.length === 0) {
    throw new NotFoundError('Pending transfer', transferId);
  }
  const pending = rows[0];

  // Execute the transfer atomically
  const result = await withTransaction<Transfer>(async (client) => {
    // Lock sender's holding
    const lockResult = await client.query(
      `SELECT units FROM holdings WHERE investor_id = $1 AND asset_id = $2 FOR UPDATE`,
      [pending.from_investor_id, pending.asset_id]
    );

    if (lockResult.rows.length === 0 || lockResult.rows[0].units < pending.units) {
      throw new BusinessLogicError('Insufficient units (balance changed since submission)');
    }

    const now = new Date().toISOString();

    // Deduct from sender
    await client.query(
      `UPDATE holdings SET units = units - $1, updated_at = $2 WHERE investor_id = $3 AND asset_id = $4`,
      [pending.units, now, pending.from_investor_id, pending.asset_id]
    );

    // Add to receiver
    const receiverResult = await client.query(
      `SELECT id, units FROM holdings WHERE investor_id = $1 AND asset_id = $2 FOR UPDATE`,
      [pending.to_investor_id, pending.asset_id]
    );

    if (receiverResult.rows.length > 0) {
      await client.query(
        `UPDATE holdings SET units = units + $1, updated_at = $2 WHERE investor_id = $3 AND asset_id = $4`,
        [pending.units, now, pending.to_investor_id, pending.asset_id]
      );
    } else {
      const holdingId = randomUUID();
      await client.query(
        `INSERT INTO holdings (id, investor_id, asset_id, units, acquired_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [holdingId, pending.to_investor_id, pending.asset_id, pending.units, now, now, now]
      );
    }

    // Mark transfer as executed
    const updated = await client.query(
      `UPDATE transfers SET status = 'executed', approved_by = $1, approved_at = $2, executed_at = $2
       WHERE id = $3 RETURNING *`,
      [userId, now, transferId]
    );

    return updated.rows[0] as Transfer;
  });

  await createEvent({
    event_type: 'transfer.executed',
    entity_type: 'transfer',
    entity_id: transferId,
    payload: { transfer_id: transferId, approved_by: userId },
  });

  return result;
}

/**
 * Reject a pending transfer.
 */
export async function rejectTransfer(
  transferId: string,
  reason: string,
  userId: string,
  _tenantId: string
): Promise<Transfer> {
  const rows = await query<Transfer>(
    `UPDATE transfers SET status = 'rejected', rejection_reason = $1, approved_by = $2, approved_at = NOW()
     WHERE id = $3 AND status = 'pending_approval' RETURNING *`,
    [reason, userId, transferId]
  );
  if (rows.length === 0) {
    throw new NotFoundError('Pending transfer', transferId);
  }

  await createEvent({
    event_type: 'transfer.rejected',
    entity_type: 'transfer',
    entity_id: transferId,
    payload: { transfer_id: transferId, rejected_by: userId, reason },
  });

  return rows[0];
}

// ── Private Helpers ─────────────────────────────────────────

/**
 * Helper: Build validation context from transfer request.
 * Now includes fund structure context and asset aggregates for AIFMD checks.
 */
async function buildValidationContext(
  request: TransferRequest
): Promise<ValidationContext> {
  // Fetch all required data
  const [fromInvestor, toInvestor, fromHolding, rules, customRules, asset] = await Promise.all([
    findInvestorById(request.from_investor_id),
    findInvestorById(request.to_investor_id),
    findHoldingByInvestorAndAsset(request.from_investor_id, request.asset_id),
    findRuleSetByAsset(request.asset_id),
    getActiveCompositeRules(request.asset_id),
    findAssetById(request.asset_id),
  ]);

  // Validate data exists
  if (!fromInvestor) {
    throw new NotFoundError('Investor', request.from_investor_id);
  }

  if (!toInvestor) {
    throw new NotFoundError('Investor', request.to_investor_id);
  }

  if (!rules) {
    throw new NotFoundError('Rules', request.asset_id);
  }

  // Resolve fund structure context (if asset is fund-linked)
  let fund: FundContext | null = null;
  if (asset?.fund_structure_id) {
    const fundRows = await query<{ legal_form: string; domicile: string; regulatory_framework: string; status: string; leverage_limit_commitment: number | null; leverage_limit_gross: number | null; leverage_current_commitment: number | null; leverage_current_gross: number | null; lmt_types: any }>(
      `SELECT legal_form, domicile, regulatory_framework, status, leverage_limit_commitment, leverage_limit_gross, leverage_current_commitment, leverage_current_gross, lmt_types FROM fund_structures WHERE id = $1`,
      [asset.fund_structure_id]
    );
    if (fundRows.length > 0) {
      const r = fundRows[0];
      fund = {
        legal_form: r.legal_form,
        domicile: r.domicile,
        regulatory_framework: r.regulatory_framework,
        status: r.status,
        leverage_limit_commitment: r.leverage_limit_commitment ? Number(r.leverage_limit_commitment) : null,
        leverage_limit_gross: r.leverage_limit_gross ? Number(r.leverage_limit_gross) : null,
        leverage_current_commitment: r.leverage_current_commitment ? Number(r.leverage_current_commitment) : null,
        leverage_current_gross: r.leverage_current_gross ? Number(r.leverage_current_gross) : null,
        lmt_types: r.lmt_types ? (typeof r.lmt_types === 'string' ? JSON.parse(r.lmt_types) : r.lmt_types) : [],
      };
    }
  }

  // Resolve asset aggregates for concentration/max-investor checks
  let assetAggregates: AssetAggregates | null = null;
  if (asset) {
    const [countRes, receiverHolding] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(DISTINCT investor_id) as count FROM holdings WHERE asset_id = $1 AND units > 0`,
        [request.asset_id]
      ),
      findHoldingByInvestorAndAsset(request.to_investor_id, request.asset_id),
    ]);
    assetAggregates = {
      total_units: asset.total_units,
      distinct_investor_count: Number(countRes[0]?.count ?? 0),
      receiver_existing_units: receiverHolding?.units ?? 0,
    };
  }

  return {
    transfer: request,
    fromInvestor,
    toInvestor,
    fromHolding,
    rules,
    customRules,
    fund,
    assetAggregates,
  };
}
