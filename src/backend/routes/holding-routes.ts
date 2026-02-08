/**
 * Holding Routes
 * 
 * Endpoints for holding/allocation management
 */

import express from 'express';
import {
  allocateHolding,
  getHoldingsForAsset,
  getHoldingsForInvestor,
  getCapTable,
} from '../services/index.js';

const router = express.Router();

/**
 * POST /holdings
 * Allocate units to an investor
 */
router.post('/', async (req, res): Promise<void> => {
  try {
    const { investor_id, asset_id, units, acquired_at } = req.body;

    // Validate request body
    if (!investor_id || !asset_id || !units || !acquired_at) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: investor_id, asset_id, units, acquired_at',
      });
      return;
    }

    const holding = await allocateHolding({
      investor_id,
      asset_id,
      units: Number(units),
      acquired_at,
    });

    res.status(201).json(holding);
  } catch (error) {
    res.status(422).json({
      error: 'BUSINESS_LOGIC_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /holdings?assetId=X
 * Get holdings for an asset (query param)
 */
router.get('/', async (req, res): Promise<void> => {
  try {
    const { assetId, investorId } = req.query;

    if (assetId) {
      const holdings = await getHoldingsForAsset(assetId as string);
      res.json(holdings);
      return;
    }

    if (investorId) {
      const holdings = await getHoldingsForInvestor(investorId as string);
      res.json(holdings);
      return;
    }

    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Required query parameter: assetId or investorId',
    });
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /holdings/cap-table/:assetId
 * Get cap table for an asset
 */
router.get('/cap-table/:assetId', async (req, res) => {
  try {
    const capTable = await getCapTable(req.params.assetId);
    res.json(capTable);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;