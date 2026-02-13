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
import { findFundStructureById } from '../repositories/fund-structure-repository.js';
import { findApplicableCriteria } from '../repositories/eligibility-criteria-repository.js';
import { createDecisionRecord } from '../repositories/decision-record-repository.js';
import { createHolding, findHoldingByInvestorAndAsset } from '../repositories/holding-repository.js';
import { createEvent } from '../repositories/event-repository.js';
import { OnboardingRecord, InvestorType } from '../models/index.js';

// ── Types ───────────────────────────────────────────────────

interface Check {
  rule: string;
  passed: boolean;
  message: string;
}

export interface ApplyResult {
  success: boolean;
  onboarding?: OnboardingRecord;
  error?: string;
}

export interface EligibilityResult {
  success: boolean;
  onboarding?: OnboardingRecord;
  eligible?: boolean;
  checks?: Check[];
  decision_record_id?: string;
  error?: string;
}

export interface ReviewResult {
  success: boolean;
  onboarding?: OnboardingRecord;
  decision_record_id?: string;
  error?: string;
}

export interface AllocateResult {
  success: boolean;
  onboarding?: OnboardingRecord;
  error?: string;
}

// ── Step 1: Apply ───────────────────────────────────────────

/**
 * Investor submits an application to invest in a fund.
 * Creates an onboarding record with status 'applied'.
 */
