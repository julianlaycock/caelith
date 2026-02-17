/**
 * Onboarding Service — Slice 5
 *
 * Orchestrates the investor onboarding workflow:
 *   apply → eligibility check → approve/reject → allocate
 *
 * Every status transition creates an event and (where applicable) a decision record.
 */

import {
  createOnboardingRecord,
  findOnboardingById,
  findOnboardingByAsset,
  findOnboardingByInvestor,
  updateOnboardingRecord,
} from '../repositories/onboarding-repository.js';
import { findInvestorById } from '../repositories/investor-repository.js';
import { findAssetById } from '../repositories/asset-repository.js';
import { createHolding, findHoldingByInvestorAndAsset } from '../repositories/holding-repository.js';
import { createEvent } from '../repositories/event-repository.js';
import { OnboardingRecord, DecisionCheck } from '../models/index.js';
import { runCoreEligibilityChecks } from './eligibility-check-helper.js';
import { NotFoundError, ValidationError, BusinessLogicError } from '../errors.js';
import { recordDecision, recordDecisionWithResult } from './decision-record-helper.js';

// ── Types ───────────────────────────────────────────────────

export interface EligibilityResult {
  onboarding: OnboardingRecord;
  eligible: boolean;
  checks: DecisionCheck[];
  decision_record_id: string;
}

export interface ReviewResult {
  onboarding: OnboardingRecord;
  decision_record_id: string;
}

// ── Step 1: Apply ───────────────────────────────────────────

/**
 * Investor submits an application to invest in a fund.
 * Creates an onboarding record with status 'applied'.
 */
export async function applyToFund(
  investorId: string,
  assetId: string,
  requestedUnits: number,
  ownerTag?: string,
  handoffNotes?: string
): Promise<OnboardingRecord> {
  // Validate investor exists
  const investor = await findInvestorById(investorId);
  if (!investor) {
    throw new NotFoundError('Investor', investorId);
  }

  // Validate asset exists
  const asset = await findAssetById(assetId);
  if (!asset) {
    throw new NotFoundError('Asset', assetId);
  }

  if (requestedUnits <= 0) {
    throw new ValidationError('Requested units must be positive');
  }

  // Create onboarding record
  const onboarding = await createOnboardingRecord({
    investor_id: investorId,
    asset_id: assetId,
    requested_units: requestedUnits,
    owner_tag: ownerTag,
    handoff_notes: handoffNotes,
  });

  // Log event
  await createEvent({
    event_type: 'onboarding.applied',
    entity_type: 'onboarding_record',
    entity_id: onboarding.id,
    payload: {
      investor_id: investorId,
      asset_id: assetId,
      requested_units: requestedUnits,
      investor_name: investor.name,
      owner_tag: ownerTag ?? null,
    },
  });

  return onboarding;
}

/**
 * Update onboarding handoff metadata without changing status.
 */
export async function updateHandoffDetails(
  onboardingId: string,
  ownerTag: string | null,
  handoffNotes: string | null
): Promise<OnboardingRecord> {
  const onboarding = await findOnboardingById(onboardingId);
  if (!onboarding) {
    throw new NotFoundError('Onboarding record', onboardingId);
  }

  const updated = await updateOnboardingRecord(onboardingId, {
    status: onboarding.status,
    owner_tag: ownerTag,
    handoff_notes: handoffNotes,
  });

  await createEvent({
    event_type: 'onboarding.applied',
    entity_type: 'onboarding_record',
    entity_id: onboardingId,
    payload: {
      action: 'handoff.updated',
      owner_tag: ownerTag,
      handoff_notes: handoffNotes,
    },
  });

  return updated!;
}

// ── Step 2: Eligibility Check ───────────────────────────────

/**
 * Run automated eligibility check on an onboarding application.
 * Checks investor type, minimum investment, KYC status.
 * Creates a decision record and updates status to 'eligible' or 'ineligible'.
 */
