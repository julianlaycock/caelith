import { randomUUID } from 'crypto';
import { query, execute } from '../db.js';
import { Transfer, CreateTransferInput } from '../models/index.js';

/**
 * Transfer Repository - Handles all database operations for transfers
 */

/**
 * Create a new transfer record
 */
export async function createTransfer(input: CreateTransferInput): Promise<Transfer> {
  const id = randomUUID();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO transfers (id, asset_id, from_investor_id, to_investor_id, units, executed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.asset_id,
      input.from_investor_id,
      input.to_investor_id,
      input.units,
      input.executed_at,
      now,
    ]
  );

  const transfer: Transfer = {
    id,
    asset_id: input.asset_id,
    from_investor_id: input.from_investor_id,
    to_investor_id: input.to_investor_id,
    units: input.units,
    decision_record_id: null,
    executed_at: input.executed_at,
    created_at: now,
  };

  return transfer;
}

/**
 * Find transfer by ID
 */
export async function findTransferById(id: string): Promise<Transfer | null> {
  const results = await query<Transfer>('SELECT * FROM transfers WHERE id = ?', [id]);

  return results.length > 0 ? results[0] : null;
}

/**
 * Find all transfers for an asset
 */
export async function findTransfersByAsset(assetId: string): Promise<Transfer[]> {
  return await query<Transfer>(
    'SELECT * FROM transfers WHERE asset_id = ? ORDER BY executed_at DESC',
    [assetId]
  );
}

/**
 * Find all transfers from an investor
 */
export async function findTransfersFromInvestor(investorId: string): Promise<Transfer[]> {
  return await query<Transfer>(
    'SELECT * FROM transfers WHERE from_investor_id = ? ORDER BY executed_at DESC',
    [investorId]
  );
}

/**
 * Find all transfers to an investor
 */
export async function findTransfersToInvestor(investorId: string): Promise<Transfer[]> {
  return await query<Transfer>(
    'SELECT * FROM transfers WHERE to_investor_id = ? ORDER BY executed_at DESC',
    [investorId]
  );
}

/**
 * Find all transfers (most recent first)
 */
export async function findAllTransfers(): Promise<Transfer[]> {
  return await query<Transfer>(
    'SELECT * FROM transfers ORDER BY executed_at DESC',
    []
  );
}

/**
 * Get transfer history with investor names
 */
export async function getTransferHistory(
  assetId: string
): Promise<
  Array<{
    id: string;
    from_name: string;
    to_name: string;
    units: number;
    executed_at: string;
  }>
> {
  const results = await query<{
    id: string;
    from_name: string;
    to_name: string;
    units: number;
    executed_at: string;
  }>(
    `SELECT 
      t.id,
      fi.name as from_name,
      ti.name as to_name,
      t.units,
      t.executed_at
    FROM transfers t
    JOIN investors fi ON t.from_investor_id = fi.id
    JOIN investors ti ON t.to_investor_id = ti.id
    WHERE t.asset_id = ?
    ORDER BY t.executed_at DESC`,
    [assetId]
  );

  return results;
}