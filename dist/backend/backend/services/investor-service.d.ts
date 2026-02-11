/**
 * Investor Service
 *
 * Business logic for investor management
 */
import { Investor, CreateInvestorInput, UpdateInvestorInput } from '../models/index.js';
/**
 * Create a new investor
 */
export declare function createInvestor(input: CreateInvestorInput): Promise<Investor>;
/**
 * Get investor by ID
 */
export declare function getInvestor(id: string): Promise<Investor | null>;
/**
 * Get all investors
 */
export declare function getAllInvestors(): Promise<Investor[]>;
/**
 * Update investor
 */
export declare function updateInvestor(id: string, input: UpdateInvestorInput): Promise<Investor | null>;
//# sourceMappingURL=investor-service.d.ts.map