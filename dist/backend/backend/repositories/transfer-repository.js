import { randomUUID } from 'crypto';
import { query, execute } from '../db.js';
/**
 * Transfer Repository - Handles all database operations for transfers
 */
/**
 * Create a new transfer record
 */
export async function createTransfer(input) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const decision_record_id = input.decision_record_id ?? null;
    await execute(`INSERT INTO transfers (id, asset_id, from_investor_id, to_investor_id, units, decision_record_id, executed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        id,
        input.asset_id,
        input.from_investor_id,
        input.to_investor_id,
        input.units,
        decision_record_id,
        input.executed_at,
        now,
    ]);
    const transfer = {
        id,
        asset_id: input.asset_id,
        from_investor_id: input.from_investor_id,
        to_investor_id: input.to_investor_id,
        units: input.units,
        decision_record_id,
        executed_at: input.executed_at,
        created_at: now,
    };
    return transfer;
}
/**
 * Find transfers by asset
 */
export async function findTransfersByAsset(assetId) {
    return await query('SELECT * FROM transfers WHERE asset_id = ? ORDER BY executed_at DESC', [assetId]);
}
/**
 * Find a transfer by ID
 */
export async function findTransferById(id) {
    const rows = await query('SELECT * FROM transfers WHERE id = ?', [id]);
    return rows[0];
}
/**
 * Find all transfers
 */
export async function findAllTransfers() {
    return await query('SELECT * FROM transfers ORDER BY executed_at DESC', []);
}
/**
 * Get detailed transfer history for an asset, including investor names
 */
export async function getTransferHistory(assetId) {
    return await query(`SELECT t.*, f.name AS from_name, r.name AS to_name
     FROM transfers t
     JOIN investors f ON t.from_investor_id = f.id
     JOIN investors r ON t.to_investor_id = r.id
     WHERE t.asset_id = ?
     ORDER BY t.executed_at DESC`, [assetId]);
}
/**
 * Find transfers by investor (either sender or receiver)
 */
export async function findTransfersByInvestor(investorId) {
    return await query('SELECT * FROM transfers WHERE from_investor_id = ? OR to_investor_id = ? ORDER BY executed_at DESC', [investorId, investorId]);
}
//# sourceMappingURL=transfer-repository.js.map