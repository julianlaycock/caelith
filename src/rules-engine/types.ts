/**
 * Rules Engine Types
 * 
 * Defines interfaces for transfer validation logic
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
  execution_date: string; // ISO 8601 date string
}

/**
 * Validation context - all data needed to validate a transfer
 */
export interface ValidationContext {
  transfer: TransferRequest;
  fromInvestor: Investor;
  toInvestor: Investor;
  fromHolding: Holding | null;
  rules: RuleSet;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

/**
 * Individual validation rule function
 */
export type ValidationRule = (ctx: ValidationContext) => string | null;