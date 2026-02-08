/**
 * Rules Service
 * 
 * Business logic for rule set management
 */

import {
  createRuleSet as createRuleSetRepo,
  findRuleSetByAsset,
  assetExists,
  createEvent,
} from '../repositories/index.js';
import { RuleSet, CreateRuleSetInput } from '../models/index.js';

/**
 * Create or update rule set for an asset
 */
export async function createOrUpdateRuleSet(input: CreateRuleSetInput): Promise<RuleSet> {
  // Validate asset exists
  const assetFound = await assetExists(input.asset_id);
  if (!assetFound) {
    throw new Error(`Asset not found: ${input.asset_id}`);
  }

  // Validate lockup days
  if (input.lockup_days < 0) {
    throw new Error('Lockup days cannot be negative');
  }

  // Validate jurisdiction whitelist
  if (input.jurisdiction_whitelist.length > 0) {
    const validJurisdictions = input.jurisdiction_whitelist.every(
      (j) => j.trim().length > 0
    );
    if (!validJurisdictions) {
      throw new Error('Jurisdiction codes cannot be empty');
    }
  }

  // Check if updating existing rules
  const existing = await findRuleSetByAsset(input.asset_id);
  const eventType = existing ? 'rules.updated' : 'rules.created';

  // Create/update rules
  const ruleSet = await createRuleSetRepo(input);

  // Log event
  await createEvent({
    event_type: eventType,
    entity_type: 'rules',
    entity_id: ruleSet.id,
    payload: {
      asset_id: input.asset_id,
      version: ruleSet.version,
      qualification_required: input.qualification_required,
      lockup_days: input.lockup_days,
      jurisdiction_whitelist: input.jurisdiction_whitelist,
      transfer_whitelist: input.transfer_whitelist,
    },
  });

  return ruleSet;
}

/**
 * Get rule set for an asset
 */
export async function getRuleSetForAsset(assetId: string): Promise<RuleSet | null> {
  return await findRuleSetByAsset(assetId);
}