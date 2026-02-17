/**
 * Client-side CSV parser — ported from backend csv-import-service.ts
 * Pure string processing, no Node.js dependencies.
 */

import type { ImportEntityType, CsvParseResult } from './types';

// ── Schema definitions ───────────────────────────────────

const ENTITY_SCHEMAS: Record<ImportEntityType, { required: string[]; optional: string[] }> = {
  investors: {
    required: ['name', 'jurisdiction'],
    optional: ['investor_type', 'accredited', 'kyc_status', 'kyc_expiry', 'tax_id', 'lei', 'email'],
  },
  fund_structures: {
    required: ['name', 'legal_form', 'domicile', 'regulatory_framework'],
    optional: ['aifm_name', 'aifm_lei', 'inception_date', 'target_size', 'currency', 'status', 'asset_name', 'total_units'],
  },
  holdings: {
    required: ['units', 'acquired_at'],
    optional: ['investor_name', 'investor_id', 'investor_ref', 'asset_name', 'asset_id', 'asset_ref'],
  },
  eligibility_criteria: {
    required: ['jurisdiction', 'investor_type', 'minimum_investment', 'effective_date'],
    optional: ['fund_ref', 'fund_structure_id', 'maximum_allocation_pct', 'suitability_required', 'source_reference'],
  },
};

// ── Column synonyms ──────────────────────────────────────

const COLUMN_SYNONYMS: Record<string, string[]> = {
  name: ['name', 'investor_name', 'fund_name', 'entity_name', 'company', 'company_name', 'firm'],
  jurisdiction: ['jurisdiction', 'country', 'country_code', 'domicile_country', 'location'],
  investor_type: ['investor_type', 'type', 'classification', 'investor_classification', 'category'],
  accredited: ['accredited', 'is_accredited', 'qualified'],
  kyc_status: ['kyc_status', 'kyc', 'aml_status', 'verification_status'],
  kyc_expiry: ['kyc_expiry', 'kyc_expiration', 'kyc_expiry_date', 'verification_expiry'],
  tax_id: ['tax_id', 'tin', 'tax_number', 'tax_identification'],
  lei: ['lei', 'legal_entity_identifier'],
  email: ['email', 'contact_email', 'email_address'],
  legal_form: ['legal_form', 'fund_type', 'vehicle_type', 'structure'],
  domicile: ['domicile', 'country', 'jurisdiction', 'registered_country'],
  regulatory_framework: ['regulatory_framework', 'framework', 'regulation', 'regime'],
  aifm_name: ['aifm_name', 'manager', 'fund_manager', 'aifm'],
  aifm_lei: ['aifm_lei', 'manager_lei'],
  inception_date: ['inception_date', 'launch_date', 'start_date', 'formation_date'],
  target_size: ['target_size', 'fund_size', 'target_aum', 'size'],
  currency: ['currency', 'base_currency', 'fund_currency'],
  status: ['status', 'fund_status'],
  asset_name: ['asset_name', 'share_class', 'class_name'],
  total_units: ['total_units', 'total_shares', 'units_outstanding'],
  units: ['units', 'shares', 'quantity', 'amount'],
  acquired_at: ['acquired_at', 'acquisition_date', 'purchase_date', 'date'],
  investor_name: ['investor_name', 'investor', 'holder', 'lp_name'],
  investor_id: ['investor_id', 'investor_uuid'],
  asset_id: ['asset_id', 'asset_uuid'],
  minimum_investment: ['minimum_investment', 'min_investment', 'minimum', 'min_commitment'],
  effective_date: ['effective_date', 'start_date', 'valid_from'],
  maximum_allocation_pct: ['maximum_allocation_pct', 'max_allocation', 'concentration_limit'],
  suitability_required: ['suitability_required', 'suitability', 'suitability_test'],
  source_reference: ['source_reference', 'source', 'regulation_ref', 'legal_basis'],
};

// ── CSV Parser ───────────────────────────────────────────

const MAX_ROWS = 5000;

/**
 * Parse a CSV string into rows. Handles quoted fields with commas and newlines.
 */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  const text = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        if (ch === '\r') i++;
        row.push(current.trim());
        current = '';
        if (row.length > 0 && row[0] !== '' && !row[0].startsWith('#')) {
          rows.push(row);
          if (rows.length > MAX_ROWS + 1) {
            throw new Error(`CSV exceeds maximum of ${MAX_ROWS} data rows.`);
          }
        }
        row = [];
      } else {
        current += ch;
      }
    }
  }

  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.length > 0 && row[0] !== '' && !row[0].startsWith('#')) {
      rows.push(row);
    }
  }

  return rows;
}

// ── Header normalization ─────────────────────────────────

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// ── Auto-map columns ─────────────────────────────────────

export function autoMapColumns(
  csvColumns: string[],
  entityType: ImportEntityType,
): Record<string, string> {
  const schema = ENTITY_SCHEMAS[entityType];
  const allFields = [...schema.required, ...schema.optional];
  const mapping: Record<string, string> = {};

  for (const csvCol of csvColumns) {
    const normalized = normalizeHeader(csvCol);

    if (allFields.includes(normalized)) {
      mapping[csvCol] = normalized;
      continue;
    }

    for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
      if (allFields.includes(field) && synonyms.some(s => normalizeHeader(s) === normalized)) {
        mapping[csvCol] = field;
        break;
      }
    }
  }

  return mapping;
}

// ── Full client-side parse ───────────────────────────────

export function parseCsvFull(
  fileContent: string,
  entityType: ImportEntityType,
): CsvParseResult & { allRows: string[][] } {
  const rows = parseCsv(fileContent);

  if (rows.length === 0) {
    return { columns: [], preview: [], totalRows: 0, suggestedMapping: {}, allRows: [] };
  }

  const columns = rows[0];
  const dataRows = rows.slice(1);
  const preview = dataRows.slice(0, 5);
  const suggestedMapping = autoMapColumns(columns, entityType);

  return {
    columns,
    preview,
    totalRows: dataRows.length,
    suggestedMapping,
    allRows: dataRows,
  };
}