export async function checkEligibility(
  onboardingId: string
): Promise<EligibilityResult> {
  const onboarding = await findOnboardingById(onboardingId);
  if (!onboarding) {
    throw new NotFoundError('Onboarding record', onboardingId);
  }

  if (onboarding.status !== 'applied') {
    throw new BusinessLogicError(`Cannot check eligibility: status is '${onboarding.status}', expected 'applied'`);
  }

  const investor = await findInvestorById(onboarding.investor_id);
  if (!investor) {
    throw new NotFoundError('Investor', onboarding.investor_id);
  }

  const asset = await findAssetById(onboarding.asset_id);
  if (!asset) {
    throw new NotFoundError('Asset', onboarding.asset_id);
  }

  let checks: DecisionCheck[];
  let eligible: boolean;

  if (asset.fund_structure_id) {
    // Delegate AIFMD + KYC checks to shared helper
    const unitPrice = asset.unit_price ? Number(asset.unit_price) : 0;
    const investmentAmountCents = unitPrice > 0
      ? Math.round(onboarding.requested_units * unitPrice * 100)
      : undefined;

    const result = await runCoreEligibilityChecks({
      investor: {
        investor_type: investor.investor_type || 'retail',
        jurisdiction: investor.jurisdiction,
        kyc_status: investor.kyc_status,
        kyc_expiry: investor.kyc_expiry ?? null,
      },
      fundStructureId: asset.fund_structure_id,
      investmentAmountCents,
    });

    checks = result.checks;
    eligible = result.eligible;
  } else {
    // No fund structure — run KYC checks only
    checks = [];

    const kycValid = investor.kyc_status === 'verified';
    checks.push({
      rule: 'kyc_valid',
      passed: kycValid,
      message: kycValid
        ? 'KYC verified'
        : `KYC status is '${investor.kyc_status || 'unknown'}', must be 'verified'`,
    });

    if (kycValid && investor.kyc_expiry) {
      const expiryDate = new Date(investor.kyc_expiry);
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

    eligible = checks.every(c => c.passed);
  }

  const violations = checks.filter(c => !c.passed);

  // Write decision record
  const decisionRecord = await recordDecision({
    decisionType: 'eligibility_check',
    assetId: onboarding.asset_id,
    subjectId: onboarding.investor_id,
    inputSnapshot: {
      onboarding_id: onboarding.id,
      investor_id: onboarding.investor_id,
      asset_id: onboarding.asset_id,
      requested_units: onboarding.requested_units,
    },
    ruleVersionSnapshot: {
      checks_performed: checks.map(c => c.rule),
    },
    checks: checks.map(c => ({ rule: c.rule, passed: c.passed, message: c.message })),
  });

  // Update onboarding status
  const updated = await updateOnboardingRecord(onboarding.id, {
    status: eligible ? 'eligible' : 'ineligible',
    eligibility_decision_id: decisionRecord.id,
    rejection_reasons: eligible ? undefined : violations.map(v => v.message),
  });

  // Log event
  await createEvent({
    event_type: eligible ? 'onboarding.eligible' : 'onboarding.ineligible',
    entity_type: 'onboarding_record',
    entity_id: onboarding.id,
    payload: {
      investor_id: onboarding.investor_id,
      asset_id: onboarding.asset_id,
      eligible,
      checks,
      decision_record_id: decisionRecord.id,
    },
  });

  return {
    onboarding: updated!,
    eligible,
    checks,
    decision_record_id: decisionRecord.id,
  };
}

// ── Step 3: Approve / Reject ────────────────────────────────

/**
 * Compliance officer approves or rejects an application.
 *
 * - Approval requires status 'eligible' (automated checks must pass first).
 * - Rejection is allowed from 'applied' or 'eligible' so officers can
 *   fast-track obvious disqualifiers without running automated checks.
 *
 * Creates a decision record for the audit trail.
 */
export async function reviewApplication(
  onboardingId: string,
  decision: 'approved' | 'rejected',
  reviewedBy: string,
  rejectionReasons?: string[]
): Promise<ReviewResult> {
  const onboarding = await findOnboardingById(onboardingId);
  if (!onboarding) {
    throw new NotFoundError('Onboarding record', onboardingId);
  }

  const allowedStatuses = decision === 'rejected'
    ? ['eligible', 'applied']
    : ['eligible'];

  if (!allowedStatuses.includes(onboarding.status)) {
    const expected = allowedStatuses.join("' or '");
    throw new BusinessLogicError(`Cannot ${decision === 'rejected' ? 'reject' : 'approve'}: status is '${onboarding.status}', expected '${expected}'`);
  }

  if (decision === 'rejected' && (!rejectionReasons || rejectionReasons.length === 0)) {
    throw new ValidationError('Rejection reasons required when rejecting');
  }

  // Write decision record
  const decisionRecord = await recordDecisionWithResult({
    decisionType: 'onboarding_approval',
    assetId: onboarding.asset_id,
    subjectId: onboarding.investor_id,
    inputSnapshot: {
      onboarding_id: onboarding.id,
      decision,
      reviewed_by: reviewedBy,
      rejection_reasons: rejectionReasons,
    },
    ruleVersionSnapshot: {
      eligibility_decision_id: onboarding.eligibility_decision_id,
    },
    checks: [{ rule: 'manual_review', passed: decision === 'approved', message: `${decision} by ${reviewedBy}${rejectionReasons ? ': ' + rejectionReasons.join(', ') : ''}` }],
    result: decision === 'approved' ? 'approved' : 'rejected',
    decidedBy: reviewedBy,
  });

  // Update onboarding
  const updated = await updateOnboardingRecord(onboarding.id, {
    status: decision,
    reviewed_by: reviewedBy,
    approval_decision_id: decisionRecord.id,
    rejection_reasons: decision === 'rejected' ? rejectionReasons : undefined,
  });

  // Log event
  await createEvent({
    event_type: decision === 'approved' ? 'onboarding.approved' : 'onboarding.rejected',
    entity_type: 'onboarding_record',
    entity_id: onboarding.id,
    payload: {
      investor_id: onboarding.investor_id,
      asset_id: onboarding.asset_id,
      decision,
      reviewed_by: reviewedBy,
      rejection_reasons: rejectionReasons,
      decision_record_id: decisionRecord.id,
    },
  });

  return {
    onboarding: updated!,
    decision_record_id: decisionRecord.id,
  };
}

// ── Step 4: Allocate ────────────────────────────────────────

/**
 * Allocate units to an approved investor.
 * Creates/updates a holding and marks onboarding as 'allocated'.
 */
export async function allocateUnits(
  onboardingId: string
): Promise<OnboardingRecord> {
  const onboarding = await findOnboardingById(onboardingId);
  if (!onboarding) {
    throw new NotFoundError('Onboarding record', onboardingId);
  }

  if (onboarding.status !== 'approved') {
    throw new BusinessLogicError(`Cannot allocate: status is '${onboarding.status}', expected 'approved'`);
  }

  // Check if investor already has a holding for this asset
  const existingHolding = await findHoldingByInvestorAndAsset(
    onboarding.investor_id,
    onboarding.asset_id
  );

  if (existingHolding) {
    // Update existing holding (import updateHolding if needed)
    const { updateHoldingByInvestorAndAsset } = await import('../repositories/holding-repository.js');
    await updateHoldingByInvestorAndAsset(
      onboarding.investor_id,
      onboarding.asset_id,
      existingHolding.units + onboarding.requested_units
    );
  } else {
    // Create new holding
    await createHolding({
      investor_id: onboarding.investor_id,
      asset_id: onboarding.asset_id,
      units: onboarding.requested_units,
      acquired_at: new Date().toISOString(),
    });
  }

  // Update onboarding status
  const updated = await updateOnboardingRecord(onboarding.id, {
    status: 'allocated',
  });

  // Log event
  await createEvent({
    event_type: 'onboarding.allocated',
    entity_type: 'onboarding_record',
    entity_id: onboarding.id,
    payload: {
      investor_id: onboarding.investor_id,
      asset_id: onboarding.asset_id,
      units_allocated: onboarding.requested_units,
    },
  });

  return updated!;
}

// ── Queries ─────────────────────────────────────────────────

export { findOnboardingById, findOnboardingByAsset, findOnboardingByInvestor };
