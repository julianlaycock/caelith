/**
 * Composite Rules Service
 *
 * CRUD for custom composite rules stored per asset.
 * These are loaded during transfer validation alongside built-in rules.
 */
import type { CompositeRule, RuleCondition } from '../../rules-engine/types.js';
export interface StoredCompositeRule extends CompositeRule {
    asset_id: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}
/**
 * Create a new composite rule for an asset
 */
export declare function createCompositeRule(assetId: string, input: {
    name: string;
    description: string;
    operator: 'AND' | 'OR' | 'NOT';
    conditions: RuleCondition[];
    enabled?: boolean;
}, userId?: string): Promise<StoredCompositeRule>;
/**
 * List all composite rules for an asset
 */
export declare function listCompositeRules(assetId: string): Promise<StoredCompositeRule[]>;
/**
 * Get enabled composite rules for an asset (used during validation)
 */
export declare function getActiveCompositeRules(assetId: string): Promise<CompositeRule[]>;
/**
 * Update a composite rule
 */
export declare function updateCompositeRule(id: string, updates: {
    name?: string;
    description?: string;
    operator?: 'AND' | 'OR' | 'NOT';
    conditions?: RuleCondition[];
    enabled?: boolean;
}): Promise<void>;
/**
 * Delete a composite rule
 */
export declare function deleteCompositeRule(id: string): Promise<void>;
//# sourceMappingURL=composite-rules-service.d.ts.map