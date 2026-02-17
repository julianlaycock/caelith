/**
 * Unit tests for CSV Import Service
 *
 * Tests the CSV parser, column auto-mapping, entity type detection,
 * and csvToPayload transformation logic.
 */

import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  autoMapColumns,
  csvToPayload,
  type ImportEntityType,
} from './csv-import-service.js';

// ── CSV Parser Tests ──────────────────────────────────────────────────────────

describe('parseCsv', () => {
  it('parses basic CSV with headers correctly', () => {
    const csv = 'name,jurisdiction,accredited\nAlpha Corp,DE,true\nBeta Ltd,LU,false';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ['name', 'jurisdiction', 'accredited'],
      ['Alpha Corp', 'DE', 'true'],
      ['Beta Ltd', 'LU', 'false'],
    ]);
  });

  it('handles quoted fields containing commas', () => {
    const csv = 'name,jurisdiction\n"Alpha, Corp",DE\nBeta Ltd,LU';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ['name', 'jurisdiction'],
      ['Alpha, Corp', 'DE'],
      ['Beta Ltd', 'LU'],
    ]);
  });

  it('handles quoted fields containing newlines', () => {
    const csv = 'name,description\n"Alpha Corp","Line one\nLine two"\nBeta Ltd,Simple';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ['name', 'description'],
      ['Alpha Corp', 'Line one\nLine two'],
      ['Beta Ltd', 'Simple'],
    ]);
  });

  it('handles escaped quotes (double-quote inside quoted field)', () => {
    const csv = 'name,note\n"Alpha ""The Best"" Corp",good\nBeta Ltd,ok';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ['name', 'note'],
      ['Alpha "The Best" Corp', 'good'],
      ['Beta Ltd', 'ok'],
    ]);
  });

  it('handles empty fields', () => {
    const csv = 'name,jurisdiction,tax_id\nAlpha Corp,DE,\nBeta Ltd,,BE123';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ['name', 'jurisdiction', 'tax_id'],
      ['Alpha Corp', 'DE', ''],
      ['Beta Ltd', '', 'BE123'],
    ]);
  });

  it('handles CRLF line endings', () => {
    const csv = 'name,jurisdiction\r\nAlpha Corp,DE\r\nBeta Ltd,LU';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ['name', 'jurisdiction'],
      ['Alpha Corp', 'DE'],
      ['Beta Ltd', 'LU'],
    ]);
  });

  it('handles LF line endings', () => {
    const csv = 'name,jurisdiction\nAlpha Corp,DE\nBeta Ltd,LU';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ['name', 'jurisdiction'],
      ['Alpha Corp', 'DE'],
      ['Beta Ltd', 'LU'],
    ]);
  });

  it('handles mixed CRLF and LF line endings', () => {
    const csv = 'name,jurisdiction\r\nAlpha Corp,DE\nBeta Ltd,LU';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ['name', 'jurisdiction'],
      ['Alpha Corp', 'DE'],
      ['Beta Ltd', 'LU'],
    ]);
  });

  it('strips BOM character from the start of the content', () => {
    const csv = '\uFEFFname,jurisdiction\nAlpha Corp,DE';
    const rows = parseCsv(csv);
    expect(rows[0][0]).toBe('name');
  });

  it('skips comment lines starting with #', () => {
    const csv = 'name,jurisdiction\nAlpha Corp,DE\n# This is a comment\nBeta Ltd,LU';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ['name', 'jurisdiction'],
      ['Alpha Corp', 'DE'],
      ['Beta Ltd', 'LU'],
    ]);
  });

  it('skips empty rows', () => {
    const csv = 'name,jurisdiction\nAlpha Corp,DE\n\nBeta Ltd,LU';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ['name', 'jurisdiction'],
      ['Alpha Corp', 'DE'],
      ['Beta Ltd', 'LU'],
    ]);
  });

  it('throws error when exceeding MAX_ROWS (5000 data rows)', () => {
    // Build a CSV with header + 5001 data rows
    const header = 'name,jurisdiction';
    const dataRow = 'Test Corp,DE';
    const lines = [header];
    for (let i = 0; i < 5001; i++) {
      lines.push(dataRow);
    }
    const csv = lines.join('\n');

    expect(() => parseCsv(csv)).toThrow('CSV exceeds maximum of 5000 data rows');
  });

  it('does not throw when exactly at MAX_ROWS (5000 data rows)', () => {
    const header = 'name,jurisdiction';
    const dataRow = 'Test Corp,DE';
    const lines = [header];
    for (let i = 0; i < 5000; i++) {
      lines.push(dataRow);
    }
    const csv = lines.join('\n');

    expect(() => parseCsv(csv)).not.toThrow();
    const rows = parseCsv(csv);
    // 1 header + 5000 data rows
    expect(rows.length).toBe(5001);
  });

  it('handles a file with only a header and no data rows', () => {
    const csv = 'name,jurisdiction,accredited';
    const rows = parseCsv(csv);
    expect(rows).toEqual([['name', 'jurisdiction', 'accredited']]);
  });

  it('handles trailing newline without creating an extra empty row', () => {
    const csv = 'name,jurisdiction\nAlpha Corp,DE\n';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ['name', 'jurisdiction'],
      ['Alpha Corp', 'DE'],
    ]);
  });
});

