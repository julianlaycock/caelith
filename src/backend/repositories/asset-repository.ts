import { randomUUID } from 'crypto';
import { query, execute } from '../db.js';
import { Asset, CreateAssetInput, UpdateAssetInput } from '../models/index.js';

/**
 * Asset Repository - Handles all database operations for assets
 */

/**
 * Create a new asset
 */
export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const fund_structure_id = input.fund_structure_id ?? null;
  const unit_price = input.unit_price ?? null;

  await execute(
    `INSERT INTO assets (id, name, asset_type, total_units, fund_structure_id, unit_price, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.asset_type, input.total_units, fund_structure_id, unit_price, now]
  );

  const asset: Asset = {
    id,
    name: input.name,
    asset_type: input.asset_type,
    total_units: input.total_units,
    fund_structure_id,
    unit_price,
    created_at: now,
  };

  return asset;
}

/**
 * Find asset by ID
 */
export async function findAssetById(id: string): Promise<Asset | null> {
  const results = await query<Asset>(
    'SELECT * FROM assets WHERE id = ?',
    [id]
  );

  return results.length > 0 ? results[0] : null;
}

/**
 * Find all assets
 */
export async function findAllAssets(): Promise<Asset[]> {
  return await query<Asset>('SELECT * FROM assets ORDER BY created_at DESC');
}

/**
 * Check if asset exists
 */
export async function assetExists(id: string): Promise<boolean> {
  const results = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM assets WHERE id = ?',
    [id]
  );

  return results.length > 0 && results[0].count > 0;
}

/**
 * Get total allocated units for an asset
 */
export async function getTotalAllocatedUnits(assetId: string): Promise<number> {
  const results = await query<{ total: number | null }>(
    'SELECT SUM(units) as total FROM holdings WHERE asset_id = ?',
    [assetId]
  );

  return results.length > 0 && results[0].total !== null
    ? results[0].total
    : 0;
}

/**
 * Delete an asset by ID
 */
export async function deleteAsset(id: string): Promise<void> {
  await execute('DELETE FROM assets WHERE id = ?', [id]);
}

/**
 * Update an asset (only non-undefined fields)
 */
export async function updateAsset(id: string, input: UpdateAssetInput): Promise<Asset | null> {
  const sets: string[] = [];
  const params: (string | number)[] = [];

  if (input.name !== undefined) { sets.push('name = ?'); params.push(input.name); }
  if (input.asset_type !== undefined) { sets.push('asset_type = ?'); params.push(input.asset_type); }
  if (input.total_units !== undefined) { sets.push('total_units = ?'); params.push(input.total_units); }

  if (sets.length === 0) {
    return findAssetById(id);
  }

  params.push(id);

  await execute(
    `UPDATE assets SET ${sets.join(', ')} WHERE id = ?`,
    params
  );

  return findAssetById(id);
}