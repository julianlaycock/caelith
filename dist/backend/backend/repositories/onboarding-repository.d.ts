/**
 * Onboarding Repository — Slice 5
 *
 * CRUD operations for the onboarding_records table.
 * Tracks investor applications through: applied → eligible/ineligible → approved/rejected → allocated
 */
import { OnboardingRecord, CreateOnboardingRecordInput, UpdateOnboardingInput } from '../models/index.js';
/**
 * Create a new onboarding record (status: 'applied')
 */
export declare function createOnboardingRecord(input: CreateOnboardingRecordInput): Promise<OnboardingRecord>;
/**
 * Find onboarding record by ID
 */
export declare function findOnboardingById(id: string): Promise<OnboardingRecord | null>;
/**
 * Find onboarding records by asset
 */
export declare function findOnboardingByAsset(assetId: string): Promise<OnboardingRecord[]>;
/**
 * Find onboarding records by investor
 */
export declare function findOnboardingByInvestor(investorId: string): Promise<OnboardingRecord[]>;
/**
 * Update an onboarding record (status transitions + metadata)
 */
export declare function updateOnboardingRecord(id: string, updates: UpdateOnboardingInput): Promise<OnboardingRecord | null>;
//# sourceMappingURL=onboarding-repository.d.ts.map