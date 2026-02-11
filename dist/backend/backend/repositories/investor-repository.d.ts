import { Investor, CreateInvestorInput, UpdateInvestorInput } from '../models/index.js';
/**
 * Create a new investor
 */
export declare function createInvestor(input: CreateInvestorInput): Promise<Investor>;
/**
 * Find investor by ID
 */
export declare function findInvestorById(id: string): Promise<Investor | null>;
/**
 * Find all investors
 */
export declare function findAllInvestors(): Promise<Investor[]>;
/**
 * Update investor
 */
export declare function updateInvestor(id: string, input: UpdateInvestorInput): Promise<Investor | null>;
/**
 * Check if investor exists
 */
export declare function investorExists(id: string): Promise<boolean>;
/**
 * Find investors by jurisdiction
 */
export declare function findInvestorsByJurisdiction(jurisdiction: string): Promise<Investor[]>;
//# sourceMappingURL=investor-repository.d.ts.map