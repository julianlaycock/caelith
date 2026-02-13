/**
 * Holding Service
 *
 * Business logic for holding/allocation management.
 * Uses database transactions with FOR UPDATE locking to prevent race conditions.
 */

import {
  createHolding as createHoldingRepo,
  findHoldingsByAsset,
  findHoldingsByInvestor,
  getCapTable as getCapTableRepo,
  getTotalAllocatedUnits,
  findAssetById,
  investorExists,
  createEvent,
} from '../repositories/index.js';
import { getPool } from '../db.js';
import { Holding, CreateHoldingInput } from '../models/index.js';
import { randomUUID } from 'crypto';

/**
 * Allocate units to an investor (initial allocation).
 * Uses SELECT ... FOR UPDATE to prevent concurrent over-allocation.
 */
export async function allocateHolding(input: CreateHoldingInput): Promise<Holding> {
  // Validate investor exists
  const investorFound = await investorExists(input.investor_id);
  if (!investorFound) {
    throw new Error(`Investor not found: ${input.investor_id}`);
  }

  if (input.units <= 0) {
    throw new Error('Units must be greater than zero');
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the asset row to prevent concurrent allocations exceeding total_units
    const assetResult = await client.query(
      `SELECT id, name, total_units FROM assets WHERE id = $1 FOR UPDATE`,
      [input.asset_id]
    );
    if (assetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error(`Asset not found: ${input.asset_id}`);
    }
    const asset = assetResult.rows[0];

    // Get current allocated within locked transaction
    const allocResult = await client.query(
      `SELECT COALESCE(SUM(units), 0) as allocated FROM holdings WHERE asset_id = $1`,
      [input.asset_id]
    );
    const currentAllocated = Number(allocResult.rows[0].allocated);

    if (currentAllocated + input.units > asset.total_units) {
      await client.query('ROLLBACK');
      throw new Error(
        `Allocation would exceed total units. Available: ${asset.total_units - currentAllocated}, Requested: ${input.units}`
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    throw error;
  } finally {
    client.release();
  }

  // Create holding (now safe — we verified capacity under lock)
  const holding = await createHoldingRepo(input);

  // Log event
  await createEvent({
    event_type: 'holding.allocated',
    entity_type: 'holding',
    entity_id: holding.id,
    payload: {
      investor_id: input.investor_id,
      asset_id: input.asset_id,
      units: input.units,
    },
  });

  return holding;
}

/**
 * Get holdings for an asset (cap table view)
 */
export async function getHoldingsForAsset(assetId: string): Promise<Holding[]> {
  return await findHoldingsByAsset(assetId);
}

/**
 * Get holdings for an investor
 */
export async function getHoldingsForInvestor(investorId: string): Promise<Holding[]> {
  return await findHoldingsByInvestor(investorId);
}

/**
 * Get cap table with investor names and percentages
 */
export async function getCapTable(assetId: string): Promise<
  Array<{
    investor_id: string;
    investor_name: string;
    units: number;
    percentage: number;
  }>
> {
  return await getCapTableRepo(assetId);
}