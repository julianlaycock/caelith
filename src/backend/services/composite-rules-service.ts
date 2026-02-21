/**
 * Composite Rules Service
 *
 * CRUD for custom composite rules stored per asset.
 * These are loaded during transfer validation alongside built-in rules.
 */

import { randomUUID } from 'crypto';
import { query, execute } from '../db.js';
import { createEvent } from '../repositories/index.js';
import type { CompositeRule, RuleCondition } from '../../rules-engine/types.js';

export interface StoredCompositeRule extends CompositeRule {
  asset_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CompositeRuleRow {
  id: string;
  asset_id: string;
  name: string;
  description: string;
  operator: string;
  conditions: string | RuleCondition[];
  enabled: boolean;
  severity: string;
  jurisdiction: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRule(row: CompositeRuleRow): StoredCompositeRule {
  const conditions = typeof row.conditions === 'string'
    ? JSON.parse(row.conditions)
    : row.conditions;

  return {
    id: row.id,
    asset_id: row.asset_id,
    name: row.name,
    description: row.description,
    operator: row.operator as 'AND' | 'OR' | 'NOT',
    conditions,
    enabled: row.enabled,
    severity: row.severity || 'medium',
    jurisdiction: row.jurisdiction || null,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Create a new composite rule for an asset
 */
export async function createCompositeRule(
  assetId: string,
  input: {
    name: string;
    description: string;
    operator: 'AND' | 'OR' | 'NOT';
    conditions: RuleCondition[];
    enabled?: boolean;
  },
  userId?: string
): Promise<StoredCompositeRule> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const enabled = input.enabled !== undefined ? input.enabled : true;

  await execute(
    `INSERT INTO composite_rules (id, asset_id, name, description, operator, conditions, enabled, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, assetId, input.name, input.description, input.operator, JSON.stringify(input.conditions), enabled, userId || null, now, now]
  );

  await createEvent({
    event_type: 'composite_rule.created',
    entity_type: 'composite_rule',
    entity_id: id,
    payload: { asset_id: assetId, name: input.name, operator: input.operator },
  });

  return {
    id,
    asset_id: assetId,
    name: input.name,
    description: input.description,
    operator: input.operator,
    conditions: input.conditions,
    enabled,
    created_by: userId || null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * List all composite rules for an asset
 */
export async function listCompositeRules(assetId: string): Promise<StoredCompositeRule[]> {
  const rows = await query<CompositeRuleRow>(
    'SELECT * FROM composite_rules WHERE asset_id = $1 ORDER BY created_at ASC',
    [assetId]
  );
  return rows.map(rowToRule);
}

/**
 * Get enabled composite rules for an asset (used during validation)
 */
export async function getActiveCompositeRules(assetId: string): Promise<CompositeRule[]> {
  const rows = await query<CompositeRuleRow>(
    'SELECT * FROM composite_rules WHERE asset_id = $1 AND enabled = $2 ORDER BY created_at ASC',
    [assetId, true]
  );
  return rows.map(rowToRule);
}

/**
 * Update a composite rule
 */
export async function updateCompositeRule(
  id: string,
  updates: {
    name?: string;
    description?: string;
    operator?: 'AND' | 'OR' | 'NOT';
    conditions?: RuleCondition[];
    enabled?: boolean;
  }
): Promise<void> {
  const sets: string[] = [];
  const params: (string | number | boolean | null)[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    sets.push(`name = $${paramIndex++}`);
    params.push(updates.name);
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${paramIndex++}`);
    params.push(updates.description);
  }
  if (updates.operator !== undefined) {
    sets.push(`operator = $${paramIndex++}`);
    params.push(updates.operator);
  }
  if (updates.conditions !== undefined) {
    sets.push(`conditions = $${paramIndex++}`);
    params.push(JSON.stringify(updates.conditions));
  }
  if (updates.enabled !== undefined) {
    sets.push(`enabled = $${paramIndex++}`);
    params.push(updates.enabled);
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = $${paramIndex++}`);
  params.push(new Date().toISOString());
  params.push(id);

  await execute(`UPDATE composite_rules SET ${sets.join(', ')} WHERE id = $${paramIndex}`, params);
}

/**
 * Delete a composite rule
 */
export async function deleteCompositeRule(id: string): Promise<void> {
  await execute('DELETE FROM composite_rules WHERE id = $1', [id]);
}
