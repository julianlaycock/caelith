import { Holding, CreateHoldingInput, UpdateHoldingInput } from '../models/index.js';
/**
 * Holding Repository - Handles all database operations for holdings
 */
/**
 * Create a new holding
 */
export declare function createHolding(input: CreateHoldingInput): Promise<Holding>;
/**
 * Find holding by ID
 */
export declare function findHoldingById(id: string): Promise<Holding | null>;
/**
 * Find holding by investor and asset
 */
export declare function findHoldingByInvestorAndAsset(investorId: string, assetId: string): Promise<Holding | null>;
/**
 * Find all holdings for an asset (cap table)
 */
export declare function findHoldingsByAsset(assetId: string): Promise<Holding[]>;
/**
 * Find all holdings for an investor
 */
export declare function findHoldingsByInvestor(investorId: string): Promise<Holding[]>;
/**
 * Update holding units
 */
export declare function updateHolding(id: string, input: UpdateHoldingInput): Promise<Holding | null>;
/**
 * Update holding by investor and asset
 */
export declare function updateHoldingByInvestorAndAsset(investorId: string, assetId: string, units: number): Promise<Holding | null>;
/**
 * Get cap table with investor names
 */
export declare function getCapTable(assetId: string): Promise<Array<{
    investor_id: string;
    investor_name: string;
    units: number;
    percentage: number;
}>>;
//# sourceMappingURL=holding-repository.d.ts.map