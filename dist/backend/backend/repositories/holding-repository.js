import { randomUUID } from 'crypto';
import { query, execute } from '../db.js';
/**
 * Holding Repository - Handles all database operations for holdings
 */
/**
 * Create a new holding
 */
export async function createHolding(input) {
    const id = randomUUID();
    const now = new Date().toISOString();
    await execute(`INSERT INTO holdings (id, investor_id, asset_id, units, acquired_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, input.investor_id, input.asset_id, input.units, input.acquired_at, now, now]);
    const holding = {
        id,
        investor_id: input.investor_id,
        asset_id: input.asset_id,
        units: input.units,
        acquired_at: input.acquired_at,
        created_at: now,
        updated_at: now,
    };
    return holding;
}
/**
 * Find holding by ID
 */
export async function findHoldingById(id) {
    const results = await query('SELECT * FROM holdings WHERE id = ?', [id]);
    return results.length > 0 ? results[0] : null;
}
/**
 * Find holding by investor and asset
 */
export async function findHoldingByInvestorAndAsset(investorId, assetId) {
    const results = await query('SELECT * FROM holdings WHERE investor_id = ? AND asset_id = ?', [investorId, assetId]);
    return results.length > 0 ? results[0] : null;
}
/**
 * Find all holdings for an asset (cap table)
 */
export async function findHoldingsByAsset(assetId) {
    return await query('SELECT * FROM holdings WHERE asset_id = ? AND units > 0 ORDER BY units DESC', [assetId]);
}
/**
 * Find all holdings for an investor
 */
export async function findHoldingsByInvestor(investorId) {
    return await query('SELECT * FROM holdings WHERE investor_id = ? AND units > 0 ORDER BY acquired_at DESC', [investorId]);
}
/**
 * Update holding units
 */
export async function updateHolding(id, input) {
    const existing = await findHoldingById(id);
    if (!existing) {
        return null;
    }
    if (input.units === undefined) {
        return existing;
    }
    const now = new Date().toISOString();
    await execute('UPDATE holdings SET units = ?, updated_at = ? WHERE id = ?', [input.units, now, id]);
    return await findHoldingById(id);
}
/**
 * Update holding by investor and asset
 */
export async function updateHoldingByInvestorAndAsset(investorId, assetId, units) {
    const existing = await findHoldingByInvestorAndAsset(investorId, assetId);
    if (!existing) {
        return null;
    }
    const now = new Date().toISOString();
    await execute('UPDATE holdings SET units = ?, updated_at = ? WHERE investor_id = ? AND asset_id = ?', [units, now, investorId, assetId]);
    return await findHoldingByInvestorAndAsset(investorId, assetId);
}
/**
 * Get cap table with investor names
 */
export async function getCapTable(assetId) {
    const results = await query(`SELECT 
      h.investor_id,
      i.name as investor_name,
      h.units,
      a.total_units
    FROM holdings h
    JOIN investors i ON h.investor_id = i.id
    JOIN assets a ON h.asset_id = a.id
    WHERE h.asset_id = ? AND h.units > 0
    ORDER BY h.units DESC`, [assetId]);
    return results.map((row) => ({
        investor_id: row.investor_id,
        investor_name: row.investor_name,
        units: row.units,
        percentage: row.total_units > 0 ? (row.units / row.total_units) * 100 : 0,
    }));
}
//# sourceMappingURL=holding-repository.js.map