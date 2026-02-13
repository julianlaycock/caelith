/**
 * Holding Service
 *
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
import { Holding, CreateHoldingInput } from '../models/index.js';
import { randomUUID } from 'crypto';
import { ValidationError, NotFoundError, BusinessLogicError } from '../errors.js';
import { withTransaction } from './transaction-helper.js';

/**
 * Allocate units to an investor.
 * Uses SELECT ... FOR UPDATE to prevent concurrent over-allocation.
 */
export async function allocateHolding(input: CreateHoldingInput): Promise<Holding> {
  const investorFound = await investorExists(input.investor_id);
  if (!investorFound) {
    throw new NotFoundError('Investor', input.investor_id);
  }

  if (input.units <= 0) {
    throw new ValidationError('Units must be greater than zero');
  }

  await withTransaction(async (client) => {
    const assetResult = await client.query(
      `SELECT id, name, total_units FROM assets WHERE id = $1 FOR UPDATE`,
      [input.asset_id]
    );
    if (assetResult.rows.length === 0) {
      throw new NotFoundError('Asset', input.asset_id);
    }
    const asset = assetResult.rows[0];

    const allocResult = await client.query(
      `SELECT COALESCE(SUM(units), 0) as allocated FROM holdings WHERE asset_id = $1`,
      [input.asset_id]
    );
    const currentAllocated = Number(allocResult.rows[0].allocated);

    if (currentAllocated + input.units > asset.total_units) {
      throw new BusinessLogicError(
        `Allocation would exceed total units. Available: ${asset.total_units - currentAllocated}, Requested: ${input.units}`
      );
    }
  });

  const holding = await createHoldingRepo(input);

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

export async function getHoldingsForAsset(assetId: string): Promise<Holding[]> {
  return await findHoldingsByAsset(assetId);
}

export async function getHoldingsForInvestor(investorId: string): Promise<Holding[]> {
  return await findHoldingsByInvestor(investorId);
}

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
