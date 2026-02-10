import { describe, it, expect } from 'vitest';
import { validateTransfer } from './validator.js';
import { ValidationContext } from './types.js';
import { Investor, Holding, RuleSet } from '../backend/models/index.js';

describe('Rules Engine - Transfer Validation', () => {
  // Helper function to create a base valid context
  function createBaseContext(): ValidationContext {
    const fromInvestor: Investor = {
      id: 'inv-001',
      name: 'Alice',
      jurisdiction: 'US',
      accredited: true,
      investor_type: 'professional' as const,
      kyc_status: 'verified' as const,
      kyc_expiry: null,
      tax_id: null,
      lei: null,
      email: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const toInvestor: Investor = {
      id: 'inv-002',
      name: 'Bob',
      jurisdiction: 'US',
      accredited: true,
      investor_type: 'professional' as const,
      kyc_status: 'verified' as const,
      kyc_expiry: null,
      tax_id: null,
      lei: null,
      email: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const fromHolding: Holding = {
      id: 'hold-001',
      investor_id: 'inv-001',
      asset_id: 'asset-001',
      units: 1000,
      acquired_at: '2024-01-01T00:00:00.000Z',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const rules: RuleSet = {
      id: 'rule-001',
      asset_id: 'asset-001',
      version: 1,
      qualification_required: false,
      lockup_days: 0,
      jurisdiction_whitelist: [],
      transfer_whitelist: null,
      investor_type_whitelist: null,
      minimum_investment: null,
      maximum_investors: null,
      concentration_limit_pct: null,
      kyc_required: false,
      created_at: '2024-01-01T00:00:00.000Z',
    };

    return {
      transfer: {
        asset_id: 'asset-001',
        from_investor_id: 'inv-001',
        to_investor_id: 'inv-002',
        units: 100,
        execution_date: '2024-06-01T00:00:00.000Z',
      },
      fromInvestor,
      toInvestor,
      fromHolding,
      rules,
    };
  }

  describe('Valid Transfer Scenarios', () => {
    it('should pass with minimal restrictions (no rules enforced)', () => {
      const ctx = createBaseContext();
      const result = validateTransfer(ctx);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should pass when all rules are satisfied', () => {
      const ctx = createBaseContext();
      ctx.rules.qualification_required = true;
      ctx.rules.lockup_days = 30;
      ctx.rules.jurisdiction_whitelist = ['US', 'UK'];
      ctx.toInvestor.accredited = true;

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Qualification Check', () => {
    it('should fail when recipient is not accredited and qualification is required', () => {
      const ctx = createBaseContext();
      ctx.rules.qualification_required = true;
      ctx.toInvestor.accredited = false;

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('not accredited');
    });

    it('should pass when recipient is not accredited but qualification is not required', () => {
      const ctx = createBaseContext();
      ctx.rules.qualification_required = false;
      ctx.toInvestor.accredited = false;

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(true);
    });
  });

  describe('Lockup Period Check', () => {
    it('should fail when lockup period has not elapsed', () => {
      const ctx = createBaseContext();
      ctx.rules.lockup_days = 365;
      ctx.fromHolding!.acquired_at = '2024-05-01T00:00:00.000Z';
      ctx.transfer.execution_date = '2024-06-01T00:00:00.000Z'; // Only 31 days later

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Lockup period violation');
      expect(result.violations[0]).toContain('365 day lockup');
    });

    it('should pass when lockup period has elapsed', () => {
      const ctx = createBaseContext();
      ctx.rules.lockup_days = 30;
      ctx.fromHolding!.acquired_at = '2024-01-01T00:00:00.000Z';
      ctx.transfer.execution_date = '2024-06-01T00:00:00.000Z'; // 151 days later

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(true);
    });

    it('should pass when lockup is 0 days', () => {
      const ctx = createBaseContext();
      ctx.rules.lockup_days = 0;
      ctx.fromHolding!.acquired_at = '2024-06-01T00:00:00.000Z';
      ctx.transfer.execution_date = '2024-06-01T00:00:00.000Z'; // Same day

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(true);
    });
  });

  describe('Jurisdiction Whitelist Check', () => {
    it('should fail when recipient jurisdiction is not in whitelist', () => {
      const ctx = createBaseContext();
      ctx.rules.jurisdiction_whitelist = ['UK', 'CA'];
      ctx.toInvestor.jurisdiction = 'US';

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('not in whitelist');
      expect(result.violations[0]).toContain('UK, CA');
    });

    it('should pass when recipient jurisdiction is in whitelist', () => {
      const ctx = createBaseContext();
      ctx.rules.jurisdiction_whitelist = ['US', 'UK', 'CA'];
      ctx.toInvestor.jurisdiction = 'US';

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(true);
    });

    it('should pass when jurisdiction whitelist is empty (unrestricted)', () => {
      const ctx = createBaseContext();
      ctx.rules.jurisdiction_whitelist = [];
      ctx.toInvestor.jurisdiction = 'CN';

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(true);
    });
  });

  describe('Transfer Whitelist Check', () => {
    it('should fail when recipient is not in transfer whitelist', () => {
      const ctx = createBaseContext();
      ctx.rules.transfer_whitelist = ['inv-003', 'inv-004'];
      ctx.toInvestor.id = 'inv-002';

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('not in transfer whitelist');
    });

    it('should pass when recipient is in transfer whitelist', () => {
      const ctx = createBaseContext();
      ctx.rules.transfer_whitelist = ['inv-002', 'inv-003'];
      ctx.toInvestor.id = 'inv-002';

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(true);
    });

    it('should pass when transfer whitelist is null (unrestricted)', () => {
      const ctx = createBaseContext();
      ctx.rules.transfer_whitelist = null;
      ctx.toInvestor.id = 'inv-999';

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(true);
    });
  });

  describe('Sufficient Units Check', () => {
    it('should fail when sender has insufficient units', () => {
      const ctx = createBaseContext();
      ctx.fromHolding!.units = 50;
      ctx.transfer.units = 100;

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Insufficient units');
      expect(result.violations[0]).toContain('has 50');
      expect(result.violations[0]).toContain('transfer 100');
    });

    it('should pass when sender has exact units', () => {
      const ctx = createBaseContext();
      ctx.fromHolding!.units = 100;
      ctx.transfer.units = 100;

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(true);
    });

    it('should fail when sender has no holding', () => {
      const ctx = createBaseContext();
      ctx.fromHolding = null;

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.includes('no holding'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should fail when transfer units are zero', () => {
      const ctx = createBaseContext();
      ctx.transfer.units = 0;

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('greater than zero');
    });

    it('should fail when transfer units are negative', () => {
      const ctx = createBaseContext();
      ctx.transfer.units = -100;

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('greater than zero');
    });

    it('should fail when transferring to self', () => {
      const ctx = createBaseContext();
      ctx.transfer.to_investor_id = 'inv-001'; // Same as from_investor_id

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('Cannot transfer to yourself');
    });
  });

  describe('Multiple Violations', () => {
    it('should return all violations when multiple rules fail', () => {
      const ctx = createBaseContext();
      ctx.rules.qualification_required = true;
      ctx.rules.lockup_days = 365;
      ctx.rules.jurisdiction_whitelist = ['UK'];
      ctx.toInvestor.accredited = false;
      ctx.toInvestor.jurisdiction = 'US';
      ctx.fromHolding!.acquired_at = '2024-05-01T00:00:00.000Z';
      ctx.transfer.execution_date = '2024-06-01T00:00:00.000Z';

      const result = validateTransfer(ctx);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
      expect(result.violations.some(v => v.includes('not accredited'))).toBe(true);
      expect(result.violations.some(v => v.includes('Lockup period'))).toBe(true);
      expect(result.violations.some(v => v.includes('not in whitelist'))).toBe(true);
    });
  });
});