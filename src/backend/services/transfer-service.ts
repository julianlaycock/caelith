/**
 * Transfer Service
 * 
 * Orchestrates transfer operations:
 * - Validates transfers using rules engine
 * - Updates holdings atomically
 * - Records transfers
 * - Logs events
 */

import {
  findInvestorById,
  findHoldingByInvestorAndAsset,
  findRuleSetByAsset,
  updateHoldingByInvestorAndAsset,
  createHolding,
  createTransfer,
  createEvent,
} from '../repositories/index.js';
import { validateTransfer } from '../../rules-engine/validator.js';
import { ValidationContext, TransferRequest } from '../../rules-engine/types.js';
import { Transfer } from '../models/index.js';
import { getActiveCompositeRules } from './composite-rules-service.js';

/**
 * Simulation result (validation only, no execution)
 */
export interface SimulationResult {
  valid: boolean;
  violations: string[];
  checks: Array<{ rule: string; passed: boolean; message: string }>;
  summary: string;
}

/**
 * Transfer execution result
 */
export interface TransferExecutionResult {
  success: boolean;
  transfer?: Transfer;
  error?: string;
  violations?: string[];
}

/**
 * Simulate a transfer (validate without executing)
 */
export async function simulateTransfer(
  request: TransferRequest
): Promise<SimulationResult> {
  try {
    // Build validation context
    const context = await buildValidationContext(request);
    
    // Validate
    const result = validateTransfer(context);
    
    return {
      valid: result.valid,
      violations: result.violations,
      checks: result.checks,
      summary: result.summary,
    };
  } catch (error) {
    return {
      valid: false,
      violations: [error instanceof Error ? error.message : 'Unknown error'],
      checks: [],
      summary: 'Transfer validation failed due to an error.',
    };
  }
}

/**
 * Execute a transfer (validate and execute)
 */
export async function executeTransfer(
  request: TransferRequest
): Promise<TransferExecutionResult> {
  try {
    // Build validation context
    const context = await buildValidationContext(request);
    
    // Validate
    const validationResult = validateTransfer(context);
    
    if (!validationResult.valid) {
      // Log rejection event
      await createEvent({
        event_type: 'transfer.rejected',
        entity_type: 'transfer',
        entity_id: request.asset_id,
        payload: {
          asset_id: request.asset_id,
          from_investor_id: request.from_investor_id,
          to_investor_id: request.to_investor_id,
          units: request.units,
          violations: validationResult.violations,
        },
      });
      
      return {
        success: false,
        violations: validationResult.violations,
      };
    }
    
    // Execute the transfer (update holdings)
    const fromHolding = context.fromHolding!;
    const newFromUnits = fromHolding.units - request.units;
    
    // Update sender's holding
    await updateHoldingByInvestorAndAsset(
      request.from_investor_id,
      request.asset_id,
      newFromUnits
    );
    
    // Update or create receiver's holding
    const toHolding = await findHoldingByInvestorAndAsset(
      request.to_investor_id,
      request.asset_id
    );
    
    if (toHolding) {
      const newToUnits = toHolding.units + request.units;
      await updateHoldingByInvestorAndAsset(
        request.to_investor_id,
        request.asset_id,
        newToUnits
      );
    } else {
      // Create new holding for receiver
      await createHolding({
        investor_id: request.to_investor_id,
        asset_id: request.asset_id,
        units: request.units,
        acquired_at: request.execution_date,
      });
    }
    
    // Record the transfer
    const transfer = await createTransfer({
      asset_id: request.asset_id,
      from_investor_id: request.from_investor_id,
      to_investor_id: request.to_investor_id,
      units: request.units,
      executed_at: request.execution_date,
    });
    
    // Log execution event
    await createEvent({
      event_type: 'transfer.executed',
      entity_type: 'transfer',
      entity_id: transfer.id,
      payload: {
        transfer_id: transfer.id,
        asset_id: request.asset_id,
        from_investor_id: request.from_investor_id,
        to_investor_id: request.to_investor_id,
        units: request.units,
        from_name: context.fromInvestor.name,
        to_name: context.toInvestor.name,
      },
    });
    
    return {
      success: true,
      transfer,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper: Build validation context from transfer request
 */
async function buildValidationContext(
  request: TransferRequest
): Promise<ValidationContext> {
  // Fetch all required data
  const [fromInvestor, toInvestor, fromHolding, rules, customRules] = await Promise.all([
    findInvestorById(request.from_investor_id),
    findInvestorById(request.to_investor_id),
    findHoldingByInvestorAndAsset(request.from_investor_id, request.asset_id),
    findRuleSetByAsset(request.asset_id),
    getActiveCompositeRules(request.asset_id),
  ]);
  
  // Validate data exists
  if (!fromInvestor) {
    throw new Error(`Sender investor not found: ${request.from_investor_id}`);
  }
  
  if (!toInvestor) {
    throw new Error(`Recipient investor not found: ${request.to_investor_id}`);
  }
  
  if (!rules) {
    throw new Error(`No rules found for asset: ${request.asset_id}`);
  }
  
  return {
    transfer: request,
    fromInvestor,
    toInvestor,
    fromHolding,
    rules,
    customRules,
  };
}