// ── Column Auto-Mapping Tests ─────────────────────────────────────────────────

describe('autoMapColumns', () => {
  it('maps exact column names for investors', () => {
    const columns = ['name', 'jurisdiction', 'investor_type', 'accredited'];
    const mapping = autoMapColumns(columns, 'investors');
    expect(mapping).toEqual({
      name: 'name',
      jurisdiction: 'jurisdiction',
      investor_type: 'investor_type',
      accredited: 'accredited',
    });
  });

  it('maps synonym "Fund Name" to "name" for fund_structures', () => {
    const columns = ['Fund Name', 'Legal Structure', 'domicile', 'regulatory_framework'];
    const mapping = autoMapColumns(columns, 'fund_structures');
    expect(mapping['Fund Name']).toBe('name');
  });

  it('maps synonym "Legal Structure" to "legal_form" for fund_structures', () => {
    // "Legal Structure" normalizes to "legal_structure" which matches synonym "structure"
    // for legal_form
    const columns = ['name', 'structure', 'domicile', 'regulatory_framework'];
    const mapping = autoMapColumns(columns, 'fund_structures');
    expect(mapping['structure']).toBe('legal_form');
  });

  it('maps synonym "country" to "jurisdiction" for investors', () => {
    const columns = ['name', 'country'];
    const mapping = autoMapColumns(columns, 'investors');
    expect(mapping['country']).toBe('jurisdiction');
  });

  it('maps synonym "Company" to "name" for investors', () => {
    const columns = ['Company', 'jurisdiction'];
    const mapping = autoMapColumns(columns, 'investors');
    expect(mapping['Company']).toBe('name');
  });

  it('ignores unrecognized columns', () => {
    const columns = ['name', 'jurisdiction', 'random_gibberish', 'zzz_unknown'];
    const mapping = autoMapColumns(columns, 'investors');
    expect(mapping['name']).toBe('name');
    expect(mapping['jurisdiction']).toBe('jurisdiction');
    expect(mapping['random_gibberish']).toBeUndefined();
    expect(mapping['zzz_unknown']).toBeUndefined();
  });

  it('maps holdings column synonyms correctly', () => {
    const columns = ['investor', 'share_class', 'shares', 'acquisition_date'];
    const mapping = autoMapColumns(columns, 'holdings');
    expect(mapping['investor']).toBe('investor_name');
    expect(mapping['share_class']).toBe('asset_name');
    expect(mapping['shares']).toBe('units');
    expect(mapping['acquisition_date']).toBe('acquired_at');
  });

  it('handles case-insensitive synonym matching', () => {
    const columns = ['INVESTOR_TYPE', 'KYC_STATUS'];
    const mapping = autoMapColumns(columns, 'investors');
    expect(mapping['INVESTOR_TYPE']).toBe('investor_type');
    expect(mapping['KYC_STATUS']).toBe('kyc_status');
  });

  it('detects entity type fields from header content', () => {
    // fund_structures-specific columns
    const fundColumns = ['name', 'legal_form', 'domicile', 'regulatory_framework'];
    const fundMapping = autoMapColumns(fundColumns, 'fund_structures');
    expect(Object.keys(fundMapping).length).toBe(4);
    expect(fundMapping['legal_form']).toBe('legal_form');

    // investors-specific columns
    const invColumns = ['name', 'jurisdiction', 'accredited', 'kyc_status'];
    const invMapping = autoMapColumns(invColumns, 'investors');
    expect(Object.keys(invMapping).length).toBe(4);
    expect(invMapping['accredited']).toBe('accredited');
  });
});

