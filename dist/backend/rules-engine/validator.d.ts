/**
 * Rules Engine V2 — Transfer Validation Logic
 *
 * Pure functions. No side effects. No database access.
 * Now with detailed check results and composite rule support.
 */
import { ValidationContext, ValidationResult } from './types.js';
/**
 * Validate a transfer against all built-in rules and optional composite rules.
 * Returns detailed results with per-check breakdown.
 */
export declare function validateTransfer(ctx: ValidationContext): ValidationResult;
//# sourceMappingURL=validator.d.ts.map