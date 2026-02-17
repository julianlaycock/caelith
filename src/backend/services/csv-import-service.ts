/**
 * CSV Import Service
 *
 * Parses CSV files, auto-maps columns to schema fields, and transforms
 * CSV rows into BulkImportPayload entities for the existing import pipeline.
 */

import type {
  BulkImportPayload,
  BulkFundStructure,
  BulkInvestor,
  BulkHolding,
  BulkEligibilityCriteria,
} from './import-service.js';

// ── Types ────────────────────────────────────────────────────────────────

export type ImportEntityType = 'investors' | 'fund_structures' | 'holdings' | 'eligibility_criteria';

export interface CsvParseResult {
  columns: string[];
  preview: string[][];
  totalRows: number;
  suggestedMapping: Record<string, string>;
}

export interface ColumnMapping {
  [csvColumn: string]: string; // csvColumn -> schemaField
}

// ── Schema definitions for each entity type ─────────────────────────────

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

// ── Column name synonyms for auto-mapping ───────────────────────────────

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

// ── CSV Template content ────────────────────────────────────────────────

export const CSV_TEMPLATES: Record<ImportEntityType, string> = {
  investors: [
    'name,jurisdiction,investor_type,accredited,kyc_status,kyc_expiry,tax_id,lei,email',
    '"Example Corp GmbH",DE,professional,true,verified,2027-01-15,DE123456789,5493001KJTIIGC8Y1R12,compliance@example.com',
    '"Nordic Pension Fund",SE,institutional,true,verified,2027-06-30,SE987654321,549300TRUWO63JS8P120,invest@nordic.se',
    '"Private Investor AG",CH,well_informed,true,pending,,CH12345,,info@investor.ch',
    '',
    '# Valid investor_type values: institutional, professional, semi_professional, well_informed, retail',
    '# Valid kyc_status values: pending, verified, expired, rejected',
    '# Jurisdiction uses ISO 3166-1 alpha-2 country codes (DE, LU, IE, FR, etc.)',
  ].join('\n'),
  fund_structures: [
    'name,legal_form,domicile,regulatory_framework,aifm_name,currency,target_size,total_units,status',
    '"Luxembourg Growth Fund I",SIF,LU,AIFMD,"Example AIFM S.A.",EUR,50000000,10000,active',
    '"German Special Fund",Spezial_AIF,DE,AIFMD,"German KVG GmbH",EUR,100000000,50000,active',
    '"Irish Qualifying Fund",QIAIF,IE,AIFMD,"Dublin Management Ltd",EUR,25000000,25000,active',
    '',
    '# Valid legal_form values: SICAV, SIF, RAIF, SCSp, SCA, ELTIF, Spezial_AIF, Publikums_AIF, QIAIF, RIAIF, LP, other',
    '# Valid regulatory_framework values: AIFMD, UCITS, ELTIF, national',
    '# Valid status values: active, closing, closed, liquidating',
    '# Domicile uses ISO 3166-1 alpha-2 country codes',
  ].join('\n'),
  holdings: [
    'investor_name,asset_name,units,acquired_at',
    '"Example Corp GmbH","Luxembourg Growth Fund I — Share Class A",500,2025-06-15',
    '"Nordic Pension Fund","Luxembourg Growth Fund I — Share Class A",2000,2025-07-01',
    '',
    '# investor_name must match an existing investor (or one being imported in the same batch)',
    '# asset_name must match an existing asset (or one auto-created from a fund structure)',
    '# units must be a positive number',
    '# acquired_at must be a valid date (YYYY-MM-DD format)',
  ].join('\n'),
  eligibility_criteria: [
    'jurisdiction,investor_type,minimum_investment,effective_date,maximum_allocation_pct,suitability_required,source_reference',
    'LU,professional,125000,2025-01-01,,false,"CSSF SIF Law Art. 2"',
    'DE,semi_professional,200000,2025-01-01,25,true,"KAGB Section 1"',
    'IE,institutional,100000,2025-01-01,,false,"AIFMD Art. 4"',
    '',
    '# fund_ref or fund_structure_id column can be added to link criteria to a specific fund',
    '# Valid investor_type values: institutional, professional, semi_professional, well_informed, retail',
    '# minimum_investment is in the fund\'s base currency (typically EUR)',
  ].join('\n'),
};

// ── CSV Parsing ─────────────────────────────────────────────────────────

/** Maximum number of data rows (excluding the header) allowed in a single CSV upload. */
const MAX_ROWS = 5000;

