/**
 * Onboarding Service — Slice 5
 *
 * Orchestrates the investor onboarding workflow:
 *   apply → eligibility check → approve/reject → allocate
 *
 * Every status transition creates an event and (where applicable) a decision record.
 */
import { findOnboardingById, findOnboardingByAsset, findOnboardingByInvestor } from '../repositories/onboarding-repository.js';
import { OnboardingRecord } from '../models/index.js';
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
/**
 * Investor submits an application to invest in a fund.
 * Creates an onboarding record with status 'applied'.
 */
export declare function applyToFund(investorId: string, assetId: string, requestedUnits: number): Promise<ApplyResult>;
/**
 * Run automated eligibility check on an onboarding application.
 * Checks investor type, minimum investment, KYC status.
 * Creates a decision record and updates status to 'eligible' or 'ineligible'.
 */
export declare function checkEligibility(onboardingId: string): Promise<EligibilityResult>;
/**
 * Compliance officer approves or rejects an eligible application.
 * Only works on 'eligible' status. Creates a decision record.
 */
export declare function reviewApplication(onboardingId: string, decision: 'approved' | 'rejected', reviewedBy: string, rejectionReasons?: string[]): Promise<ReviewResult>;
/**
 * Allocate units to an approved investor.
 * Creates/updates a holding and marks onboarding as 'allocated'.
 */
export declare function allocateUnits(onboardingId: string): Promise<AllocateResult>;
export { findOnboardingById, findOnboardingByAsset, findOnboardingByInvestor };
//# sourceMappingURL=onboarding-service.d.ts.map