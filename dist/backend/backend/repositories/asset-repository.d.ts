import { Asset, CreateAssetInput, UpdateAssetInput } from '../models/index.js';
/**
 * Asset Repository - Handles all database operations for assets
 */
/**
 * Create a new asset
 */
export declare function createAsset(input: CreateAssetInput): Promise<Asset>;
/**
 * Find asset by ID
 */
export declare function findAssetById(id: string): Promise<Asset | null>;
/**
 * Find all assets
 */
export declare function findAllAssets(): Promise<Asset[]>;
/**
 * Check if asset exists
 */
export declare function assetExists(id: string): Promise<boolean>;
/**
 * Get total allocated units for an asset
 */
export declare function getTotalAllocatedUnits(assetId: string): Promise<number>;
/**
 * Delete an asset by ID
 */
export declare function deleteAsset(id: string): Promise<void>;
/**
 * Update an asset (only non-undefined fields)
 */
export declare function updateAsset(id: string, input: UpdateAssetInput): Promise<Asset | null>;
//# sourceMappingURL=asset-repository.d.ts.map