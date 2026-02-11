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
 * Validation context — all data needed to validate a transfer
 */
export interface ValidationContext {
    transfer: TransferRequest;
    fromInvestor: Investor;
    toInvestor: Investor;
    fromHolding: Holding | null;
    rules: RuleSet;
    customRules?: CompositeRule[];
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
//# sourceMappingURL=types.d.ts.map