export async function applyToFund(
  investorId: string,
  assetId: string,
  requestedUnits: number
): Promise<ApplyResult> {
  try {
    // Validate investor exists
    const investor = await findInvestorById(investorId);
    if (!investor) {
      return { success: false, error: `Investor not found: ${investorId}` };
    }

    // Validate asset exists
    const asset = await findAssetById(assetId);
    if (!asset) {
      return { success: false, error: `Asset not found: ${assetId}` };
    }

    if (requestedUnits <= 0) {
      return { success: false, error: 'Requested units must be positive' };
    }

    // Create onboarding record
    const onboarding = await createOnboardingRecord({
      investor_id: investorId,
      asset_id: assetId,
      requested_units: requestedUnits,
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
      },
    });

    return { success: true, onboarding };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
  try {
    const onboarding = await findOnboardingById(onboardingId);
    if (!onboarding) {
      return { success: false, error: `Onboarding record not found: ${onboardingId}` };
    }

    if (onboarding.status !== 'applied') {
      return { success: false, error: `Cannot check eligibility: status is '${onboarding.status}', expected 'applied'` };
    }

    const investor = await findInvestorById(onboarding.investor_id);
    if (!investor) {
      return { success: false, error: `Investor not found: ${onboarding.investor_id}` };
    }

    const asset = await findAssetById(onboarding.asset_id);
    if (!asset) {
      return { success: false, error: `Asset not found: ${onboarding.asset_id}` };
    }

    const checks: Check[] = [];

    // If asset has a fund structure, run AIFMD eligibility checks
    if (asset.fund_structure_id) {
      const fund = await findFundStructureById(asset.fund_structure_id);

      if (!fund) {
        checks.push({ rule: 'fund_exists', passed: false, message: 'Fund structure not found' });
      } else {
        // Fund status
        checks.push({
          rule: 'fund_status',
          passed: fund.status === 'active',
          message: fund.status === 'active'
            ? 'Fund is active'
            : `Fund status is '${fund.status}', applications not accepted`,
        });

        if (fund.status === 'active') {
          const investorType = (investor.investor_type || 'retail') as InvestorType;

          // Look up eligibility criteria
          const criteria = await findApplicableCriteria(
            asset.fund_structure_id,
            investor.jurisdiction,
            investorType
          );

          if (!criteria) {
            checks.push({
              rule: 'investor_type_eligible',
              passed: false,
              message: `No eligibility criteria found for ${investorType} investors from ${investor.jurisdiction} in ${fund.legal_form} (${fund.domicile})`,
            });
          } else {
            // Investor type eligible
            checks.push({
              rule: 'investor_type_eligible',
              passed: true,
              message: `${investorType} investors are eligible for ${fund.legal_form} (${criteria.source_reference || 'fund rules'})`,
            });

            // Minimum investment
            if (criteria.minimum_investment > 0) {
              const unitPriceEur = asset.unit_price ? Number(asset.unit_price) : 0;
              if (unitPriceEur === 0) {
                checks.push({
                  rule: 'minimum_investment',
                  passed: true,
                  message: `Unit price not configured — minimum investment check skipped (${criteria.source_reference || 'fund rules'})`,
                });
              } else {
                const investmentEur = onboarding.requested_units * unitPriceEur;
                const investmentCents = Math.round(investmentEur * 100);
                const passed = investmentCents >= criteria.minimum_investment;
                const minEuros = criteria.minimum_investment / 100;
                checks.push({
                  rule: 'minimum_investment',
                  passed,
                  message: passed
                    ? `Investment €${investmentEur.toLocaleString()} (${onboarding.requested_units.toLocaleString()} units × €${unitPriceEur.toLocaleString()}/unit) meets minimum €${minEuros.toLocaleString()} (${criteria.source_reference || 'fund rules'})`
                    : `Investment €${investmentEur.toLocaleString()} (${onboarding.requested_units.toLocaleString()} units × €${unitPriceEur.toLocaleString()}/unit) is below minimum €${minEuros.toLocaleString()} for ${investorType} investors (${criteria.source_reference || 'fund rules'})`,
                });
              }
            } else {
              checks.push({
                rule: 'minimum_investment',
                passed: true,
                message: 'No minimum investment required',
              });
            }

            // Suitability flag
            if (criteria.suitability_required) {
              checks.push({
                rule: 'suitability_required',
                passed: true,
                message: `Suitability assessment required for ${investorType} investors`,
              });
            }
          }
        }
      }
    }

    // KYC checks (always run)
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

    // Determine result
    const violations = checks.filter(c => !c.passed);
    const eligible = violations.length === 0;

    // Write decision record
    const decisionRecord = await createDecisionRecord({
      decision_type: 'eligibility_check',
      asset_id: onboarding.asset_id,
      subject_id: onboarding.investor_id,
      input_snapshot: {
        onboarding_id: onboarding.id,
        investor_id: onboarding.investor_id,
        asset_id: onboarding.asset_id,
        requested_units: onboarding.requested_units,
      },
      rule_version_snapshot: {
        checks_performed: checks.map(c => c.rule),
      },
      result: eligible ? 'approved' : 'rejected',
      result_details: {
        checks: checks.map(c => ({ rule: c.rule, passed: c.passed, message: c.message })),
        overall: eligible ? 'approved' : 'rejected',
        violation_count: violations.length,
      },
      decided_by: undefined,
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
      success: true,
      onboarding: updated!,
      eligible,
      checks,
      decision_record_id: decisionRecord.id,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
  try {
    const onboarding = await findOnboardingById(onboardingId);
    if (!onboarding) {
      return { success: false, error: `Onboarding record not found: ${onboardingId}` };
    }

    const allowedStatuses = decision === 'rejected'
      ? ['eligible', 'applied']
      : ['eligible'];

    if (!allowedStatuses.includes(onboarding.status)) {
      const expected = allowedStatuses.join("' or '");
      return { success: false, error: `Cannot ${decision === 'rejected' ? 'reject' : 'approve'}: status is '${onboarding.status}', expected '${expected}'` };
    }

    if (decision === 'rejected' && (!rejectionReasons || rejectionReasons.length === 0)) {
      return { success: false, error: 'Rejection reasons required when rejecting' };
    }

    // Write decision record
    const decisionRecord = await createDecisionRecord({
      decision_type: 'onboarding_approval',
      asset_id: onboarding.asset_id,
      subject_id: onboarding.investor_id,
      input_snapshot: {
        onboarding_id: onboarding.id,
        decision,
        reviewed_by: reviewedBy,
        rejection_reasons: rejectionReasons,
      },
      rule_version_snapshot: {
        eligibility_decision_id: onboarding.eligibility_decision_id,
      },
      result: decision === 'approved' ? 'approved' : 'rejected',
      result_details: {
        checks: [{ rule: 'manual_review', passed: decision === 'approved', message: `${decision} by ${reviewedBy}${rejectionReasons ? ': ' + rejectionReasons.join(', ') : ''}` }],
        overall: decision === 'approved' ? 'approved' : 'rejected',
        violation_count: decision === 'rejected' ? 1 : 0,
      },
      decided_by: reviewedBy,
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
      success: true,
      onboarding: updated!,
      decision_record_id: decisionRecord.id,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ── Step 4: Allocate ────────────────────────────────────────

/**
 * Allocate units to an approved investor.
 * Creates/updates a holding and marks onboarding as 'allocated'.
 */
export async function allocateUnits(
  onboardingId: string
): Promise<AllocateResult> {
  try {
    const onboarding = await findOnboardingById(onboardingId);
    if (!onboarding) {
      return { success: false, error: `Onboarding record not found: ${onboardingId}` };
    }

    if (onboarding.status !== 'approved') {
      return { success: false, error: `Cannot allocate: status is '${onboarding.status}', expected 'approved'` };
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

    return { success: true, onboarding: updated! };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ── Queries ─────────────────────────────────────────────────

export { findOnboardingById, findOnboardingByAsset, findOnboardingByInvestor };