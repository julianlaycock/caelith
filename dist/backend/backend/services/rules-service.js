/**
 * Rules Service
 *
 * Business logic for rule set management.
 * Now archives every version in rule_versions table.
 */
import { createRuleSet as createRuleSetRepo, findRuleSetByAsset, assetExists, createEvent, } from '../repositories/index.js';
import { execute, query } from '../db.js';
import { randomUUID } from 'crypto';
/**
 * Create or update rule set for an asset (archives previous version)
 */
export async function createOrUpdateRuleSet(input, userId) {
    const assetFound = await assetExists(input.asset_id);
    if (!assetFound) {
        throw new Error(`Asset not found: ${input.asset_id}`);
    }
    if (input.lockup_days < 0) {
        throw new Error('Lockup days cannot be negative');
    }
    if (input.jurisdiction_whitelist.length > 0) {
        const validJurisdictions = input.jurisdiction_whitelist.every((j) => j.trim().length > 0);
        if (!validJurisdictions) {
            throw new Error('Jurisdiction codes cannot be empty');
        }
    }
    const existing = await findRuleSetByAsset(input.asset_id);
    const eventType = existing ? 'rules.updated' : 'rules.created';
    // Create/update active rules
    const ruleSet = await createRuleSetRepo(input);
    // Archive this version
    await execute(`INSERT INTO rule_versions (id, asset_id, version, config, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`, [
        randomUUID(),
        ruleSet.asset_id,
        ruleSet.version,
        JSON.stringify({
            qualification_required: ruleSet.qualification_required,
            lockup_days: ruleSet.lockup_days,
            jurisdiction_whitelist: ruleSet.jurisdiction_whitelist,
            transfer_whitelist: ruleSet.transfer_whitelist,
        }),
        userId || null,
        new Date().toISOString(),
    ]);
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
 * Get active rule set for an asset
 */
export async function getRuleSetForAsset(assetId) {
    return await findRuleSetByAsset(assetId);
}
/**
 * Get full version history for an asset's rules
 */
export async function getRuleVersions(assetId) {
    return await query(`SELECT version, config, created_by, created_at
     FROM rule_versions
     WHERE asset_id = ?
     ORDER BY version DESC`, [assetId]);
}
//# sourceMappingURL=rules-service.js.map