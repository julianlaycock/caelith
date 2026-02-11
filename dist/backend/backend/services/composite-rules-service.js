/**
 * Composite Rules Service
 *
 * CRUD for custom composite rules stored per asset.
 * These are loaded during transfer validation alongside built-in rules.
 */
import { randomUUID } from 'crypto';
import { query, execute } from '../db.js';
import { createEvent } from '../repositories/index.js';
function rowToRule(row) {
    const conditions = typeof row.conditions === 'string'
        ? JSON.parse(row.conditions)
        : row.conditions;
    return {
        id: row.id,
        asset_id: row.asset_id,
        name: row.name,
        description: row.description,
        operator: row.operator,
        conditions,
        enabled: row.enabled,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
/**
 * Create a new composite rule for an asset
 */
export async function createCompositeRule(assetId, input, userId) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const enabled = input.enabled !== undefined ? input.enabled : true;
    await execute(`INSERT INTO composite_rules (id, asset_id, name, description, operator, conditions, enabled, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, assetId, input.name, input.description, input.operator, JSON.stringify(input.conditions), enabled, userId || null, now, now]);
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
export async function listCompositeRules(assetId) {
    const rows = await query('SELECT * FROM composite_rules WHERE asset_id = ? ORDER BY created_at ASC', [assetId]);
    return rows.map(rowToRule);
}
/**
 * Get enabled composite rules for an asset (used during validation)
 */
export async function getActiveCompositeRules(assetId) {
    const rows = await query('SELECT * FROM composite_rules WHERE asset_id = ? AND enabled = ? ORDER BY created_at ASC', [assetId, true]);
    return rows.map(rowToRule);
}
/**
 * Update a composite rule
 */
export async function updateCompositeRule(id, updates) {
    const sets = [];
    const params = [];
    if (updates.name !== undefined) {
        sets.push('name = ?');
        params.push(updates.name);
    }
    if (updates.description !== undefined) {
        sets.push('description = ?');
        params.push(updates.description);
    }
    if (updates.operator !== undefined) {
        sets.push('operator = ?');
        params.push(updates.operator);
    }
    if (updates.conditions !== undefined) {
        sets.push('conditions = ?');
        params.push(JSON.stringify(updates.conditions));
    }
    if (updates.enabled !== undefined) {
        sets.push('enabled = ?');
        params.push(updates.enabled);
    }
    if (sets.length === 0)
        return;
    sets.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    await execute(`UPDATE composite_rules SET ${sets.join(', ')} WHERE id = ?`, params);
}
/**
 * Delete a composite rule
 */
export async function deleteCompositeRule(id) {
    await execute('DELETE FROM composite_rules WHERE id = ?', [id]);
}
//# sourceMappingURL=composite-rules-service.js.map