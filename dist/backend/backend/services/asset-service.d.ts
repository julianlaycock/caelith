/**
 * Asset Service
 *
 * Business logic for asset management
 */
import { Asset, CreateAssetInput, UpdateAssetInput } from '../models/index.js';
/**
 * Create a new asset
 */
export declare function createAsset(input: CreateAssetInput): Promise<Asset>;
/**
 * Get asset by ID
 */
export declare function getAsset(id: string): Promise<Asset | null>;
/**
 * Get all assets
 */
export declare function getAllAssets(): Promise<Asset[]>;
/**
 * Get asset utilization (allocated vs total units)
 */
export declare function getAssetUtilization(assetId: string): Promise<{
    asset: Asset;
    allocated_units: number;
    available_units: number;
    utilization_percentage: number;
} | null>;
/**
 * Delete an asset by ID
 * Fails if holdings reference the asset
 */
export declare function deleteAsset(id: string): Promise<void>;
/**
 * Update an asset
 */
export declare function updateAsset(id: string, input: UpdateAssetInput): Promise<Asset>;
//# sourceMappingURL=asset-service.d.ts.map