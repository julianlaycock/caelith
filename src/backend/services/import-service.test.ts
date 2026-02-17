/**
 * Unit tests for Import Service — validation logic
 *
 * Tests validatePayload in isolation (no database required).
 * The validatePayload function is a pure synchronous validator.
 */

import { describe, it, expect } from 'vitest';
import { validatePayload } from './import-service.js';
import type {
  BulkImportPayload,
  BulkInvestor,
  BulkFundStructure,
  BulkHolding,
  BulkEligibilityCriteria,
} from './import-service.js';

// ── validatePayload Tests ─────────────────────────────────────────────────────

describe('validatePayload', () => {
  it('returns no errors for a completely empty payload', () => {
    const payload: BulkImportPayload = {};
    const errors = validatePayload(payload);
    expect(errors).toEqual([]);
  });

  it('returns no errors for a valid investor payload', () => {
    const payload: BulkImportPayload = {
      investors: [
        { name: 'Alpha Corp', jurisdiction: 'DE', investor_type: 'professional' } as BulkInvestor,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors).toEqual([]);
  });

  it('rejects investors with missing name', () => {
    const payload: BulkImportPayload = {
      investors: [
        { name: '', jurisdiction: 'DE' } as BulkInvestor,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('investors[0]') && e.includes('name is required'))).toBe(true);
  });

  it('rejects investors with missing jurisdiction', () => {
    const payload: BulkImportPayload = {
      investors: [
        { name: 'Alpha Corp', jurisdiction: '' } as BulkInvestor,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('investors[0]') && e.includes('jurisdiction is required'))).toBe(true);
  });

  it('rejects investors with invalid investor_type', () => {
    const payload: BulkImportPayload = {
      investors: [
        { name: 'Alpha Corp', jurisdiction: 'DE', investor_type: 'invalid_type' as never } as BulkInvestor,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes("invalid investor_type 'invalid_type'"))).toBe(true);
  });

  it('rejects investors with invalid kyc_status', () => {
    const payload: BulkImportPayload = {
      investors: [
        { name: 'Alpha Corp', jurisdiction: 'DE', kyc_status: 'bogus' as never } as BulkInvestor,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes("invalid kyc_status 'bogus'"))).toBe(true);
  });

  it('rejects investors with duplicate ref values', () => {
    const payload: BulkImportPayload = {
      investors: [
        { ref: 'dup', name: 'Alpha Corp', jurisdiction: 'DE' } as BulkInvestor,
        { ref: 'dup', name: 'Beta Ltd', jurisdiction: 'LU' } as BulkInvestor,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes("duplicate ref 'dup'"))).toBe(true);
  });

  it('rejects fund_structures with missing name', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        {
          name: '',
          legal_form: 'SIF',
          domicile: 'LU',
          regulatory_framework: 'AIFMD',
        } as BulkFundStructure,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('fundStructures[0]') && e.includes('name is required'))).toBe(true);
  });

  it('rejects fund_structures with missing legal_form', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        {
          name: 'Test Fund',
          legal_form: '' as never,
          domicile: 'LU',
          regulatory_framework: 'AIFMD',
        } as BulkFundStructure,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('fundStructures[0]') && e.includes('legal_form is required'))).toBe(true);
  });

  it('rejects fund_structures with invalid legal_form', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        {
          name: 'Test Fund',
          legal_form: 'INVALID_FORM' as never,
          domicile: 'LU',
          regulatory_framework: 'AIFMD',
        } as BulkFundStructure,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes("invalid legal_form 'INVALID_FORM'"))).toBe(true);
  });

  it('rejects fund_structures with missing domicile', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        {
          name: 'Test Fund',
          legal_form: 'SIF',
          domicile: '',
          regulatory_framework: 'AIFMD',
        } as BulkFundStructure,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('fundStructures[0]') && e.includes('domicile is required'))).toBe(true);
  });

  it('rejects fund_structures with missing regulatory_framework', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        {
          name: 'Test Fund',
          legal_form: 'SIF',
          domicile: 'LU',
          regulatory_framework: '' as never,
        } as BulkFundStructure,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('fundStructures[0]') && e.includes('regulatory_framework is required'))).toBe(true);
  });

  it('rejects fund_structures with invalid regulatory_framework', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        {
          name: 'Test Fund',
          legal_form: 'SIF',
          domicile: 'LU',
          regulatory_framework: 'MiFID' as never,
        } as BulkFundStructure,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes("invalid regulatory_framework 'MiFID'"))).toBe(true);
  });

  it('rejects fund_structures with total_units <= 0', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        {
          name: 'Test Fund',
          legal_form: 'SIF',
          domicile: 'LU',
          regulatory_framework: 'AIFMD',
          total_units: 0,
        } as BulkFundStructure,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('total_units must be > 0'))).toBe(true);
  });

  it('rejects fund_structures with duplicate refs', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        { ref: 'f1', name: 'Fund A', legal_form: 'SIF', domicile: 'LU', regulatory_framework: 'AIFMD' } as BulkFundStructure,
        { ref: 'f1', name: 'Fund B', legal_form: 'RAIF', domicile: 'LU', regulatory_framework: 'AIFMD' } as BulkFundStructure,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes("duplicate ref 'f1'"))).toBe(true);
  });

  it('rejects holdings with missing investor_ref and investor_id', () => {
    const payload: BulkImportPayload = {
      holdings: [
        { asset_id: 'asset-1', units: 100, acquired_at: '2025-01-01' } as BulkHolding,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('holdings[0]') && e.includes('investor_ref or investor_id is required'))).toBe(true);
  });

  it('rejects holdings with missing asset_ref and asset_id', () => {
    const payload: BulkImportPayload = {
      holdings: [
        { investor_id: 'inv-1', units: 100, acquired_at: '2025-01-01' } as BulkHolding,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('holdings[0]') && e.includes('asset_ref or asset_id is required'))).toBe(true);
  });

  it('rejects holdings with units <= 0', () => {
    const payload: BulkImportPayload = {
      holdings: [
        { investor_id: 'inv-1', asset_id: 'asset-1', units: 0, acquired_at: '2025-01-01' } as BulkHolding,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('holdings[0]') && e.includes('units must be > 0'))).toBe(true);
  });

  it('rejects holdings with missing acquired_at', () => {
    const payload: BulkImportPayload = {
      holdings: [
        { investor_id: 'inv-1', asset_id: 'asset-1', units: 100, acquired_at: '' } as BulkHolding,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('holdings[0]') && e.includes('acquired_at is required'))).toBe(true);
  });

  it('rejects holdings with investor_ref that does not match any investor', () => {
    const payload: BulkImportPayload = {
      investors: [
        { ref: 'inv-ref-1', name: 'Alpha', jurisdiction: 'DE' } as BulkInvestor,
      ],
      holdings: [
        { investor_ref: 'nonexistent-ref', asset_id: 'asset-1', units: 100, acquired_at: '2025-01-01' } as BulkHolding,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes("investor_ref 'nonexistent-ref' does not match any investor"))).toBe(true);
  });

  it('rejects holdings with asset_ref that does not match any fund structure', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        { ref: 'fund-1', name: 'Fund A', legal_form: 'SIF', domicile: 'LU', regulatory_framework: 'AIFMD' } as BulkFundStructure,
      ],
      holdings: [
        { investor_id: 'inv-1', asset_ref: 'nonexistent-fund', units: 100, acquired_at: '2025-01-01' } as BulkHolding,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes("asset_ref 'nonexistent-fund' does not match any fund structure"))).toBe(true);
  });

  it('accepts holdings with valid investor_ref and asset_ref cross-references', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        { ref: 'fund-1', name: 'Fund A', legal_form: 'SIF', domicile: 'LU', regulatory_framework: 'AIFMD' } as BulkFundStructure,
      ],
      investors: [
        { ref: 'inv-1', name: 'Alpha', jurisdiction: 'DE' } as BulkInvestor,
      ],
      holdings: [
        { investor_ref: 'inv-1', asset_ref: 'fund-1', units: 100, acquired_at: '2025-01-01' } as BulkHolding,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors).toEqual([]);
  });

  it('rejects eligibility_criteria with missing fund_ref and fund_structure_id', () => {
    const payload: BulkImportPayload = {
      eligibilityCriteria: [
        {
          jurisdiction: 'LU',
          investor_type: 'professional',
          minimum_investment: 125000,
          effective_date: '2025-01-01',
        } as BulkEligibilityCriteria,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('fund_ref or fund_structure_id is required'))).toBe(true);
  });

  it('rejects eligibility_criteria with invalid investor_type', () => {
    const payload: BulkImportPayload = {
      eligibilityCriteria: [
        {
          fund_structure_id: 'fund-1',
          jurisdiction: 'LU',
          investor_type: 'alien' as never,
          minimum_investment: 125000,
          effective_date: '2025-01-01',
        } as BulkEligibilityCriteria,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes("invalid investor_type 'alien'"))).toBe(true);
  });

  it('rejects eligibility_criteria with negative minimum_investment', () => {
    const payload: BulkImportPayload = {
      eligibilityCriteria: [
        {
          fund_structure_id: 'fund-1',
          jurisdiction: 'LU',
          investor_type: 'professional',
          minimum_investment: -1,
          effective_date: '2025-01-01',
        } as BulkEligibilityCriteria,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('minimum_investment must be >= 0'))).toBe(true);
  });

  it('rejects eligibility_criteria with missing effective_date', () => {
    const payload: BulkImportPayload = {
      eligibilityCriteria: [
        {
          fund_structure_id: 'fund-1',
          jurisdiction: 'LU',
          investor_type: 'professional',
          minimum_investment: 125000,
          effective_date: '',
        } as BulkEligibilityCriteria,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('effective_date is required'))).toBe(true);
  });

  it('rejects eligibility_criteria with missing jurisdiction', () => {
    const payload: BulkImportPayload = {
      eligibilityCriteria: [
        {
          fund_structure_id: 'fund-1',
          jurisdiction: '',
          investor_type: 'professional',
          minimum_investment: 125000,
          effective_date: '2025-01-01',
        } as BulkEligibilityCriteria,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes('jurisdiction is required'))).toBe(true);
  });

  it('rejects eligibility_criteria with fund_ref not matching any fund', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        { ref: 'fund-1', name: 'Fund A', legal_form: 'SIF', domicile: 'LU', regulatory_framework: 'AIFMD' } as BulkFundStructure,
      ],
      eligibilityCriteria: [
        {
          fund_ref: 'nonexistent-fund',
          jurisdiction: 'LU',
          investor_type: 'professional',
          minimum_investment: 125000,
          effective_date: '2025-01-01',
        } as BulkEligibilityCriteria,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.some(e => e.includes("fund_ref 'nonexistent-fund' does not match any fund structure"))).toBe(true);
  });

  it('collects multiple errors from different entity types in a single pass', () => {
    const payload: BulkImportPayload = {
      investors: [
        { name: '', jurisdiction: '' } as BulkInvestor,
      ],
      fundStructures: [
        { name: '', legal_form: '' as never, domicile: '', regulatory_framework: '' as never } as BulkFundStructure,
      ],
    };
    const errors = validatePayload(payload);
    // Should have errors from both investor and fund_structure validation
    const investorErrors = errors.filter(e => e.includes('investors['));
    const fundErrors = errors.filter(e => e.includes('fundStructures['));
    expect(investorErrors.length).toBeGreaterThan(0);
    expect(fundErrors.length).toBeGreaterThan(0);
  });

  it('accepts valid eligibility_criteria with fund_ref matching a fund', () => {
    const payload: BulkImportPayload = {
      fundStructures: [
        { ref: 'fund-1', name: 'Fund A', legal_form: 'SIF', domicile: 'LU', regulatory_framework: 'AIFMD' } as BulkFundStructure,
      ],
      eligibilityCriteria: [
        {
          fund_ref: 'fund-1',
          jurisdiction: 'LU',
          investor_type: 'professional',
          minimum_investment: 125000,
          effective_date: '2025-01-01',
        } as BulkEligibilityCriteria,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors).toEqual([]);
  });

  it('accepts minimum_investment of 0 (free entry)', () => {
    const payload: BulkImportPayload = {
      eligibilityCriteria: [
        {
          fund_structure_id: 'fund-1',
          jurisdiction: 'LU',
          investor_type: 'institutional',
          minimum_investment: 0,
          effective_date: '2025-01-01',
        } as BulkEligibilityCriteria,
      ],
    };
    const errors = validatePayload(payload);
    expect(errors.filter(e => e.includes('minimum_investment'))).toEqual([]);
  });
});
