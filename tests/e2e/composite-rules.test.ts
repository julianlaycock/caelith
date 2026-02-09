import { describe, it, expect, beforeAll } from 'vitest';
import { api, resetDb, ensureAuth } from '../fixtures/api-helper';

interface CreatedEntity {
  id: string;
  [key: string]: unknown;
}

describe('Composite Rules: End-to-End', () => {
  let assetId: string;
  let senderId: string;
  let receiverUsId: string;
  let receiverJpId: string;

  beforeAll(async () => {
    await ensureAuth();
    await resetDb();

    // Create asset
    const asset = await api<CreatedEntity>('/assets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Composite Rules Fund', asset_type: 'Fund', total_units: 100000 }),
    });
    assetId = asset.id;

    // Create investors
    const sender = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Sender', jurisdiction: 'US', accredited: true }),
    });
    senderId = sender.id;

    const recUs = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Receiver US', jurisdiction: 'US', accredited: true }),
    });
    receiverUsId = recUs.id;

    const recJp = await api<CreatedEntity>('/investors', {
      method: 'POST',
      body: JSON.stringify({ name: 'Receiver JP', jurisdiction: 'JP', accredited: true }),
    });
    receiverJpId = recJp.id;

    // Allocate units
    await api('/holdings', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        investor_id: senderId,
        units: 50000,
        acquired_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });

    // Basic rules (permissive — no lockup, no qualification, wide jurisdiction)
    await api('/rules', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        qualification_required: false,
        lockup_days: 0,
        jurisdiction_whitelist: ['US', 'GB', 'JP', 'DE'],
        transfer_whitelist: null,
      }),
    });
  });

  it('should create a composite rule via API', async () => {
    const rule = await api<CreatedEntity>('/composite-rules', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        name: 'US only recipients',
        description: 'Only US-based investors can receive transfers',
        operator: 'AND',
        conditions: [
          { field: 'to.jurisdiction', operator: 'eq', value: 'US' },
        ],
      }),
    });

    expect(rule.id).toBeDefined();
    expect(rule.name).toBe('US only recipients');
    expect(rule.enabled).toBe(true);
  });

  it('should list composite rules for an asset', async () => {
    const rules = await api<CreatedEntity[]>(`/composite-rules?assetId=${assetId}`);
    expect(rules.length).toBe(1);
    expect(rules[0].name).toBe('US only recipients');
  });

  it('should enforce composite rule during simulation — US recipient passes', async () => {
    const result = await api<{ valid: boolean; checks: { rule: string; passed: boolean }[] }>(
      '/transfers/simulate',
      {
        method: 'POST',
        body: JSON.stringify({
          asset_id: assetId,
          from_investor_id: senderId,
          to_investor_id: receiverUsId,
          units: 1000,
          execution_date: new Date().toISOString(),
        }),
      }
    );

    expect(result.valid).toBe(true);
    const compositeCheck = result.checks.find((c) => c.rule === 'US only recipients');
    expect(compositeCheck).toBeDefined();
    expect(compositeCheck!.passed).toBe(true);
  });

  it('should enforce composite rule during simulation — JP recipient fails', async () => {
    const result = await api<{ valid: boolean; violations: string[]; checks: { rule: string; passed: boolean }[] }>(
      '/transfers/simulate',
      {
        method: 'POST',
        body: JSON.stringify({
          asset_id: assetId,
          from_investor_id: senderId,
          to_investor_id: receiverJpId,
          units: 1000,
          execution_date: new Date().toISOString(),
        }),
      }
    );

    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('US only recipients'))).toBe(true);
  });

  it('should disable a composite rule', async () => {
    const rules = await api<CreatedEntity[]>(`/composite-rules?assetId=${assetId}`);
    const ruleId = rules[0].id;

    await api(`/composite-rules/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: false }),
    });

    // Now JP recipient should pass
    const result = await api<{ valid: boolean }>('/transfers/simulate', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: assetId,
        from_investor_id: senderId,
        to_investor_id: receiverJpId,
        units: 1000,
        execution_date: new Date().toISOString(),
      }),
    });

    expect(result.valid).toBe(true);
  });

  it('should delete a composite rule', async () => {
    const rules = await api<CreatedEntity[]>(`/composite-rules?assetId=${assetId}`);
    const ruleId = rules[0].id;

    await api(`/composite-rules/${ruleId}`, { method: 'DELETE' });

    const remaining = await api<CreatedEntity[]>(`/composite-rules?assetId=${assetId}`);
    expect(remaining.length).toBe(0);
  });
});