/**
 * Parse a CSV string into rows. Handles quoted fields with commas and newlines.
 * Throws if the number of data rows exceeds MAX_ROWS.
 */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  // Strip BOM if present
  const text = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
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
        if (ch === '\r') i++; // skip \r in \r\n
        row.push(current.trim());
        current = '';
        // Skip comment lines and empty rows
        if (row.length > 0 && row[0] !== '' && !row[0].startsWith('#')) {
          rows.push(row);
          // rows[0] is the header; data rows are rows[1..N]
          if (rows.length > MAX_ROWS + 1) {
            throw new Error(`CSV exceeds maximum of ${MAX_ROWS} data rows. Split into smaller files.`);
          }
        }
        row = [];
      } else {
        current += ch;
      }
    }
  }

  // Handle last row (no trailing newline)
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.length > 0 && row[0] !== '' && !row[0].startsWith('#')) {
      rows.push(row);
      if (rows.length > MAX_ROWS + 1) {
        throw new Error(`CSV exceeds maximum of ${MAX_ROWS} data rows. Split into smaller files.`);
      }
    }
  }

  return rows;
}

/**
 * Normalize a column header for matching.
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Auto-map CSV column headers to schema fields using synonym matching.
 */
export function autoMapColumns(
  csvColumns: string[],
  entityType: ImportEntityType,
): Record<string, string> {
  const schema = ENTITY_SCHEMAS[entityType];
  const allFields = [...schema.required, ...schema.optional];
  const mapping: Record<string, string> = {};

  for (const csvCol of csvColumns) {
    const normalized = normalizeHeader(csvCol);

    // Try direct match first
    if (allFields.includes(normalized)) {
      mapping[csvCol] = normalized;
      continue;
    }

    // Try synonym match
    for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
      if (allFields.includes(field) && synonyms.some(s => normalizeHeader(s) === normalized)) {
        mapping[csvCol] = field;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Parse a CSV file buffer and return column info + preview rows.
 */
export function parseCsvPreview(
  fileContent: string,
  entityType: ImportEntityType,
): CsvParseResult {
  const rows = parseCsv(fileContent);

  if (rows.length === 0) {
    return { columns: [], preview: [], totalRows: 0, suggestedMapping: {} };
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
  };
}

/**
 * Transform parsed CSV data into a BulkImportPayload using the provided column mapping.
 */
export function csvToPayload(
  fileContent: string,
  entityType: ImportEntityType,
  columnMapping: ColumnMapping,
  mode?: 'strict' | 'best_effort',
): BulkImportPayload {
  const rows = parseCsv(fileContent);
  if (rows.length < 2) return {};

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Build header index -> schema field mapping
  const fieldMapping: Record<number, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const mapped = columnMapping[headers[i]];
    if (mapped) fieldMapping[i] = mapped;
  }

  // Transform each row into an entity object
  const entities = dataRows.map((row, rowIndex) => {
    const entity: Record<string, unknown> = {};
    if (entityType === 'investors' || entityType === 'fund_structures') {
      entity.ref = `csv-${rowIndex}`;
    }
    for (const [colIndex, field] of Object.entries(fieldMapping)) {
      const value = row[Number(colIndex)];
      if (value === undefined || value === '') continue;

      // Type coercion for known fields
      if (['accredited', 'suitability_required'].includes(field)) {
        entity[field] = value.toLowerCase() === 'true' || value === '1';
      } else if (['total_units', 'units', 'target_size', 'minimum_investment', 'maximum_allocation_pct', 'unit_price'].includes(field)) {
        const num = Number(value.replace(/[,\s]/g, ''));
        if (!isNaN(num)) entity[field] = num;
      } else {
        entity[field] = value;
      }
    }
    return entity;
  });

  // For holdings: resolve investor_name -> investor_ref and asset_name -> asset_ref
  // so the import service can match them via the refMap
  if (entityType === 'holdings') {
    for (const entity of entities) {
      if (entity.investor_name && !entity.investor_id && !entity.investor_ref) {
        entity.investor_ref = entity.investor_name as string;
      }
      if (entity.asset_name && !entity.asset_id && !entity.asset_ref) {
        entity.asset_ref = entity.asset_name as string;
      }
    }
  }

  const payload: BulkImportPayload = { mode };

  switch (entityType) {
    case 'investors':
      payload.investors = entities as unknown as BulkInvestor[];
      break;
    case 'fund_structures':
      payload.fundStructures = entities as unknown as BulkFundStructure[];
      break;
    case 'holdings':
      payload.holdings = entities as unknown as BulkHolding[];
      break;
    case 'eligibility_criteria':
      payload.eligibilityCriteria = entities as unknown as BulkEligibilityCriteria[];
      break;
  }

  return payload;
}
