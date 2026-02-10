/**
 * Investor Routes
 * 
 * Endpoints for investor management
 */

import express from 'express';
import {
  createInvestor,
  getInvestor,
  getAllInvestors,
  updateInvestor,
} from '../services/index.js';

const router = express.Router();

/**
 * POST /investors
 * Create a new investor
 */
router.post('/', async (req, res): Promise<void> => {
  try {
    const { name, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry, tax_id, lei, email } = req.body;

    // Validate request body
    if (!name || !jurisdiction || accredited === undefined) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: name, jurisdiction, accredited',
      });
      return;
    }

    const investor = await createInvestor({ name, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry, tax_id, lei, email });

    res.status(201).json(investor);
  } catch (error) {
    res.status(422).json({
      error: 'BUSINESS_LOGIC_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /investors
 * Get all investors
 */
router.get('/', async (req, res) => {
  try {
    const investors = await getAllInvestors();
    res.json(investors);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /investors/:id
 * Get investor by ID
 */
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const investor = await getInvestor(req.params.id);

    if (!investor) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: `Investor not found: ${req.params.id}`,
      });
      return;
    }

    res.json(investor);
  } catch (error) {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /investors/:id
 * Update investor
 */
router.patch('/:id', async (req, res): Promise<void> => {
  try {
    const { name, jurisdiction, accredited } = req.body;

    const updateData: {
      name?: string;
      jurisdiction?: string;
      accredited?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (jurisdiction !== undefined) updateData.jurisdiction = jurisdiction;
    if (accredited !== undefined) updateData.accredited = Boolean(accredited);

    const investor = await updateInvestor(req.params.id, updateData);

    if (!investor) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: `Investor not found: ${req.params.id}`,
      });
      return;
    }

    res.json(investor);
  } catch (error) {
    res.status(422).json({
      error: 'BUSINESS_LOGIC_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;