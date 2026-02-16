/**
 * Rules Engine Types — V2
 *
 * Supports composite rules (AND/OR/NOT), detailed explanations,
 * and rule versioning.
 */

import { RuleSet, Investor, Holding } from '../backend/models/index.js';

/**
 * Transfer request to be validated
 */
export interface TransferRequest {
  asset_id: string;
  from_investor_id: string;
  to_investor_id: string;
  units: number;
  execution_date: string;
}

/**
 * Fund structure context for AIFMD-aware validation
 */
export interface FundContext {
  legal_form: string;
  domicile: string;
  regulatory_framework: string;
  status: string;
  leverage_limit_commitment?: number | null;
  leverage_limit_gross?: number | null;
  leverage_current_commitment?: number | null;
  leverage_current_gross?: number | null;
  lmt_types?: any[];
}

/**
 * Asset-level aggregate data needed for concentration/max-investor checks
 */
export interface AssetAggregates {
  total_units: number;
  /** Current number of distinct investors with units > 0 in this asset */
  distinct_investor_count: number;
  /** Receiver's existing holding in this asset (units), 0 if none */
  receiver_existing_units: number;
}

/**
 * Validation context — all data needed to validate a transfer
 */
export interface ValidationContext {
  transfer: TransferRequest;
  fromInvestor: Investor;
  toInvestor: Investor;
  fromHolding: Holding | null;
  rules: RuleSet;
  customRules?: CompositeRule[];
  /** Fund structure context (null if asset is not fund-linked) */
  fund?: FundContext | null;
  /** Asset-level aggregates for concentration/max-investor checks */
  assetAggregates?: AssetAggregates | null;
}

/**
 * Single validation check result with explanation
 */
export interface CheckResult {
  rule: string;
  passed: boolean;
  message: string;
}

/**
 * Full validation result with detailed breakdown
 */
export interface ValidationResult {
  valid: boolean;
  violations: string[];
  checks: CheckResult[];
  summary: string;
}

/**
 * Individual validation rule function
 */
export type ValidationRule = (ctx: ValidationContext) => string | null;

/**
 * Composite rule operators
 */
export type CompositeOperator = 'AND' | 'OR' | 'NOT';

/**
 * Condition types for composite rules
 */
export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in';
  value: string | number | boolean | string[];
}

/**
 * Composite rule — combines conditions with boolean logic
 */
export interface CompositeRule {
  id: string;
  name: string;
  description: string;
  operator: CompositeOperator;
  conditions: RuleCondition[];
  enabled: boolean;
}