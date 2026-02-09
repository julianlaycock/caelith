import { describe, it, expect } from 'vitest';
import { validateTransfer } from './validator.js';
import { ValidationContext, CompositeRule } from './types.js';

// Base context factory
function makeCtx(overrides?: Partial<ValidationContext>): ValidationContext {
  return {
    transfer: {
      asset_id: 'asset-1',
      from_investor_id: 'inv-1',
      to_investor_id: 'inv-2',
      units: 100,
      execution_date: '2026-06-01T00:00:00Z',
    },
    fromInvestor: {
      id: 'inv-1',
      name: 'Alice',
      jurisdiction: 'DE',
      accredited: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    toInvestor: {
      id: 'inv-2',
      name: 'Bob',
      jurisdiction: 'US',
      accredited: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    fromHolding: {
      id: 'hold-1',
      investor_id: 'inv-1',
      asset_id: 'asset-1',
      units: 1000,
      acquired_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    rules: {
      id: 'rule-1',
      asset_id: 'asset-1',
      version: 1,
      qualification_required: false,
      lockup_days: 0,
      jurisdiction_whitelist: [],
      transfer_whitelist: null,
      created_at: '2026-01-01T00:00:00Z',
    },
    ...overrides,
  };
}

describe('Composite Rules', () => {
  it('AND: should pass when all conditions are met', () => {
    const rule: CompositeRule = {
      id: 'cr-1',
      name: 'EU accredited only',
      description: 'Recipient must be accredited and in EU',
      operator: 'AND',
      conditions: [
        { field: 'to.accredited', operator: 'eq', value: true },
        { field: 'to.jurisdiction', operator: 'in', value: ['DE', 'FR', 'ES', 'US'] },
      ],
      enabled: true,
    };
    const ctx = makeCtx({ customRules: [rule] });
    const result = validateTransfer(ctx);
    expect(result.valid).toBe(true);
  });

  it('AND: should fail when one condition fails', () => {
    const rule: CompositeRule = {
      id: 'cr-2',
      name: 'EU accredited only',
      description: 'Recipient must be accredited and in EU',
      operator: 'AND',
      conditions: [
        { field: 'to.accredited', operator: 'eq', value: true },
        { field: 'to.jurisdiction', operator: 'in', value: ['DE', 'FR', 'ES'] },
      ],
      enabled: true,
    };
    const ctx = makeCtx({ customRules: [rule] });
    const result = validateTransfer(ctx);
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('EU accredited only: failed — Recipient must be accredited and in EU');
  });

  it('OR: should pass when at least one condition is met', () => {
    const rule: CompositeRule = {
      id: 'cr-3',
      name: 'US or accredited',
      description: 'Recipient must be US-based or accredited',
      operator: 'OR',
      conditions: [
        { field: 'to.jurisdiction', operator: 'eq', value: 'US' },
        { field: 'to.accredited', operator: 'eq', value: true },
      ],
      enabled: true,
    };
    const ctx = makeCtx({ customRules: [rule] });
    const result = validateTransfer(ctx);
    expect(result.valid).toBe(true);
  });

  it('OR: should fail when no conditions are met', () => {
    const rule: CompositeRule = {
      id: 'cr-4',
      name: 'JP or CN only',
      description: 'Recipient must be in JP or CN',
      operator: 'OR',
      conditions: [
        { field: 'to.jurisdiction', operator: 'eq', value: 'JP' },
        { field: 'to.jurisdiction', operator: 'eq', value: 'CN' },
      ],
      enabled: true,
    };
    const ctx = makeCtx({ customRules: [rule] });
    const result = validateTransfer(ctx);
    expect(result.valid).toBe(false);
  });

  it('NOT: should pass when condition is false', () => {
    const rule: CompositeRule = {
      id: 'cr-5',
      name: 'Not sanctioned',
      description: 'Recipient must not be in sanctioned jurisdiction',
      operator: 'NOT',
      conditions: [
        { field: 'to.jurisdiction', operator: 'eq', value: 'RU' },
      ],
      enabled: true,
    };
    const ctx = makeCtx({ customRules: [rule] });
    const result = validateTransfer(ctx);
    expect(result.valid).toBe(true);
  });

  it('NOT: should fail when condition is true', () => {
    const rule: CompositeRule = {
      id: 'cr-6',
      name: 'Not US',
      description: 'Recipient must not be US-based',
      operator: 'NOT',
      conditions: [
        { field: 'to.jurisdiction', operator: 'eq', value: 'US' },
      ],
      enabled: true,
    };
    const ctx = makeCtx({ customRules: [rule] });
    const result = validateTransfer(ctx);
    expect(result.valid).toBe(false);
  });

  it('disabled rules should be skipped', () => {
    const rule: CompositeRule = {
      id: 'cr-7',
      name: 'Impossible rule',
      description: 'This would always fail',
      operator: 'AND',
      conditions: [
        { field: 'to.jurisdiction', operator: 'eq', value: 'NOWHERE' },
      ],
      enabled: false,
    };
    const ctx = makeCtx({ customRules: [rule] });
    const result = validateTransfer(ctx);
    expect(result.valid).toBe(true);
  });

  it('should include checks and summary in result', () => {
    const ctx = makeCtx();
    const result = validateTransfer(ctx);
    expect(result.checks.length).toBe(7);
    expect(result.summary).toContain('7/7 checks passed');
  });

  it('numeric comparisons should work', () => {
    const rule: CompositeRule = {
      id: 'cr-8',
      name: 'Min transfer',
      description: 'Transfer must be at least 500 units',
      operator: 'AND',
      conditions: [
        { field: 'transfer.units', operator: 'gte', value: 500 },
      ],
      enabled: true,
    };
    const ctx = makeCtx({ customRules: [rule] });
    const result = validateTransfer(ctx);
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toContain('Min transfer');
  });
});