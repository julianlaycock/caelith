/**
 * Rules Engine - Transfer Validation Logic
 * 
 * Pure functions that validate transfers against rule sets.
 * No side effects, no database access - only validation logic.
 */

import { ValidationContext, ValidationResult, ValidationRule } from './types.js';

/**
 * Rule 1: Check if investor is qualified (accredited)
 */
const checkQualification: ValidationRule = (ctx: ValidationContext): string | null => {
  if (!ctx.rules.qualification_required) {
    return null; // Rule not enforced
  }

  if (!ctx.toInvestor.accredited) {
    return `Recipient investor "${ctx.toInvestor.name}" is not accredited. Qualified investors only.`;
  }

  return null;
};

/**
 * Rule 2: Check lockup period
 */
const checkLockup: ValidationRule = (ctx: ValidationContext): string | null => {
  if (ctx.rules.lockup_days === 0) {
    return null; // No lockup
  }

  if (!ctx.fromHolding) {
    return 'No holding found for sender';
  }

  const acquiredDate = new Date(ctx.fromHolding.acquired_at);
  const executionDate = new Date(ctx.transfer.execution_date);
  const daysSinceAcquisition = Math.floor(
    (executionDate.getTime() - acquiredDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceAcquisition < ctx.rules.lockup_days) {
    const remainingDays = ctx.rules.lockup_days - daysSinceAcquisition;
    return `Lockup period violation. ${remainingDays} day(s) remaining (${ctx.rules.lockup_days} day lockup).`;
  }

  return null;
};

/**
 * Rule 3: Check jurisdiction whitelist
 */
const checkJurisdiction: ValidationRule = (ctx: ValidationContext): string | null => {
  if (ctx.rules.jurisdiction_whitelist.length === 0) {
    return null; // No jurisdiction restrictions
  }

  if (!ctx.rules.jurisdiction_whitelist.includes(ctx.toInvestor.jurisdiction)) {
    return `Recipient jurisdiction "${ctx.toInvestor.jurisdiction}" not in whitelist: [${ctx.rules.jurisdiction_whitelist.join(', ')}]`;
  }

  return null;
};

/**
 * Rule 4: Check transfer whitelist
 */
const checkTransferWhitelist: ValidationRule = (ctx: ValidationContext): string | null => {
  if (ctx.rules.transfer_whitelist === null) {
    return null; // Unrestricted transfers
  }

  if (!ctx.rules.transfer_whitelist.includes(ctx.toInvestor.id)) {
    return `Recipient investor "${ctx.toInvestor.name}" not in transfer whitelist.`;
  }

  return null;
};

/**
 * Rule 5: Check sender has sufficient units
 */
const checkSufficientUnits: ValidationRule = (ctx: ValidationContext): string | null => {
  if (!ctx.fromHolding) {
    return 'Sender has no holding for this asset';
  }

  if (ctx.fromHolding.units < ctx.transfer.units) {
    return `Insufficient units. Sender has ${ctx.fromHolding.units}, trying to transfer ${ctx.transfer.units}.`;
  }

  return null;
};

/**
 * Rule 6: Check transfer units are positive
 */
const checkPositiveUnits: ValidationRule = (ctx: ValidationContext): string | null => {
  if (ctx.transfer.units <= 0) {
    return 'Transfer units must be greater than zero';
  }

  return null;
};

/**
 * Rule 7: Check not transferring to self
 */
const checkNotSelfTransfer: ValidationRule = (ctx: ValidationContext): string | null => {
  if (ctx.transfer.from_investor_id === ctx.transfer.to_investor_id) {
    return 'Cannot transfer to yourself';
  }

  return null;
};

/**
 * All validation rules in order
 */
const validationRules: ValidationRule[] = [
  checkNotSelfTransfer,
  checkPositiveUnits,
  checkSufficientUnits,
  checkQualification,
  checkLockup,
  checkJurisdiction,
  checkTransferWhitelist,
];

/**
 * Main validation function - validates a transfer against all rules
 */
export function validateTransfer(ctx: ValidationContext): ValidationResult {
  const violations: string[] = [];

  for (const rule of validationRules) {
    const violation = rule(ctx);
    if (violation !== null) {
      violations.push(violation);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}