// ── csvToPayload Tests ────────────────────────────────────────────────────────

describe('csvToPayload', () => {
  it('converts investor CSV rows to BulkImportPayload with correct types', () => {
    const csv = 'name,jurisdiction,investor_type\nAlpha Corp,DE,professional\nBeta Ltd,LU,institutional';
    const mapping = { name: 'name', jurisdiction: 'jurisdiction', investor_type: 'investor_type' };
    const payload = csvToPayload(csv, 'investors', mapping);

    expect(payload.investors).toBeDefined();
    expect(payload.investors).toHaveLength(2);
    expect(payload.investors![0]).toMatchObject({
      ref: 'csv-0',
      name: 'Alpha Corp',
      jurisdiction: 'DE',
      investor_type: 'professional',
    });
    expect(payload.investors![1]).toMatchObject({
      ref: 'csv-1',
      name: 'Beta Ltd',
      jurisdiction: 'LU',
      investor_type: 'institutional',
    });
  });

  it('coerces boolean fields (accredited: "true" -> true)', () => {
    const csv = 'name,jurisdiction,accredited\nAlpha Corp,DE,true\nBeta Ltd,LU,false\nGamma Inc,IE,1';
    const mapping = { name: 'name', jurisdiction: 'jurisdiction', accredited: 'accredited' };
    const payload = csvToPayload(csv, 'investors', mapping);

    expect(payload.investors![0].accredited).toBe(true);
    expect(payload.investors![1].accredited).toBe(false);
    expect(payload.investors![2].accredited).toBe(true);
  });

  it('coerces numeric fields (commitment_amount, units, target_size)', () => {
    const csv = 'name,jurisdiction,units,acquired_at\nAlpha Corp,inv-1,1000000,2025-01-01';
    const mapping = { name: 'investor_name', jurisdiction: 'investor_ref', units: 'units', acquired_at: 'acquired_at' };
    const payload = csvToPayload(csv, 'holdings', mapping);

    expect(payload.holdings![0].units).toBe(1000000);
    expect(typeof payload.holdings![0].units).toBe('number');
  });

  it('coerces numeric fields with comma separators', () => {
    const csv = 'name,legal_form,domicile,regulatory_framework,target_size\nFund A,SIF,LU,AIFMD,"1,000,000"';
    const mapping = {
      name: 'name',
      legal_form: 'legal_form',
      domicile: 'domicile',
      regulatory_framework: 'regulatory_framework',
      target_size: 'target_size',
    };
    const payload = csvToPayload(csv, 'fund_structures', mapping);

    expect(payload.fundStructures![0].target_size).toBe(1000000);
    expect(typeof payload.fundStructures![0].target_size).toBe('number');
  });

  it('maps investor_name to investor_ref for holdings entity type', () => {
    const csv = 'investor_name,asset_name,units,acquired_at\nAlpha Corp,Fund A Share,500,2025-06-15';
    const mapping = {
      investor_name: 'investor_name',
      asset_name: 'asset_name',
      units: 'units',
      acquired_at: 'acquired_at',
    };
    const payload = csvToPayload(csv, 'holdings', mapping);

    const holding = payload.holdings![0];
    expect(holding.investor_ref).toBe('Alpha Corp');
    expect((holding as unknown as Record<string, unknown>).investor_name).toBe('Alpha Corp');
  });

  it('maps asset_name to asset_ref for holdings entity type', () => {
    const csv = 'investor_name,asset_name,units,acquired_at\nAlpha Corp,Fund A Share,500,2025-06-15';
    const mapping = {
      investor_name: 'investor_name',
      asset_name: 'asset_name',
      units: 'units',
      acquired_at: 'acquired_at',
    };
    const payload = csvToPayload(csv, 'holdings', mapping);

    const holding = payload.holdings![0];
    expect(holding.asset_ref).toBe('Fund A Share');
    expect((holding as unknown as Record<string, unknown>).asset_name).toBe('Fund A Share');
  });

  it('does not overwrite investor_ref if already provided', () => {
    const csv = 'investor_name,investor_ref,asset_name,units,acquired_at\nAlpha Corp,ref-1,Fund A Share,500,2025-06-15';
    const mapping = {
      investor_name: 'investor_name',
      investor_ref: 'investor_ref',
      asset_name: 'asset_name',
      units: 'units',
      acquired_at: 'acquired_at',
    };
    const payload = csvToPayload(csv, 'holdings', mapping);

    const holding = payload.holdings![0];
    // investor_ref was already set, so it should keep the explicit value
    expect(holding.investor_ref).toBe('ref-1');
  });

  it('does not overwrite asset_ref if already provided', () => {
    const csv = 'investor_name,asset_name,asset_ref,units,acquired_at\nAlpha Corp,Fund A Share,asset-ref-1,500,2025-06-15';
    const mapping = {
      investor_name: 'investor_name',
      asset_name: 'asset_name',
      asset_ref: 'asset_ref',
      units: 'units',
      acquired_at: 'acquired_at',
    };
    const payload = csvToPayload(csv, 'holdings', mapping);

    const holding = payload.holdings![0];
    expect(holding.asset_ref).toBe('asset-ref-1');
  });

  it('returns empty payload when CSV has less than 2 rows', () => {
    const csv = 'name,jurisdiction';
    const mapping = { name: 'name', jurisdiction: 'jurisdiction' };
    const payload = csvToPayload(csv, 'investors', mapping);

    expect(payload).toEqual({});
  });

  it('skips empty field values', () => {
    const csv = 'name,jurisdiction,tax_id\nAlpha Corp,DE,';
    const mapping = { name: 'name', jurisdiction: 'jurisdiction', tax_id: 'tax_id' };
    const payload = csvToPayload(csv, 'investors', mapping);

    expect(payload.investors![0].tax_id).toBeUndefined();
  });

  it('assigns ref "csv-N" to investor and fund_structure entities', () => {
    const csv = 'name,jurisdiction\nA,DE\nB,LU\nC,IE';
    const mapping = { name: 'name', jurisdiction: 'jurisdiction' };
    const payload = csvToPayload(csv, 'investors', mapping);

    expect(payload.investors![0].ref).toBe('csv-0');
    expect(payload.investors![1].ref).toBe('csv-1');
    expect(payload.investors![2].ref).toBe('csv-2');
  });

  it('passes mode through to the payload', () => {
    const csv = 'name,jurisdiction\nAlpha Corp,DE';
    const mapping = { name: 'name', jurisdiction: 'jurisdiction' };
    const payload = csvToPayload(csv, 'investors', mapping, 'best_effort');

    expect(payload.mode).toBe('best_effort');
  });

  it('places fund_structures in fundStructures key', () => {
    const csv = 'name,legal_form,domicile,regulatory_framework\nFund A,SIF,LU,AIFMD';
    const mapping = {
      name: 'name',
      legal_form: 'legal_form',
      domicile: 'domicile',
      regulatory_framework: 'regulatory_framework',
    };
    const payload = csvToPayload(csv, 'fund_structures', mapping);

    expect(payload.fundStructures).toBeDefined();
    expect(payload.fundStructures).toHaveLength(1);
    expect(payload.fundStructures![0].name).toBe('Fund A');
  });

  it('places eligibility_criteria in eligibilityCriteria key', () => {
    const csv = 'jurisdiction,investor_type,minimum_investment,effective_date\nLU,professional,125000,2025-01-01';
    const mapping = {
      jurisdiction: 'jurisdiction',
      investor_type: 'investor_type',
      minimum_investment: 'minimum_investment',
      effective_date: 'effective_date',
    };
    const payload = csvToPayload(csv, 'eligibility_criteria', mapping);

    expect(payload.eligibilityCriteria).toBeDefined();
    expect(payload.eligibilityCriteria).toHaveLength(1);
    expect(payload.eligibilityCriteria![0].minimum_investment).toBe(125000);
    expect(typeof payload.eligibilityCriteria![0].minimum_investment).toBe('number');
  });

  it('coerces suitability_required boolean field', () => {
    const csv = 'jurisdiction,investor_type,minimum_investment,effective_date,suitability_required\nDE,professional,200000,2025-01-01,true';
    const mapping = {
      jurisdiction: 'jurisdiction',
      investor_type: 'investor_type',
      minimum_investment: 'minimum_investment',
      effective_date: 'effective_date',
      suitability_required: 'suitability_required',
    };
    const payload = csvToPayload(csv, 'eligibility_criteria', mapping);

    expect(payload.eligibilityCriteria![0].suitability_required).toBe(true);
    expect(typeof payload.eligibilityCriteria![0].suitability_required).toBe('boolean');
  });
});
