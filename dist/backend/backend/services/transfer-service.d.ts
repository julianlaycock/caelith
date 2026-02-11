/**
 * Transfer Service — Slice 2
 *
 * Orchestrates transfer operations:
 * - Validates transfers using rules engine (existing)
 * - Runs AIFMD eligibility checks if asset has a fund structure (new)
 * - Writes decision provenance record for every validation (new)
 * - Links decision_record_id to executed transfers (new)
 * - Updates holdings atomically
 * - Records transfers and logs events
 */
import { TransferRequest } from '../../rules-engine/types.js';
import { Transfer, EligibilityCriteria } from '../models/index.js';
/**
 * Single check result (shared shape with rules engine)
 */
interface Check {
    rule: string;
    passed: boolean;
    message: string;
}
/**
 * Simulation result (validation only, no execution)
 */
export interface SimulationResult {
    valid: boolean;
    violations: string[];
    checks: Check[];
    summary: string;
    decision_record_id?: string;
    eligibility_criteria_applied?: EligibilityCriteria | null;
}
/**
 * Transfer execution result
 */
export interface TransferExecutionResult {
    success: boolean;
    transfer?: Transfer;
    error?: string;
    violations?: string[];
    decision_record_id?: string;
}
/**
 * Simulate a transfer (validate without executing)
 */
export declare function simulateTransfer(request: TransferRequest): Promise<SimulationResult>;
/**
 * Execute a transfer (validate and execute)
 */
export declare function executeTransfer(request: TransferRequest): Promise<TransferExecutionResult>;
export {};
//# sourceMappingURL=transfer-service.d.ts.map