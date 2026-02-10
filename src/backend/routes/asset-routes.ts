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
  deleteAsset,
  updateAsset,
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

/**
 * DELETE /assets/:id
 * Delete an asset (fails if holdings exist)
 */
router.delete('/:id', async (req, res): Promise<void> => {
  try {
    await deleteAsset(req.params.id);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Cannot delete asset with existing holdings') {
      res.status(409).json({
        error: 'CONFLICT',
        message,
      });
      return;
    }

    if (message.startsWith('Asset not found')) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message,
      });
      return;
    }

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message,
    });
  }
});

/**
 * PATCH /assets/:id
 * Update an asset (partial update)
 */
router.patch('/:id', async (req, res): Promise<void> => {
  try {
    const { name, asset_type, total_units } = req.body;

    const updated = await updateAsset(req.params.id, {
      name,
      asset_type,
      total_units: total_units !== undefined ? Number(total_units) : undefined,
    });

    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.startsWith('Asset not found')) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message,
      });
      return;
    }

    res.status(422).json({
      error: 'BUSINESS_LOGIC_ERROR',
      message,
    });
  }
});

export default router;