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

// ── AIFMD Built-in Rules ────────────────────────────────────

const checkInvestorTypeWhitelist: ValidationRule = (ctx): string | null => {
  if (!ctx.rules.investor_type_whitelist || ctx.rules.investor_type_whitelist.length === 0) {
    return null;
  }
  if (!ctx.rules.investor_type_whitelist.includes(ctx.toInvestor.investor_type)) {
    return `Recipient investor type "${ctx.toInvestor.investor_type}" not in allowed types: [${ctx.rules.investor_type_whitelist.join(', ')}]`;
  }
  return null;
};

const checkMinimumInvestment: ValidationRule = (ctx): string | null => {
  if (!ctx.rules.minimum_investment || ctx.rules.minimum_investment <= 0) {
    return null;
  }
  if (ctx.transfer.units < ctx.rules.minimum_investment) {
    return `Transfer of ${ctx.transfer.units} units is below minimum investment of ${ctx.rules.minimum_investment} units`;
  }
  return null;
};

const checkKycRequired: ValidationRule = (ctx): string | null => {
  if (!ctx.rules.kyc_required) {
    return null;
  }
  if (ctx.toInvestor.kyc_status !== 'verified') {
    return `KYC required: recipient KYC status is "${ctx.toInvestor.kyc_status}", must be "verified"`;
  }
  if (ctx.toInvestor.kyc_expiry) {
    const expiry = new Date(ctx.toInvestor.kyc_expiry);
    if (expiry <= new Date()) {
      return `KYC required: recipient KYC expired on ${ctx.toInvestor.kyc_expiry}`;
    }
  }
  return null;
};

const checkMaximumInvestors: ValidationRule = (ctx): string | null => {
  if (!ctx.rules.maximum_investors || !ctx.assetAggregates) {
    return null;
  }
  const receiverAlreadyHolds = ctx.assetAggregates.receiver_existing_units > 0;
  if (receiverAlreadyHolds) {
    // Receiver is already an investor — count doesn't increase
    return null;
  }
  if (ctx.assetAggregates.distinct_investor_count >= ctx.rules.maximum_investors) {
    return `Maximum investor limit reached: ${ctx.assetAggregates.distinct_investor_count}/${ctx.rules.maximum_investors} investors. New investor "${ctx.toInvestor.name}" cannot be added.`;
  }
  return null;
};

const checkLeverageCompliance: ValidationRule = (ctx): string | null => {
  if (!ctx.fund) return null;
  if (ctx.fund.leverage_current_commitment != null && ctx.fund.leverage_limit_commitment != null) {
    if (ctx.fund.leverage_current_commitment > ctx.fund.leverage_limit_commitment) {
      return `Fund leverage (commitment method) ${ctx.fund.leverage_current_commitment}x exceeds limit ${ctx.fund.leverage_limit_commitment}x`;
    }
  }
  if (ctx.fund.leverage_current_gross != null && ctx.fund.leverage_limit_gross != null) {
    if (ctx.fund.leverage_current_gross > ctx.fund.leverage_limit_gross) {
      return `Fund leverage (gross method) ${ctx.fund.leverage_current_gross}x exceeds limit ${ctx.fund.leverage_limit_gross}x`;
    }
  }
  return null;
};

// ── AIFMD II LMT Enforcement (Art 16(2b)) ─────────────────

const checkLmtFundSuspension: ValidationRule = (ctx): string | null => {
  if (!ctx.fund?.lmt_types) return null;
  const suspension = ctx.fund.lmt_types.find(
    (lmt) => lmt.type === 'suspension' && lmt.active
  );
  if (suspension) {
    return `Fund is suspended — all transfers blocked (AIFMD II Art 16(2b): ${suspension.description || 'Liquidity management tool active'})`;
  }
  return null;
};

