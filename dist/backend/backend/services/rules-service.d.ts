/**
 * Rules Service
 *
 * Business logic for rule set management.
 * Now archives every version in rule_versions table.
 */
import { RuleSet, CreateRuleSetInput } from '../models/index.js';
/**
 * Create or update rule set for an asset (archives previous version)
 */
export declare function createOrUpdateRuleSet(input: CreateRuleSetInput, userId?: string): Promise<RuleSet>;
/**
 * Get active rule set for an asset
 */
export declare function getRuleSetForAsset(assetId: string): Promise<RuleSet | null>;
/**
 * Get full version history for an asset's rules
 */
export declare function getRuleVersions(assetId: string): Promise<Array<{
    version: number;
    config: Record<string, unknown>;
    created_by: string | null;
    created_at: string;
}>>;
//# sourceMappingURL=rules-service.d.ts.map