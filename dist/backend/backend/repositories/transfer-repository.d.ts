import { Transfer, CreateTransferInput } from '../models/index.js';
/**
 * Transfer Repository - Handles all database operations for transfers
 */
/**
 * Create a new transfer record
 */
export declare function createTransfer(input: CreateTransferInput & {
    decision_record_id?: string | null;
}): Promise<Transfer>;
/**
 * Find transfers by asset
 */
export declare function findTransfersByAsset(assetId: string): Promise<Transfer[]>;
/**
 * Find a transfer by ID
 */
export declare function findTransferById(id: string): Promise<Transfer | undefined>;
/**
 * Find all transfers
 */
export declare function findAllTransfers(): Promise<Transfer[]>;
/**
 * Get detailed transfer history for an asset, including investor names
 */
export declare function getTransferHistory(assetId: string): Promise<(Transfer & {
    from_name: string;
    to_name: string;
})[]>;
/**
 * Find transfers by investor (either sender or receiver)
 */
export declare function findTransfersByInvestor(investorId: string): Promise<Transfer[]>;
//# sourceMappingURL=transfer-repository.d.ts.map