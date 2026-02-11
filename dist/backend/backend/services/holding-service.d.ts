/**
 * Holding Service
 *
 * Business logic for holding/allocation management
 */
import { Holding, CreateHoldingInput } from '../models/index.js';
/**
 * Allocate units to an investor (initial allocation)
 */
export declare function allocateHolding(input: CreateHoldingInput): Promise<Holding>;
/**
 * Get holdings for an asset (cap table view)
 */
export declare function getHoldingsForAsset(assetId: string): Promise<Holding[]>;
/**
 * Get holdings for an investor
 */
export declare function getHoldingsForInvestor(investorId: string): Promise<Holding[]>;
/**
 * Get cap table with investor names and percentages
 */
export declare function getCapTable(assetId: string): Promise<Array<{
    investor_id: string;
    investor_name: string;
    units: number;
    percentage: number;
}>>;
//# sourceMappingURL=holding-service.d.ts.map