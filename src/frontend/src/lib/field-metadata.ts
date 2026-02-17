/**
 * Field metadata for CSV import preview — defines input types and
 * valid options per field for each entity type.
 *
 * Jurisdiction list is unified across investors, fund domicile, and
 * eligibility criteria so the eligibility engine can always match them.
 */

import type { ImportEntityType } from './types';
import {
  LEGAL_FORMS,
  FRAMEWORKS,
  STATUSES,
} from './constants';

// ── Types ────────────────────────────────────────────────

export type FieldInputType = 'enum' | 'text' | 'number' | 'date' | 'boolean';

export interface FieldMeta {
  type: FieldInputType;
  options?: { value: string; label: string }[];
  /** Returns an error message or null if valid. */
  validate?: (value: string) => string | null;
}

// ── Unified jurisdiction list (EU/EEA-focused for AIFMD II) ──

const JURISDICTIONS = [
  { value: 'DE', label: 'Germany (DE)' },
  { value: 'LU', label: 'Luxembourg (LU)' },
  { value: 'IE', label: 'Ireland (IE)' },
  { value: 'FR', label: 'France (FR)' },
  { value: 'NL', label: 'Netherlands (NL)' },
  { value: 'AT', label: 'Austria (AT)' },
  { value: 'IT', label: 'Italy (IT)' },
  { value: 'ES', label: 'Spain (ES)' },
  { value: 'BE', label: 'Belgium (BE)' },
  { value: 'LI', label: 'Liechtenstein (LI)' },
  { value: 'CH', label: 'Switzerland (CH)' },
  { value: 'GB', label: 'United Kingdom (GB)' },
  { value: 'US', label: 'United States (US)' },
  { value: 'SG', label: 'Singapore (SG)' },
];

// ── AIFMD II investor classification ─────────────────────

const INVESTOR_TYPES = [
  { value: 'institutional', label: 'Institutional' },
  { value: 'professional', label: 'Professional' },
  { value: 'semi_professional', label: 'Semi-Professional' },
  { value: 'well_informed', label: 'Well-Informed' },
  { value: 'retail', label: 'Retail' },
];

// ── KYC lifecycle ────────────────────────────────────────

const KYC_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'expired', label: 'Expired' },
  { value: 'rejected', label: 'Rejected' },
];

// ── Boolean ──────────────────────────────────────────────

const BOOL_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

// ── Currency (EUR-dominant, key cross-border currencies) ─

const CURRENCIES = [
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CHF', label: 'CHF' },
];

// Reuse existing constants, filtering out placeholder entries
const legalFormOptions = LEGAL_FORMS.filter(l => l.value !== '');
const frameworkOptions = FRAMEWORKS.filter(f => f.value !== '');
const statusOptions = STATUSES;

// ── Validators ───────────────────────────────────────────

const validateDate = (v: string): string | null => {
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Use YYYY-MM-DD';
};

const validateNumber = (v: string): string | null => {
  if (!v) return null;
  return isNaN(Number(v.replace(/[,\s]/g, ''))) ? 'Must be a number' : null;
};

const validateLei = (v: string): string | null => {
  if (!v) return null;
  return v.length === 20 ? null : 'LEI must be 20 characters';
};

// ── Field metadata per entity type ───────────────────────

export const FIELD_META: Record<ImportEntityType, Record<string, FieldMeta>> = {
  investors: {
    name:          { type: 'text' },
    jurisdiction:  { type: 'enum', options: JURISDICTIONS },
    investor_type: { type: 'enum', options: INVESTOR_TYPES },
    accredited:    { type: 'boolean', options: BOOL_OPTIONS },
    kyc_status:    { type: 'enum', options: KYC_STATUSES },
    kyc_expiry:    { type: 'date', validate: validateDate },
    tax_id:        { type: 'text' },
    lei:           { type: 'text', validate: validateLei },
    email:         { type: 'text' },
  },

  fund_structures: {
    name:                 { type: 'text' },
    legal_form:           { type: 'enum', options: legalFormOptions },
    domicile:             { type: 'enum', options: JURISDICTIONS },
    regulatory_framework: { type: 'enum', options: frameworkOptions },
    aifm_name:            { type: 'text' },
    currency:             { type: 'enum', options: CURRENCIES },
    target_size:          { type: 'number', validate: validateNumber },
    total_units:          { type: 'number', validate: validateNumber },
    status:               { type: 'enum', options: statusOptions },
    inception_date:       { type: 'date', validate: validateDate },
  },

  holdings: {
    investor_name: { type: 'text' },
    investor_id:   { type: 'text' },
    asset_name:    { type: 'text' },
    asset_id:      { type: 'text' },
    units:         { type: 'number', validate: validateNumber },
    acquired_at:   { type: 'date', validate: validateDate },
  },

  eligibility_criteria: {
    jurisdiction:          { type: 'enum', options: JURISDICTIONS },
    investor_type:         { type: 'enum', options: INVESTOR_TYPES },
    minimum_investment:    { type: 'number', validate: validateNumber },
    effective_date:        { type: 'date', validate: validateDate },
    fund_ref:              { type: 'text' },
    maximum_allocation_pct:{ type: 'number', validate: validateNumber },
    suitability_required:  { type: 'boolean', options: BOOL_OPTIONS },
    source_reference:      { type: 'text' },
  },
};
