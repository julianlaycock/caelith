import {
  createAsset as createAssetRepo,
  deleteAsset as deleteAssetRepo,
  updateAsset as updateAssetRepo,
  findAssetById,
  findAllAssets,
  getTotalAllocatedUnits,
  createEvent,
} from '../repositories/index.js';
import { Asset, CreateAssetInput, UpdateAssetInput } from '../models/index.js';
import { NotFoundError, ConflictError } from '../errors.js';
import { requireNonEmpty, requirePositive, requirePositiveIfPresent } from '../validators.js';

export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  requirePositive(input.total_units, 'Total units');
  requireNonEmpty(input.name, 'Asset name');

  const asset = await createAssetRepo(input);

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

export async function getAsset(id: string): Promise<Asset | null> {
  return await findAssetById(id);
}

export async function getAllAssets(): Promise<Asset[]> {
  return await findAllAssets();
}

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

/**
 * Delete an asset by ID.
 * Fails if holdings reference the asset.
 */
export async function deleteAsset(id: string): Promise<void> {
  const asset = await findAssetById(id);
  if (!asset) {
    throw new NotFoundError('Asset', id);
  }

  const allocatedUnits = await getTotalAllocatedUnits(id);
  if (allocatedUnits > 0) {
    throw new ConflictError('Cannot delete asset with existing holdings');
  }

  await deleteAssetRepo(id);

  await createEvent({
    event_type: 'asset.deleted',
    entity_type: 'asset',
    entity_id: id,
    payload: {
      name: asset.name,
      asset_type: asset.asset_type,
    },
  });
}

export async function updateAsset(id: string, input: UpdateAssetInput): Promise<Asset> {
  const existing = await findAssetById(id);
  if (!existing) {
    throw new NotFoundError('Asset', id);
  }

  requirePositiveIfPresent(input.total_units, 'Total units');

  const updated = await updateAssetRepo(id, input);
  if (!updated) {
    throw new NotFoundError('Asset', id);
  }

  await createEvent({
    event_type: 'asset.updated',
    entity_type: 'asset',
    entity_id: id,
    payload: {
      changes: input,
    },
  });

  return updated;
}
