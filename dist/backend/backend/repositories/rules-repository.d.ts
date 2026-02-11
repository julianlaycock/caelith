import { RuleSet, CreateRuleSetInput } from '../models/index.js';
/**
 * Create a new rule set for an asset
 */
export declare function createRuleSet(input: CreateRuleSetInput): Promise<RuleSet>;
/**
 * Find rule set by ID
 */
export declare function findRuleSetById(id: string): Promise<RuleSet | null>;
/**
 * Find active rule set for an asset
 */
export declare function findRuleSetByAsset(assetId: string): Promise<RuleSet | null>;
/**
 * Check if rules exist for an asset
 */
export declare function ruleSetExists(assetId: string): Promise<boolean>;
/**
 * Delete rule set for an asset
 */
export declare function deleteRuleSet(assetId: string): Promise<void>;
//# sourceMappingURL=rules-repository.d.ts.map