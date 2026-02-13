import { randomUUID } from 'crypto';
import { query, execute, parseJSON, stringifyJSON, queryWithTenant, executeWithTenant, DEFAULT_TENANT_ID } from '../db.js';
import { RuleSet, CreateRuleSetInput, InvestorType } from '../models/index.js';

/**
 * Rules Repository - Handles all database operations for rule sets
 */

interface RuleSetRow {
  id: string;
  asset_id: string;
  version: number;
  qualification_required: boolean | number;
  lockup_days: number;
  jurisdiction_whitelist: string;
  transfer_whitelist: string | null;
  investor_type_whitelist: string | null;
  minimum_investment: number | null;
  maximum_investors: number | null;
  concentration_limit_pct: number | null;
  kyc_required: boolean | number;
  created_at: string;
}

/**
 * Convert database row to RuleSet
 */
function rowToRuleSet(row: RuleSetRow): RuleSet {
  return {
    id: row.id,
    asset_id: row.asset_id,
    version: row.version,
    qualification_required: Boolean(row.qualification_required),
    lockup_days: row.lockup_days,
    jurisdiction_whitelist: parseJSON<string[]>(row.jurisdiction_whitelist) || [],
    transfer_whitelist: parseJSON<string[]>(row.transfer_whitelist),
    investor_type_whitelist: parseJSON<InvestorType[]>(row.investor_type_whitelist) ?? null,
    minimum_investment: row.minimum_investment ?? null,
    maximum_investors: row.maximum_investors ?? null,
    concentration_limit_pct: row.concentration_limit_pct ?? null,
    kyc_required: Boolean(row.kyc_required),
    created_at: row.created_at,
  };
}

/**
 * Create a new rule set for an asset
 */
export async function createRuleSet(input: CreateRuleSetInput): Promise<RuleSet> {
  const id = randomUUID();
  const now = new Date().toISOString();

  // Check if rules already exist for this asset
  const existing = await findRuleSetByAsset(input.asset_id);
  const version = existing ? existing.version + 1 : 1;

  // Delete old rules if they exist (we maintain only latest version)
  if (existing) {
    await executeWithTenant('DELETE FROM rules WHERE asset_id = ?', [input.asset_id]);
  }

  const investor_type_whitelist = input.investor_type_whitelist ?? null;
  const minimum_investment = input.minimum_investment ?? null;
  const maximum_investors = input.maximum_investors ?? null;
  const concentration_limit_pct = input.concentration_limit_pct ?? null;
  const kyc_required = input.kyc_required ?? false;

  await execute(
    `INSERT INTO rules (id, tenant_id, asset_id, version, qualification_required, lockup_days, jurisdiction_whitelist, transfer_whitelist, investor_type_whitelist, minimum_investment, maximum_investors, concentration_limit_pct, kyc_required, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      DEFAULT_TENANT_ID,
      input.asset_id,
      version,
      input.qualification_required,
      input.lockup_days,
      stringifyJSON(input.jurisdiction_whitelist),
      input.transfer_whitelist ? stringifyJSON(input.transfer_whitelist) : null,
      investor_type_whitelist ? stringifyJSON(investor_type_whitelist) : null,
      minimum_investment,
      maximum_investors,
      concentration_limit_pct,
      kyc_required,
      now,
    ]
  );

  const ruleSet: RuleSet = {
    id,
    asset_id: input.asset_id,
    version,
    qualification_required: input.qualification_required,
    lockup_days: input.lockup_days,
    jurisdiction_whitelist: input.jurisdiction_whitelist,
    transfer_whitelist: input.transfer_whitelist,
    investor_type_whitelist,
    minimum_investment,
    maximum_investors,
    concentration_limit_pct,
    kyc_required,
    created_at: now,
  };

  return ruleSet;
}

/**
 * Find rule set by ID
 */
export async function findRuleSetById(id: string): Promise<RuleSet | null> {
  const results = await queryWithTenant<RuleSetRow>('SELECT * FROM rules WHERE id = ?', [id]);

  return results.length > 0 ? rowToRuleSet(results[0]) : null;
}

/**
 * Find active rule set for an asset
 */
export async function findRuleSetByAsset(assetId: string): Promise<RuleSet | null> {
  const results = await queryWithTenant<RuleSetRow>(
    'SELECT * FROM rules WHERE asset_id = ?',
    [assetId]
  );

  return results.length > 0 ? rowToRuleSet(results[0]) : null;
}

/**
 * Check if rules exist for an asset
 */
export async function ruleSetExists(assetId: string): Promise<boolean> {
  const results = await queryWithTenant<{ count: number }>(
    'SELECT COUNT(*) as count FROM rules WHERE asset_id = ?',
    [assetId]
  );

  return results.length > 0 && results[0].count > 0;
}

/**
 * Delete rule set for an asset
 */
export async function deleteRuleSet(assetId: string): Promise<void> {
  await executeWithTenant('DELETE FROM rules WHERE asset_id = ?', [assetId]);
}