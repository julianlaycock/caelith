/**
 * Transfer Routes
 * 
 * Endpoints for transfer operations
 */

import express from 'express';
import {
  simulateTransfer,
  executeTransfer,
} from '../services/index.js';
import {
  findTransfersByAsset,
  getTransferHistory,
} from '../repositories/index.js';

const router = express.Router();

/**
 * POST /transfers/simulate
 * Simulate a transfer (validate without executing)
 */
router.post('/simulate', async (req, res): Promise<void> => {
  try {
    const { asset_id, from_investor_id, to_investor_id, units, execution_date } = req.body;

    // Validate request body
    if (!asset_id || !from_investor_id || !to_investor_id || !units || !execution_date) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: asset_id, from_investor_id, to_investor_id, units, execution_date',
      });
      return;
    }

    const result = await simulateTransfer({
      asset_id,
      from_investor_id,
      to_investor_id,
      units: Number(units),
      execution_date,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /transfers
 * Execute a transfer
 */
router.post('/', async (req, res): Promise<void> => {
  try {
    const { asset_id, from_investor_id, to_investor_id, units, execution_date } = req.body;

    // Validate request body
    if (!asset_id || !from_investor_id || !to_investor_id || !units || !execution_date) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: asset_id, from_investor_id, to_investor_id, units, execution_date',
      });
      return;
    }

    const result = await executeTransfer({
      asset_id,
      from_investor_id,
      to_investor_id,
      units: Number(units),
      execution_date,
    });

    if (!result.success) {
      res.status(422).json({
        error: 'TRANSFER_FAILED',
        message: result.error || 'Transfer validation failed',
        violations: result.violations,
      });
      return;
    }

    res.status(201).json(result.transfer);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /transfers?assetId=X
 * Get transfer history for an asset
 */
router.get('/', async (req, res): Promise<void> => {
  try {
    const { assetId } = req.query;

    if (!assetId) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Required query parameter: assetId',
      });
      return;
    }

    const transfers = await findTransfersByAsset(assetId as string);
    res.json(transfers);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /transfers/history/:assetId
 * Get detailed transfer history with investor names
 */
router.get('/history/:assetId', async (req, res) => {
  try {
    const history = await getTransferHistory(req.params.assetId);
    res.json(history);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;