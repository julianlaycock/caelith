/**
 * Holding Service
 * 
 * Business logic for holding/allocation management
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

/**
 * Allocate units to an investor (initial allocation)
 */
export async function allocateHolding(input: CreateHoldingInput): Promise<Holding> {
  // Validate investor exists
  const investorFound = await investorExists(input.investor_id);
  if (!investorFound) {
    throw new Error(`Investor not found: ${input.investor_id}`);
  }

  // Validate asset exists
  const asset = await findAssetById(input.asset_id);
  if (!asset) {
    throw new Error(`Asset not found: ${input.asset_id}`);
  }

  // Check if allocation would exceed total units
  const currentAllocated = await getTotalAllocatedUnits(input.asset_id);
  if (currentAllocated + input.units > asset.total_units) {
    throw new Error(
      `Allocation would exceed total units. Available: ${asset.total_units - currentAllocated}, Requested: ${input.units}`
    );
  }

  // Validate units
  if (input.units <= 0) {
    throw new Error('Units must be greater than zero');
  }

  // Create holding
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