/**
 * E2E Tests — Slice 6: Compliance Report
 *
 * Tests GET /api/reports/compliance/:fundStructureId
 * including fund summary, eligibility criteria, investor breakdown,
 * and risk flag detection.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { api, resetDb, ensureAuth } from '../fixtures/api-helper';

interface CreatedEntity {
  id: string;
  [key: string]: unknown;
}

interface FundSummary {
  id: string;
  name: string;
  legal_form: string;
  domicile: string;
  status: string;
  assets: Array<{ id: string; name: string; total_units: number }>;
  total_aum_units: number;
  total_allocated_units: number;
  utilization_pct: number;
  total_investors: number;
}

interface ComplianceReport {
  generated_at: string;
  fund: FundSummary;
  eligibility_criteria: Array<Record<string, unknown>>;
  investor_breakdown: {
    by_type: Array<{ type: string; count: number; total_units: number }>;
    by_jurisdiction: Array<{ jurisdiction: string; count: number; total_units: number }>;
    by_kyc_status: Array<{ status: string; count: number }>;
    kyc_expiring_within_90_days: Array<Record<string, unknown>>;
  };
  onboarding_pipeline: Record<string, unknown>;
  recent_decisions: Array<Record<string, unknown>>;
  risk_flags: Array<{
    category: string;
    severity: string;
    message: string;
  }>;
}

describe('Compliance Report (Slice 6)', () => {
  let fundStructureId: string;
  let assetId: string;

  beforeAll(async () => {
    await resetDb();

    // Create fund structure
    const fund = await api<CreatedEntity>('/fund-structures', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Compliance Report Test SIF',
        legal_form: 'SIF',
        domicile: 'LU',
        regulatory_framework: 'AIFMD',
        currency: 'EUR',
      }),
    });
    fundStructureId = fund.id;

    // Create eligibility criteria
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

    // Create asset linked to fund
    const asset = await api<CreatedEntity>('/assets', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Report Test Class A',
        asset_type: 'Fund',
        total_units: 1000000,
        fund_structure_id: fundStructureId,
        unit_price: 1.0,
      }),
    });
    assetId = asset.id;

    // Create investors with different profiles
    const investor1 = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Large Holder',
        jurisdiction: 'FR',
        accredited: true,
        investor_type: 'professional',
        kyc_status: 'verified',
        kyc_expiry: '2028-12-31',
      }),
    });

    const investor2 = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Small Holder',
        jurisdiction: 'DE',
        accredited: true,
        investor_type: 'institutional',
        kyc_status: 'verified',
        kyc_expiry: '2028-12-31',
      }),
    });

    // Create holdings — give Large Holder >25% concentration
    await api<CreatedEntity>('/holdings', {
      method: 'POST',
      body: JSON.stringify({
        investor_id: investor1.id,
        asset_id: assetId,
        units: 400000, // 40% of 1M — above 25% concentration threshold
        acquired_at: new Date().toISOString(),
      }),
    });

    await api<CreatedEntity>('/holdings', {
      method: 'POST',
      body: JSON.stringify({
        investor_id: investor2.id,
        asset_id: assetId,
        units: 100000, // 10%
        acquired_at: new Date().toISOString(),
      }),
    });
  });

  // ── Test 1: Report contains fund summary ────────────────────

  it('should return a compliance report with fund summary', async () => {
    const report = await api<ComplianceReport>(
      `/reports/compliance/${fundStructureId}`
    );

    expect(report.generated_at).toBeDefined();
    expect(report.fund).toBeDefined();
    expect(report.fund.name).toBe('Compliance Report Test SIF');
    expect(report.fund.legal_form).toBe('SIF');
    expect(report.fund.domicile).toBe('LU');
    expect(report.fund.status).toBe('active');
  });

  // ── Test 2: Report includes asset data ──────────────────────

  it('should include assets with AUM totals', async () => {
    const report = await api<ComplianceReport>(
      `/reports/compliance/${fundStructureId}`
    );

    expect(report.fund.assets.length).toBeGreaterThanOrEqual(1);
    expect(report.fund.total_aum_units).toBe(1000000);
    expect(report.fund.total_allocated_units).toBe(500000);
    expect(report.fund.total_investors).toBe(2);
  });

  // ── Test 3: Eligibility criteria section ────────────────────

  it('should list eligibility criteria for the fund', async () => {
    const report = await api<ComplianceReport>(
      `/reports/compliance/${fundStructureId}`
    );

    expect(report.eligibility_criteria.length).toBeGreaterThanOrEqual(1);
  });

  // ── Test 4: Investor breakdown by type ──────────────────────

  it('should break down investors by type', async () => {
    const report = await api<ComplianceReport>(
      `/reports/compliance/${fundStructureId}`
    );

    expect(report.investor_breakdown.by_type.length).toBeGreaterThanOrEqual(1);

    const totalUnits = report.investor_breakdown.by_type.reduce(
      (sum, b) => sum + b.total_units,
      0
    );
    expect(totalUnits).toBe(500000);
  });

  // ── Test 5: Concentration risk flag ─────────────────────────

  it('should flag concentration risk above 25%', async () => {
    const report = await api<ComplianceReport>(
      `/reports/compliance/${fundStructureId}`
    );

    expect(report.risk_flags.length).toBeGreaterThanOrEqual(1);

    const concentrationFlag = report.risk_flags.find(
      f => f.category === 'concentration'
    );
    expect(concentrationFlag).toBeDefined();
    expect(concentrationFlag!.severity).toBe('medium');
    expect(concentrationFlag!.message).toContain('Large Holder');
  });

  // ── Test 6: 404 for unknown fund structure ──────────────────

  it('should return 404 for unknown fund structure', async () => {
    try {
      await api('/reports/compliance/00000000-0000-0000-0000-999999999999');
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });
});
