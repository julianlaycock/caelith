/**
 * Rules Engine V2 — Transfer Validation Logic
 *
 * Pure functions. No side effects. No database access.
 * Now with detailed check results and composite rule support.
 */

import {
  ValidationContext,
  ValidationResult,
  ValidationRule,
  CheckResult,
  CompositeRule,
  RuleCondition,
} from './types.js';

// ── Built-in Rules ──────────────────────────────────────────

const checkNotSelfTransfer: ValidationRule = (ctx): string | null => {
  if (ctx.transfer.from_investor_id === ctx.transfer.to_investor_id) {
    return 'Cannot transfer to yourself';
  }
  return null;
};

const checkPositiveUnits: ValidationRule = (ctx): string | null => {
  if (ctx.transfer.units <= 0) {
    return 'Transfer units must be greater than zero';
  }
  return null;
};

const checkSufficientUnits: ValidationRule = (ctx): string | null => {
  if (!ctx.fromHolding) {
    return 'Sender has no holding for this asset';
  }
  if (ctx.fromHolding.units < ctx.transfer.units) {
    return `Insufficient units. Sender has ${ctx.fromHolding.units}, trying to transfer ${ctx.transfer.units}.`;
  }
  return null;
};

const checkQualification: ValidationRule = (ctx): string | null => {
  if (!ctx.rules.qualification_required) {
    return null;
  }
  if (!ctx.toInvestor.accredited) {
    return `Recipient investor "${ctx.toInvestor.name}" is not accredited. Qualified investors only.`;
  }
  return null;
};

const checkLockup: ValidationRule = (ctx): string | null => {
  if (ctx.rules.lockup_days === 0) {
    return null;
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

const checkJurisdiction: ValidationRule = (ctx): string | null => {
  if (ctx.rules.jurisdiction_whitelist.length === 0) {
    return null;
  }
  if (!ctx.rules.jurisdiction_whitelist.includes(ctx.toInvestor.jurisdiction)) {
    return `Recipient jurisdiction "${ctx.toInvestor.jurisdiction}" not in whitelist: [${ctx.rules.jurisdiction_whitelist.join(', ')}]`;
  }
  return null;
};

const checkTransferWhitelist: ValidationRule = (ctx): string | null => {
  if (ctx.rules.transfer_whitelist === null) {
    return null;
  }
  if (!ctx.rules.transfer_whitelist.includes(ctx.toInvestor.id)) {
    return `Recipient investor "${ctx.toInvestor.name}" not in transfer whitelist.`;
  }
  return null;
};

// ── Rule registry with metadata ─────────────────────────────

interface BuiltInRule {
  name: string;
  fn: ValidationRule;
}

const builtInRules: BuiltInRule[] = [
  { name: 'self_transfer', fn: checkNotSelfTransfer },
  { name: 'positive_units', fn: checkPositiveUnits },
  { name: 'sufficient_units', fn: checkSufficientUnits },
  { name: 'qualification', fn: checkQualification },
  { name: 'lockup_period', fn: checkLockup },
  { name: 'jurisdiction_whitelist', fn: checkJurisdiction },
  { name: 'transfer_whitelist', fn: checkTransferWhitelist },
];

// ── Composite Rule Evaluation ───────────────────────────────

function resolveField(ctx: ValidationContext, field: string): unknown {
  const map: Record<string, unknown> = {
    'from.jurisdiction': ctx.fromInvestor.jurisdiction,
    'from.accredited': ctx.fromInvestor.accredited,
    'from.name': ctx.fromInvestor.name,
    'from.id': ctx.fromInvestor.id,
    'to.jurisdiction': ctx.toInvestor.jurisdiction,
    'to.accredited': ctx.toInvestor.accredited,
    'to.name': ctx.toInvestor.name,
    'to.id': ctx.toInvestor.id,
    'transfer.units': ctx.transfer.units,
    'transfer.execution_date': ctx.transfer.execution_date,
    'holding.units': ctx.fromHolding?.units ?? 0,
    'holding.acquired_at': ctx.fromHolding?.acquired_at ?? '',
  };
  return map[field];
}

function evaluateCondition(
  ctx: ValidationContext,
  condition: RuleCondition
): boolean {
  const actual = resolveField(ctx, condition.field);
  const expected = condition.value;

  switch (condition.operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gt':
      return (actual as number) > (expected as number);
    case 'gte':
      return (actual as number) >= (expected as number);
    case 'lt':
      return (actual as number) < (expected as number);
    case 'lte':
      return (actual as number) <= (expected as number);
    case 'in':
      return (expected as string[]).includes(actual as string);
    case 'not_in':
      return !(expected as string[]).includes(actual as string);
    default:
      return false;
  }
}

function evaluateCompositeRule(
  ctx: ValidationContext,
  rule: CompositeRule
): CheckResult {
  if (!rule.enabled) {
    return { rule: rule.name, passed: true, message: `${rule.name}: skipped (disabled)` };
  }

  const results = rule.conditions.map((c) => evaluateCondition(ctx, c));

  let passed: boolean;
  switch (rule.operator) {
    case 'AND':
      passed = results.every(Boolean);
      break;
    case 'OR':
      passed = results.some(Boolean);
      break;
    case 'NOT':
      passed = !results[0];
      break;
    default:
      passed = false;
  }

  return {
    rule: rule.name,
    passed,
    message: passed
      ? `${rule.name}: passed`
      : `${rule.name}: failed — ${rule.description}`,
  };
}

// ── Main Validation ─────────────────────────────────────────

/**
 * Validate a transfer against all built-in rules and optional composite rules.
 * Returns detailed results with per-check breakdown.
 */
export function validateTransfer(ctx: ValidationContext): ValidationResult {
  const checks: CheckResult[] = [];
  const violations: string[] = [];

  // Run built-in rules
  for (const rule of builtInRules) {
    const violation = rule.fn(ctx);
    const passed = violation === null;
    checks.push({
      rule: rule.name,
      passed,
      message: passed ? `${rule.name}: passed` : violation!,
    });
    if (!passed) {
      violations.push(violation!);
    }
  }

  // Run composite rules
  if (ctx.customRules) {
    for (const rule of ctx.customRules) {
      const result = evaluateCompositeRule(ctx, rule);
      checks.push(result);
      if (!result.passed) {
        violations.push(result.message);
      }
    }
  }

  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.passed).length;
  const valid = violations.length === 0;

  return {
    valid,
    violations,
    checks,
    summary: valid
      ? `Transfer approved. ${passedChecks}/${totalChecks} checks passed.`
      : `Transfer rejected. ${violations.length} violation(s) found. ${passedChecks}/${totalChecks} checks passed.`,
  };
}