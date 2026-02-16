/**
 * E2E Tests — Slice 1: Eligibility Check Endpoint
 *
 * Tests POST /api/eligibility/check with AIFMD investor types,
 * decision provenance, and regulatory citations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { api, resetDb } from '../fixtures/api-helper';

interface CreatedEntity {
  id: string;
  [key: string]: unknown;
}

interface EligibilityResult {
  eligible: boolean;
  investor_type: string;
  fund_legal_form: string;
  jurisdiction: string;
  checks: Array<{ rule: string; passed: boolean; message: string }>;
  criteria_applied: Record<string, unknown> | null;
  decision_record_id: string;
}

interface ApiErrorShape {
  status: number;
  error?: string;
}

describe('Eligibility Check (Slice 1)', () => {
  let fundStructureId: string;
  let professionalId: string;
  let semiProId: string;
  let retailId: string;
  let expiredKycId: string;

  beforeAll(async () => {
    await resetDb();

    // Create a SIF fund structure
    const fund = await api<CreatedEntity>('/fund-structures', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Eligibility Test SIF',
        legal_form: 'SIF',
        domicile: 'LU',
        regulatory_framework: 'AIFMD',
        currency: 'EUR',
      }),
    });
    fundStructureId = fund.id;

    // Create eligibility criteria — professional (no minimum)
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

    // Create eligibility criteria — semi_professional (€125,000 minimum)
    await api<CreatedEntity>('/eligibility/criteria', {
      method: 'POST',
      body: JSON.stringify({
        fund_structure_id: fundStructureId,
        investor_type: 'semi_professional',
        jurisdiction: '*',
        minimum_investment: 12500000,
        suitability_required: true,
        source_reference: 'SIF Law 13 Feb 2007, Art. 2',
        effective_date: '2024-01-01',
      }),
    });

    // No criteria for retail — should fail eligibility

    // Create investors
    const professional = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Professional Investor',
        jurisdiction: 'FR',
        accredited: true,
        investor_type: 'professional',
        kyc_status: 'verified',
        kyc_expiry: '2028-12-31',
      }),
    });
    professionalId = professional.id;

    const semiPro = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Semi-Pro Investor',
        jurisdiction: 'DE',
        accredited: true,
        investor_type: 'semi_professional',
        kyc_status: 'verified',
        kyc_expiry: '2028-12-31',
      }),
    });
    semiProId = semiPro.id;

    const retail = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Retail Investor',
        jurisdiction: 'FR',
        accredited: false,
        investor_type: 'retail',
        kyc_status: 'verified',
        kyc_expiry: '2028-12-31',
      }),
    });
    retailId = retail.id;

    const expiredKyc = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Expired KYC Investor',
        jurisdiction: 'FR',
        accredited: true,
        investor_type: 'professional',
        kyc_status: 'verified',
        kyc_expiry: '2020-01-01',
      }),
    });
    expiredKycId = expiredKyc.id;
  });

  // ── Test 1: Professional investor passes all checks ─────────

  it('should approve a professional investor with no minimum investment', async () => {
    const result = await api<EligibilityResult>('/eligibility/check', {
      method: 'POST',
      body: JSON.stringify({
        investor_id: professionalId,
        fund_structure_id: fundStructureId,
      }),
    });

    expect(result.eligible).toBe(true);
    expect(result.investor_type).toBe('professional');
    expect(result.fund_legal_form).toBe('SIF');
    expect(result.jurisdiction).toBe('FR');
    expect(result.decision_record_id).toBeDefined();
    expect(result.criteria_applied).not.toBeNull();

    // All checks should pass
    for (const check of result.checks) {
      expect(check.passed).toBe(true);
    }

    // Should have regulatory citation
    const typeCheck = result.checks.find(c => c.rule === 'investor_type_eligible');
    expect(typeCheck).toBeDefined();
    expect(typeCheck!.message).toContain('SIF Law');
  });

  // ── Test 2: Semi-professional with sufficient investment ────

  it('should approve a semi-professional meeting minimum investment', async () => {
    const result = await api<EligibilityResult>('/eligibility/check', {
      method: 'POST',
      body: JSON.stringify({
        investor_id: semiProId,
        fund_structure_id: fundStructureId,
        investment_amount: 15000000, // €150,000 in cents — above €125,000 minimum
      }),
    });

    expect(result.eligible).toBe(true);
    expect(result.investor_type).toBe('semi_professional');
    expect(result.decision_record_id).toBeDefined();

    const minCheck = result.checks.find(c => c.rule === 'minimum_investment');
    expect(minCheck).toBeDefined();
    expect(minCheck!.passed).toBe(true);
  });

  // ── Test 3: Semi-professional below minimum investment ──────

  it('should reject a semi-professional below minimum investment', async () => {
    const result = await api<EligibilityResult>('/eligibility/check', {
      method: 'POST',
      body: JSON.stringify({
        investor_id: semiProId,
        fund_structure_id: fundStructureId,
        investment_amount: 5000000, // €50,000 in cents — below €125,000 minimum
      }),
    });

    expect(result.eligible).toBe(false);
    expect(result.decision_record_id).toBeDefined();

    const minCheck = result.checks.find(c => c.rule === 'minimum_investment');
    expect(minCheck).toBeDefined();
    expect(minCheck!.passed).toBe(false);
    expect(minCheck!.message).toContain('below minimum');
  });

  // ── Test 4: Retail investor (no criteria) ───────────────────

  it('should reject a retail investor with no eligibility criteria', async () => {
    const result = await api<EligibilityResult>('/eligibility/check', {
      method: 'POST',
      body: JSON.stringify({
        investor_id: retailId,
        fund_structure_id: fundStructureId,
      }),
    });

    expect(result.eligible).toBe(false);
    expect(result.decision_record_id).toBeDefined();

    const typeCheck = result.checks.find(c => c.rule === 'investor_type_eligible');
    expect(typeCheck).toBeDefined();
    expect(typeCheck!.passed).toBe(false);
    expect(typeCheck!.message).toContain('No eligibility criteria');
  });

  // ── Test 5: Expired KYC investor ────────────────────────────

  it('should reject an investor with expired KYC', async () => {
    const result = await api<EligibilityResult>('/eligibility/check', {
      method: 'POST',
      body: JSON.stringify({
        investor_id: expiredKycId,
        fund_structure_id: fundStructureId,
      }),
    });

    expect(result.eligible).toBe(false);
    expect(result.decision_record_id).toBeDefined();

    const kycCheck = result.checks.find(c => c.rule === 'kyc_not_expired');
    expect(kycCheck).toBeDefined();
    expect(kycCheck!.passed).toBe(false);
    expect(kycCheck!.message).toContain('expired');
  });

  // ── Test 6: Decision record is created ──────────────────────

  it('should create a retrievable decision record', async () => {
    const result = await api<EligibilityResult>('/eligibility/check', {
      method: 'POST',
      body: JSON.stringify({
        investor_id: professionalId,
        fund_structure_id: fundStructureId,
      }),
    });

    const record = await api<{
      id: string;
      decision_type: string;
      result: string;
      result_details: { checks: unknown[]; violation_count: number };
    }>(`/decisions/${result.decision_record_id}`);

    expect(record.id).toBe(result.decision_record_id);
    expect(record.decision_type).toBe('eligibility_check');
    expect(record.result).toBe('approved');
    expect(record.result_details.violation_count).toBe(0);
  });

  // ── Test 7: 404 for unknown investor or fund ────────────────

  it('should return 404 for unknown investor', async () => {
    try {
      await api('/eligibility/check', {
        method: 'POST',
        body: JSON.stringify({
          investor_id: '00000000-0000-0000-0000-999999999999',
          fund_structure_id: fundStructureId,
        }),
      });
      expect.unreachable('Should have thrown');
    } catch (err: unknown) {
      const e = err as ApiErrorShape;
      expect(e.status).toBe(404);
      expect(e.error).toBe('NOT_FOUND');
    }
  });

  it('should return 404 for unknown fund structure', async () => {
    try {
      await api('/eligibility/check', {
        method: 'POST',
        body: JSON.stringify({
          investor_id: professionalId,
          fund_structure_id: '00000000-0000-0000-0000-999999999999',
        }),
      });
      expect.unreachable('Should have thrown');
    } catch (err: unknown) {
      const e = err as ApiErrorShape;
      expect(e.status).toBe(404);
      expect(e.error).toBe('NOT_FOUND');
    }
  });
});
