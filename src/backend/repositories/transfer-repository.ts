import { randomUUID } from 'crypto';
import { query, execute, queryWithTenant, DEFAULT_TENANT_ID } from '../db.js';
import { Transfer, CreateTransferInput } from '../models/index.js';

/**
 * Transfer Repository - Handles all database operations for transfers
 */

/**
 * Create a new transfer record
 */
export async function createTransfer(
  input: CreateTransferInput & { decision_record_id?: string | null }
): Promise<Transfer> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const decision_record_id = input.decision_record_id ?? null;
  const status = input.status ?? 'executed';
  const approved_by = input.approved_by ?? null;
  const approved_at = input.approved_at ?? null;
  const rejection_reason = input.rejection_reason ?? null;
  const pending_reason = input.pending_reason ?? null;

  await execute(
    `INSERT INTO transfers (id, tenant_id, asset_id, from_investor_id, to_investor_id, units, decision_record_id, executed_at, created_at, status, approved_by, approved_at, rejection_reason, pending_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      DEFAULT_TENANT_ID,
      input.asset_id,
      input.from_investor_id,
      input.to_investor_id,
      input.units,
      decision_record_id,
      input.executed_at,
      now,
      status,
      approved_by,
      approved_at,
      rejection_reason,
      pending_reason,
    ]
  );

  const transfer: Transfer = {
    id,
    asset_id: input.asset_id,
    from_investor_id: input.from_investor_id,
    to_investor_id: input.to_investor_id,
    units: input.units,
    decision_record_id,
    executed_at: input.executed_at,
    created_at: now,
    status,
    approved_by,
    approved_at,
    rejection_reason,
    pending_reason,
  };

  return transfer;
}

/**
 * Find transfers by asset
 */
export async function findTransfersByAsset(
  assetId: string
): Promise<Transfer[]> {
  return await queryWithTenant<Transfer>(
    'SELECT * FROM transfers WHERE asset_id = ? ORDER BY executed_at DESC',
    [assetId]
  );
}

/**
 * Find a transfer by ID
 */
export async function findTransferById(
  id: string
): Promise<Transfer | undefined> {
  const rows = await queryWithTenant<Transfer>(
    'SELECT * FROM transfers WHERE id = ?',
    [id]
  );
  return rows[0];
}

/**
 * Find all transfers
 */
export async function findAllTransfers(): Promise<Transfer[]> {
  return await queryWithTenant<Transfer>(
    'SELECT * FROM transfers ORDER BY executed_at DESC'
  );
}

/**
 * Get detailed transfer history, including investor and asset names.
 * If assetId is provided, scope to that asset; otherwise return all tenant transfers.
 */
export async function getTransferHistory(assetId?: string): Promise<
  (Transfer & { from_name: string; to_name: string; asset_name: string })[]
> {
  const params: string[] = [DEFAULT_TENANT_ID];
  const filters = ['t.tenant_id = ?'];

  if (assetId) {
    filters.push('t.asset_id = ?');
    params.push(assetId);
  }

  return await query<Transfer & { from_name: string; to_name: string; asset_name: string }>(
    `SELECT t.*, f.name AS from_name, r.name AS to_name, a.name AS asset_name
     FROM transfers t
     JOIN investors f ON t.from_investor_id = f.id
     JOIN investors r ON t.to_investor_id = r.id
     JOIN assets a ON t.asset_id = a.id
     WHERE ${filters.join(' AND ')}
     ORDER BY t.executed_at DESC`,
    params
  );
}

/**
 * Find transfers by investor (either sender or receiver)
 */
export async function findTransfersByInvestor(
  investorId: string
): Promise<Transfer[]> {
  return await queryWithTenant<Transfer>(
    'SELECT * FROM transfers WHERE (from_investor_id = ? OR to_investor_id = ?) ORDER BY executed_at DESC',
    [investorId, investorId]
  );
}