const checkLmtRedemptionGate: ValidationRule = (ctx): string | null => {
  if (!ctx.fund?.lmt_types) return null;
  const gate = ctx.fund.lmt_types.find(
    (lmt) => lmt.type === 'redemption_gate' && lmt.active
  );
  if (gate) {
    const threshold = gate.threshold_pct != null ? ` (gate threshold: ${gate.threshold_pct}%)` : '';
    return `Redemption gate is active — transfers restricted${threshold} (AIFMD II Art 16(2b): ${gate.description || 'Redemption gate in effect'})`;
  }
  return null;
};

const checkLmtNoticePeriod: ValidationRule = (_ctx): string | null => {
  // Notice periods are advisory — they do not block transfers per AIFMD II Art 16(2b).
  // The notice requirement is informational and recorded in the decision record.
  return null;
};

const checkConcentrationLimit: ValidationRule = (ctx): string | null => {
  if (!ctx.rules.concentration_limit_pct || !ctx.assetAggregates) {
    return null;
  }
  const totalUnits = ctx.assetAggregates.total_units;
  if (totalUnits <= 0) return null;

  const receiverUnitsAfter = ctx.assetAggregates.receiver_existing_units + ctx.transfer.units;
  const concentrationPct = (receiverUnitsAfter / totalUnits) * 100;

  if (concentrationPct > ctx.rules.concentration_limit_pct) {
    return `Concentration limit violated: recipient would hold ${concentrationPct.toFixed(2)}% of total units (limit: ${ctx.rules.concentration_limit_pct}%)`;
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
  // AIFMD-specific rules
  { name: 'investor_type_whitelist', fn: checkInvestorTypeWhitelist },
  { name: 'minimum_investment', fn: checkMinimumInvestment },
  { name: 'kyc_required', fn: checkKycRequired },
  { name: 'maximum_investors', fn: checkMaximumInvestors },
  { name: 'concentration_limit', fn: checkConcentrationLimit },
  { name: 'leverage_compliance', fn: checkLeverageCompliance },
  // AIFMD II LMT enforcement (Art 16(2b))
  { name: 'lmt_fund_suspension', fn: checkLmtFundSuspension },
  { name: 'lmt_redemption_gate', fn: checkLmtRedemptionGate },
  { name: 'lmt_notice_period', fn: checkLmtNoticePeriod },
];

// ── Composite Rule Evaluation ───────────────────────────────

function resolveField(ctx: ValidationContext, field: string): unknown {
  const map: Record<string, unknown> = {
    // Sender fields
    'from.jurisdiction': ctx.fromInvestor.jurisdiction,
    'from.accredited': ctx.fromInvestor.accredited,
    'from.investor_type': ctx.fromInvestor.investor_type,
    'from.kyc_status': ctx.fromInvestor.kyc_status,
    'from.kyc_expiry': ctx.fromInvestor.kyc_expiry,
    'from.name': ctx.fromInvestor.name,
    'from.id': ctx.fromInvestor.id,
    // Receiver fields
    'to.jurisdiction': ctx.toInvestor.jurisdiction,
    'to.accredited': ctx.toInvestor.accredited,
    'to.investor_type': ctx.toInvestor.investor_type,
    'to.kyc_status': ctx.toInvestor.kyc_status,
    'to.kyc_expiry': ctx.toInvestor.kyc_expiry,
    'to.name': ctx.toInvestor.name,
    'to.id': ctx.toInvestor.id,
    // Transfer fields
    'transfer.units': ctx.transfer.units,
    'transfer.execution_date': ctx.transfer.execution_date,
    // Holding fields
    'holding.units': ctx.fromHolding?.units ?? 0,
    'holding.acquired_at': ctx.fromHolding?.acquired_at ?? '',
    // Fund structure fields (null-safe for non-fund-linked assets)
    'fund.legal_form': ctx.fund?.legal_form ?? null,
    'fund.domicile': ctx.fund?.domicile ?? null,
    'fund.regulatory_framework': ctx.fund?.regulatory_framework ?? null,
    'fund.status': ctx.fund?.status ?? null,
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