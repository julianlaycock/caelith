/**
 * E2E Tests — Slice 2: Transfer Validation with AIFMD Eligibility
 *
 * Tests that transfer simulate/execute endpoints integrate
 * AIFMD eligibility checks and write decision provenance records.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { api, resetDb, ensureAuth } from '../fixtures/api-helper';

interface CreatedEntity {
  id: string;
  [key: string]: unknown;
}

interface SimulationResult {
  valid: boolean;
  violations: string[];
  checks: Array<{ rule: string; passed: boolean; message: string }>;
  summary: string;
  decision_record_id?: string;
  eligibility_criteria_applied?: Record<string, unknown> | null;
}

describe('Transfer Eligibility (Slice 2)', () => {
  let fundStructureId: string;
  let assetId: string;
  let senderId: string;
  let professionalReceiverId: string;
  let retailReceiverId: string;
  let semiProReceiverId: string;

  beforeAll(async () => {
    await resetDb();

    // Create SIF fund structure
    const fund = await api<CreatedEntity>('/fund-structures', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Transfer Elig Test SIF',
        legal_form: 'SIF',
        domicile: 'LU',
        regulatory_framework: 'AIFMD',
        currency: 'EUR',
      }),
    });
    fundStructureId = fund.id;

    // Eligibility criteria: professional (no minimum), semi_professional (€125k min)
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

    // Create fund-linked asset
    const asset = await api<CreatedEntity>('/assets', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Transfer Elig Class A',
        asset_type: 'Fund',
        total_units: 1000000,
        fund_structure_id: fundStructureId,
        unit_price: 10.0, // €10 per unit
      }),
    });
    assetId = asset.id;

    // Create rules (permissive — so only eligibility matters)
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

    // Create sender with holding
    const sender = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Transfer Sender',
        jurisdiction: 'FR',
        accredited: true,
        investor_type: 'professional',
        kyc_status: 'verified',
        kyc_expiry: '2028-12-31',
      }),
    });
    senderId = sender.id;

    await api<CreatedEntity>('/holdings', {
      method: 'POST',
      body: JSON.stringify({
        investor_id: senderId,
        asset_id: assetId,
        units: 500000,
        acquired_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });

    // Professional receiver
    const proReceiver = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Pro Receiver',
        jurisdiction: 'DE',
        accredited: true,
        investor_type: 'professional',
        kyc_status: 'verified',
        kyc_expiry: '2028-12-31',
      }),
    });
    professionalReceiverId = proReceiver.id;

    // Retail receiver (no criteria → ineligible)
    const retailReceiver = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Retail Receiver',
        jurisdiction: 'FR',
        accredited: false,
        investor_type: 'retail',
        kyc_status: 'verified',
        kyc_expiry: '2028-12-31',
      }),
    });
    retailReceiverId = retailReceiver.id;

    // Semi-professional receiver
    const semiProReceiver = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Semi-Pro Receiver',
        jurisdiction: 'DE',
        accredited: true,
        investor_type: 'semi_professional',
        kyc_status: 'verified',
        kyc_expiry: '2028-12-31',
      }),
    });
    semiProReceiverId = semiProReceiver.id;
  });

  // ── Test 1: Simulation passes for eligible professional ─────

  it('should simulate a valid transfer to professional receiver', async () => {
    const result = await api<SimulationResult>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: senderId,
        to_investor_id: professionalReceiverId,
        units: 10000,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.decision_record_id).toBeDefined();

    // Should include eligibility checks
    const eligCheck = result.checks.find(c => c.rule === 'investor_type_eligible');
    expect(eligCheck).toBeDefined();
    expect(eligCheck!.passed).toBe(true);
  });

  // ── Test 2: Simulation fails for ineligible retail receiver ─

  it('should reject simulation for retail receiver', async () => {
    const result = await api<SimulationResult>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: senderId,
        to_investor_id: retailReceiverId,
        units: 10000,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.decision_record_id).toBeDefined();

    const eligCheck = result.checks.find(c => c.rule === 'investor_type_eligible');
    expect(eligCheck).toBeDefined();
    expect(eligCheck!.passed).toBe(false);
  });

  // ── Test 3: Execution succeeds for eligible professional ────

  it('should execute transfer to eligible professional receiver', async () => {
    const transfer = await api<CreatedEntity>('/transfers', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: senderId,
        to_investor_id: professionalReceiverId,
        units: 10000,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(transfer.id).toBeDefined();
    expect(transfer.decision_record_id).toBeDefined();
  });

  // ── Test 4: Execution fails for ineligible retail receiver ──

  it('should reject execution for retail receiver (422)', async () => {
    try {
      await api('/transfers', {
        method: 'POST',
        body: JSON.stringify({
          asset_id: assetId,
          from_investor_id: senderId,
          to_investor_id: retailReceiverId,
          units: 10000,
          execution_date: new Date().toISOString(),
        }),
      });
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(422);
      expect(err.error).toBe('TRANSFER_FAILED');
      expect(err.violations.length).toBeGreaterThan(0);
    }
  });

  // ── Test 5: Semi-pro with insufficient investment (min check) ─

  it('should reject simulation for semi-pro below minimum investment', async () => {
    // At €10/unit, 100 units = €1,000 — well below €125,000 minimum
    const result = await api<SimulationResult>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: senderId,
        to_investor_id: semiProReceiverId,
        units: 100,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(result.valid).toBe(false);

    const minCheck = result.checks.find(c => c.rule === 'minimum_investment');
    expect(minCheck).toBeDefined();
    expect(minCheck!.passed).toBe(false);
    expect(minCheck!.message).toContain('below minimum');
  });
});
