import { describe, it, expect, beforeAll } from 'vitest';
import { API_BASE } from '../fixtures/test-data';

interface CreatedEntity {
  id: string;
  [key: string]: unknown;
}

interface ValidationResult {
  valid: boolean;
  violations: string[];
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) throw { status: res.status, ...body };
  return body as T;
}

describe('Validation Failures', () => {
  let assetId: string;
  let accreditedUsId: string;   // accredited, US
  let accreditedGbId: string;   // accredited, GB
  let nonAccreditedUsId: string; // non-accredited, US
  let blockedJurisdictionId: string; // accredited, CN (not whitelisted)

  beforeAll(async () => {
    await fetch('http://localhost:3001/api/reset', { method: 'POST' });
    // Create asset
    const asset = await api<CreatedEntity>('/assets', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Validation Test Fund',
        asset_type: 'Fund',
        total_units: 500000,
      }),
    });
    assetId = asset.id;

    // Create investors
    const accUs = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acc US Investor', jurisdiction: 'US', accredited: true }),
    });
    accreditedUsId = accUs.id;

    const accGb = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acc GB Investor', jurisdiction: 'GB', accredited: true }),
    });
    accreditedGbId = accGb.id;

    const nonAcc = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({ name: 'NonAcc US Investor', jurisdiction: 'US', accredited: false }),
    });
    nonAccreditedUsId = nonAcc.id;

    const blocked = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acc CN Investor', jurisdiction: 'CN', accredited: true }),
    });
    blockedJurisdictionId = blocked.id;

    // Allocate units to sender
    await api('/holdings', {
      method: 'POST',
      body: JSON.stringify({ asset_id: assetId, investor_id: accreditedUsId, units: 200000, acquired_at: new Date().toISOString() }),
    });

    // Configure rules: qualification required, 90-day lockup, US/GB only
    await api('/rules', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        qualification_required: true,
        lockup_days: 90,
        jurisdiction_whitelist: ['US', 'GB'],
        transfer_whitelist: null,
      }),
    });
  });

  // ── Non-Qualified Investor ────────────────────────────

  it('should reject transfer to non-accredited investor', async () => {
    const result = await api<ValidationResult>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: accreditedUsId,
        to_investor_id: nonAccreditedUsId,
        units: 1000,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations.some((v) => v.toLowerCase().includes('accredit') || v.toLowerCase().includes('qualif'))).toBe(true);
  });

  // ── Lockup Violation ──────────────────────────────────

  it('should reject transfer during lockup period', async () => {
    // Holdings were just created, so lockup (90 days) is still active
    const result = await api<ValidationResult>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: accreditedUsId,
        to_investor_id: accreditedGbId,
        units: 1000,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.toLowerCase().includes('lockup') || v.toLowerCase().includes('lock'))).toBe(true);
  });

  // ── Jurisdiction Blocked ──────────────────────────────

  it('should reject transfer to blocked jurisdiction', async () => {
    const result = await api<ValidationResult>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: accreditedUsId,
        to_investor_id: blockedJurisdictionId,
        units: 1000,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.toLowerCase().includes('jurisdiction'))).toBe(true);
  });

  // ── Insufficient Units ────────────────────────────────

  it('should reject transfer exceeding available units', async () => {
    const result = await api<ValidationResult>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: accreditedUsId,
        to_investor_id: accreditedGbId,
        units: 999999,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.toLowerCase().includes('insufficient') || v.toLowerCase().includes('units'))).toBe(true);
  });

  // ── Self-Transfer ─────────────────────────────────────

  it('should reject self-transfer', async () => {
    const result = await api<ValidationResult>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: accreditedUsId,
        to_investor_id: accreditedUsId,
        units: 1000,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.toLowerCase().includes('self'))).toBe(true);
  });

  // ── Multiple Violations ───────────────────────────────

  it('should aggregate multiple violations in a single transfer', async () => {
    // CN investor is: blocked jurisdiction + non-accredited would fail if we had one
    // Transfer from accreditedUs to blockedJurisdiction during lockup
    // This should trigger both lockup AND jurisdiction violations
    const result = await api<ValidationResult>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: accreditedUsId,
        to_investor_id: blockedJurisdictionId,
        units: 1000,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  // ── Transfer Whitelist ────────────────────────────────

  it('should reject transfer when investor is not on whitelist', async () => {
    // Create a separate asset with whitelist rules
    const asset2 = await api<CreatedEntity>('/assets', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Whitelist Test Fund',
        asset_type: 'Fund',
        total_units: 100000,
      }),
    });

    // Allocate to sender
    await api('/holdings', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: asset2.id,
        investor_id: accreditedUsId,
        units: 50000,
        acquired_at: new Date().toISOString(),
      }),
    });

    // Rules: whitelist only allows accreditedGbId
    await api('/rules', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: asset2.id,
        qualification_required: false,
        lockup_days: 0,
        jurisdiction_whitelist: ['US', 'GB', 'CN'],
        transfer_whitelist: [accreditedGbId],
      }),
    });

    // Try to transfer to someone NOT on the whitelist
    const result = await api<ValidationResult>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: asset2.id,
        from_investor_id: accreditedUsId,
        to_investor_id: nonAccreditedUsId,
        units: 1000,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.toLowerCase().includes('whitelist'))).toBe(true);
  });

  // ── Execute Should Also Reject ────────────────────────

  it('should reject execution of invalid transfer (not just simulation)', async () => {
    try {
      await api('/transfers', {
        method: 'POST',
        body: JSON.stringify({
          asset_id: assetId,
          from_investor_id: accreditedUsId,
          to_investor_id: accreditedUsId, // self-transfer
          units: 1000,
          execution_date: new Date().toISOString(),
        }),
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (err: unknown) {
      const error = err as { status: number; violations?: string[] };
      expect(error.status).toBe(422);
      expect(error.violations).toBeDefined();
    }
  });
});