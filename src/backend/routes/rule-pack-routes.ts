/**
 * Rule Pack Routes — Pre-configured AIFMD II Regulatory Rule Packs
 */

import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { getAvailableRulePacks, applyRulePack } from '../services/rule-pack-service.js';
import { requireFields } from '../middleware/validate.js';

const router = express.Router();

/** GET /api/rule-packs — List available rule packs */
router.get('/', asyncHandler(async (_req, res) => {
  const packs = getAvailableRulePacks();
  res.json(packs);
}));

/** POST /api/rule-packs/apply — Apply a rule pack to a fund structure */
router.post('/apply', asyncHandler(async (req, res) => {
  requireFields(req.body, ['fund_structure_id']);
  const { fund_structure_id, legal_form } = req.body;
  const result = await applyRulePack(fund_structure_id, legal_form);
  res.status(201).json(result);
}));

export default router;
