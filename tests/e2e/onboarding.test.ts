/**
 * E2E Tests — Slice 5: Onboarding Workflow
 *
 * Tests the full investor onboarding lifecycle:
 *   apply → eligibility check → approve/reject → allocate
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { api, resetDb, ensureAuth } from '../fixtures/api-helper';

interface CreatedEntity {
  id: string;
  [key: string]: unknown;
}

interface OnboardingRecord {
  id: string;
  investor_id: string;
  asset_id: string;
  status: string;
  requested_units: number;
  eligibility_decision_id: string | null;
  approval_decision_id: string | null;
  reviewed_by: string | null;
  rejection_reasons: string[] | null;
}

interface EligibilityCheckResponse {
  onboarding: OnboardingRecord;
  eligible: boolean;
  checks: Array<{ rule: string; passed: boolean; message: string }>;
  decision_record_id: string;
}

interface ReviewResponse {
  onboarding: OnboardingRecord;
  decision_record_id: string;
}

describe('Onboarding Workflow (Slice 5)', () => {
  let fundStructureId: string;
  let assetId: string;
  let professionalId: string;
  let retailId: string;

  beforeAll(async () => {
    await resetDb();

    // Create a SIF fund structure
    const fund = await api<CreatedEntity>('/fund-structures', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Onboarding Test SIF',
        legal_form: 'SIF',
        domicile: 'LU',
        regulatory_framework: 'AIFMD',
        currency: 'EUR',
      }),
    });
    fundStructureId = fund.id;

    // Create eligibility criteria for professional
    await api<CreatedEntity>('/eligibility/criteria', {
      method: 'POST',
      body: JSON.stringify({
        fund_structure_id: fundStructureId,
        investor_type: 'professional',
        jurisdiction: '*',
        minimum_investment: 0,
        suitability_required: false,
        source_reference: 'SIF Law 13 Feb 2007, Art. 2',
        effective_date: '2024-01-01',
      }),
    });

    // No criteria for retail — will fail eligibility check

    // Create an asset linked to the fund
    const asset = await api<CreatedEntity>('/assets', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Onboarding Test Class A',
        asset_type: 'Fund',
        total_units: 1000000,
        fund_structure_id: fundStructureId,
        unit_price: 1.0,
      }),
    });
    assetId = asset.id;

    // Create rules for the asset (required for transfers)
    await api<CreatedEntity>('/rules', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        qualification_required: false,
        lockup_days: 0,
        jurisdiction_whitelist: [],
        transfer_whitelist: null,
      }),
    });

    // Create investors
    const professional = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Onboarding Pro Investor',
        jurisdiction: 'FR',
        accredited: true,
        investor_type: 'professional',
        kyc_status: 'verified',
        kyc_expiry: '2028-12-31',
      }),
    });
    professionalId = professional.id;

    const retail = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Onboarding Retail Investor',
        jurisdiction: 'FR',
        accredited: false,
        investor_type: 'retail',
        kyc_status: 'verified',
        kyc_expiry: '2028-12-31',
      }),
    });
    retailId = retail.id;
  });

  // ========================================================================
  // Happy Path: apply → check → approve → allocate
  // ========================================================================

  describe('Happy Path', () => {
    let onboardingId: string;

    it('should create an onboarding application (status: applied)', async () => {
      const record = await api<OnboardingRecord>('/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          investor_id: professionalId,
          asset_id: assetId,
          requested_units: 100000,
        }),
      });

      expect(record.id).toBeDefined();
      expect(record.status).toBe('applied');
      expect(record.requested_units).toBe(100000);
      onboardingId = record.id;
    });

    it('should pass eligibility check (status: eligible)', async () => {
      const result = await api<EligibilityCheckResponse>(
        `/onboarding/${onboardingId}/check-eligibility`,
        { method: 'POST' }
      );

      expect(result.eligible).toBe(true);
      expect(result.onboarding.status).toBe('eligible');
      expect(result.decision_record_id).toBeDefined();
      expect(result.checks.length).toBeGreaterThan(0);

      // All checks should pass
      for (const check of result.checks) {
        expect(check.passed).toBe(true);
      }
    });

    it('should approve the application (status: approved)', async () => {
      const result = await api<ReviewResponse>(
        `/onboarding/${onboardingId}/review`,
        {
          method: 'POST',
          body: JSON.stringify({ decision: 'approved' }),
        }
      );

      expect(result.onboarding.status).toBe('approved');
      expect(result.decision_record_id).toBeDefined();
    });

    it('should allocate units (status: allocated)', async () => {
      const result = await api<OnboardingRecord>(
        `/onboarding/${onboardingId}/allocate`,
        { method: 'POST' }
      );

      expect(result.status).toBe('allocated');
    });

    it('should reflect allocation in cap table', async () => {
      const capTable = await api<{ investor_name: string; units: number }[]>(
        `/holdings/cap-table/${assetId}`
      );

      const entry = capTable.find(e => e.investor_name === 'Onboarding Pro Investor');
      expect(entry).toBeDefined();
      expect(entry!.units).toBe(100000);
    });

    it('should be retrievable by GET', async () => {
      const record = await api<OnboardingRecord>(`/onboarding/${onboardingId}`);

      expect(record.id).toBe(onboardingId);
      expect(record.status).toBe('allocated');
      expect(record.eligibility_decision_id).toBeDefined();
      expect(record.approval_decision_id).toBeDefined();
    });
  });

  // ========================================================================
  // Rejection Flow: retail investor fails eligibility
  // ========================================================================

  describe('Rejection Flow', () => {
    let onboardingId: string;

    it('should create an application for a retail investor', async () => {
      const record = await api<OnboardingRecord>('/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          investor_id: retailId,
          asset_id: assetId,
          requested_units: 50000,
        }),
      });

      expect(record.status).toBe('applied');
      onboardingId = record.id;
    });

    it('should fail eligibility check for retail investor', async () => {
      const result = await api<EligibilityCheckResponse>(
        `/onboarding/${onboardingId}/check-eligibility`,
        { method: 'POST' }
      );

      expect(result.eligible).toBe(false);
      expect(result.onboarding.status).toBe('ineligible');
      expect(result.decision_record_id).toBeDefined();

      const failedCheck = result.checks.find(c => !c.passed);
      expect(failedCheck).toBeDefined();
    });
  });

  // ========================================================================
  // Manual Rejection: eligible but rejected by reviewer
  // ========================================================================

  describe('Manual Rejection', () => {
    let onboardingId: string;

    it('should create and make eligible, then reject with reasons', async () => {
      // Apply
      const record = await api<OnboardingRecord>('/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          investor_id: professionalId,
          asset_id: assetId,
          requested_units: 50000,
        }),
      });
      onboardingId = record.id;

      // Check eligibility
      await api<EligibilityCheckResponse>(
        `/onboarding/${onboardingId}/check-eligibility`,
        { method: 'POST' }
      );

      // Reject
      const result = await api<ReviewResponse>(
        `/onboarding/${onboardingId}/review`,
        {
          method: 'POST',
          body: JSON.stringify({
            decision: 'rejected',
            rejection_reasons: ['Concentration risk too high', 'Pending regulatory review'],
          }),
        }
      );

      expect(result.onboarding.status).toBe('rejected');
      expect(result.decision_record_id).toBeDefined();
    });
  });

  // ========================================================================
  // Status Machine Enforcement
  // ========================================================================

  describe('Status Machine Enforcement', () => {
    it('should reject check-eligibility on non-applied record', async () => {
      // Create and check eligibility (moves to eligible)
      const record = await api<OnboardingRecord>('/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          investor_id: professionalId,
          asset_id: assetId,
          requested_units: 10000,
        }),
      });

      await api<EligibilityCheckResponse>(
        `/onboarding/${record.id}/check-eligibility`,
        { method: 'POST' }
      );

      // Try to check eligibility again (status is now 'eligible', not 'applied')
      try {
        await api(`/onboarding/${record.id}/check-eligibility`, { method: 'POST' });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect([400, 422]).toContain(err.status);
      }
    });

    it('should reject allocate on non-approved record', async () => {
      // Create an applied record — try to allocate directly
      const record = await api<OnboardingRecord>('/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          investor_id: professionalId,
          asset_id: assetId,
          requested_units: 10000,
        }),
      });

      try {
        await api(`/onboarding/${record.id}/allocate`, { method: 'POST' });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect([400, 422]).toContain(err.status);
      }
    });
  });

  // ========================================================================
  // Validation Errors
  // ========================================================================

  describe('Validation', () => {
    it('should require investor_id, asset_id, and requested_units', async () => {
      try {
        await api('/onboarding', {
          method: 'POST',
          body: JSON.stringify({ investor_id: professionalId }),
        });
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect([400, 422]).toContain(err.status);
        expect(err.error).toBe('VALIDATION_ERROR');
      }
    });
  });
});
