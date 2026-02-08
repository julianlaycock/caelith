/**
 * Rules Routes
 * 
 * Endpoints for rule set management
 */

import express from 'express';
import {
  createOrUpdateRuleSet,
  getRuleSetForAsset,
} from '../services/index.js';

const router = express.Router();

/**
 * POST /rules
 * Create or update rule set for an asset
 */
router.post('/', async (req, res): Promise<void> => {
  try {
    const {
      asset_id,
      qualification_required,
      lockup_days,
      jurisdiction_whitelist,
      transfer_whitelist,
    } = req.body;

    // Validate request body
    if (
      !asset_id ||
      qualification_required === undefined ||
      lockup_days === undefined ||
      !jurisdiction_whitelist
    ) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: asset_id, qualification_required, lockup_days, jurisdiction_whitelist',
      });
      return;
    }

    const ruleSet = await createOrUpdateRuleSet({
      asset_id,
      qualification_required: Boolean(qualification_required),
      lockup_days: Number(lockup_days),
      jurisdiction_whitelist: Array.isArray(jurisdiction_whitelist) ? jurisdiction_whitelist : [],
      transfer_whitelist: transfer_whitelist === null ? null : (Array.isArray(transfer_whitelist) ? transfer_whitelist : []),
    });

    res.status(201).json(ruleSet);
  } catch (error) {
    res.status(422).json({
      error: 'BUSINESS_LOGIC_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /rules/:assetId
 * Get rule set for an asset
 */
router.get('/:assetId', async (req, res): Promise<void> => {
  try {
    const ruleSet = await getRuleSetForAsset(req.params.assetId);

    if (!ruleSet) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: `No rules found for asset: ${req.params.assetId}`,
      });
      return;
    }

    res.json(ruleSet);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;