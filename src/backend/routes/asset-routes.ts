/**
 * Asset Routes
 * 
 * Endpoints for asset management
 */

import express from 'express';
import {
  createAsset,
  getAsset,
  getAllAssets,
  getAssetUtilization,
} from '../services/index.js';

const router = express.Router();

/**
 * POST /assets
 * Create a new asset
 */
router.post('/', async (req, res): Promise<void> => {
  try {
    const { name, asset_type, total_units, fund_structure_id, unit_price } = req.body;

    // Validate request body
    if (!name || !asset_type || !total_units) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: name, asset_type, total_units',
      });
      return;
    }

    const asset = await createAsset({
      name,
      asset_type,
      total_units: Number(total_units),
      fund_structure_id, 
      unit_price
    });

    res.status(201).json(asset);
  } catch (error) {
    res.status(422).json({
      error: 'BUSINESS_LOGIC_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /assets
 * Get all assets
 */
router.get('/', async (req, res) => {
  try {
    const assets = await getAllAssets();
    res.json(assets);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /assets/:id
 * Get asset by ID
 */
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const asset = await getAsset(req.params.id);

    if (!asset) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: `Asset not found: ${req.params.id}`,
      });
      return;
    }

    res.json(asset);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /assets/:id/utilization
 * Get asset utilization stats
 */
router.get('/:id/utilization', async (req, res): Promise<void> => {
  try {
    const utilization = await getAssetUtilization(req.params.id);

    if (!utilization) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: `Asset not found: ${req.params.id}`,
      });
      return;
    }

    res.json(utilization);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;