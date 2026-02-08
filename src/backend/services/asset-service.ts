/**
 * Asset Service
 * 
 * Business logic for asset management
 */

import {
  createAsset as createAssetRepo,
  findAssetById,
  findAllAssets,
  getTotalAllocatedUnits,
  createEvent,
} from '../repositories/index.js';
import { Asset, CreateAssetInput } from '../models/index.js';

/**
 * Create a new asset
 */
export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  // Validate input
  if (input.total_units <= 0) {
    throw new Error('Total units must be greater than zero');
  }

  if (!input.name.trim()) {
    throw new Error('Asset name cannot be empty');
  }

  // Create asset
  const asset = await createAssetRepo(input);

  // Log event
  await createEvent({
    event_type: 'asset.created',
    entity_type: 'asset',
    entity_id: asset.id,
    payload: {
      name: asset.name,
      asset_type: asset.asset_type,
      total_units: asset.total_units,
    },
  });

  return asset;
}

/**
 * Get asset by ID
 */
export async function getAsset(id: string): Promise<Asset | null> {
  return await findAssetById(id);
}

/**
 * Get all assets
 */
export async function getAllAssets(): Promise<Asset[]> {
  return await findAllAssets();
}

/**
 * Get asset utilization (allocated vs total units)
 */
export async function getAssetUtilization(assetId: string): Promise<{
  asset: Asset;
  allocated_units: number;
  available_units: number;
  utilization_percentage: number;
} | null> {
  const asset = await findAssetById(assetId);
  
  if (!asset) {
    return null;
  }

  const allocatedUnits = await getTotalAllocatedUnits(assetId);
  const availableUnits = asset.total_units - allocatedUnits;
  const utilizationPercentage = (allocatedUnits / asset.total_units) * 100;

  return {
    asset,
    allocated_units: allocatedUnits,
    available_units: availableUnits,
    utilization_percentage: utilizationPercentage,
  };
}