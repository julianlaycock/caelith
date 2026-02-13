import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields, requireFound } from '../middleware/validate.js';
import {
  createOrUpdateRuleSet,
  getRuleSetForAsset,
  getRuleVersions,
} from '../services/index.js';

const router = express.Router();

router.post('/', asyncHandler(async (req, res): Promise<void> => {
  const {
    asset_id,
    qualification_required,
    lockup_days,
    jurisdiction_whitelist,
    transfer_whitelist,
  } = req.body;

  requireFields(req.body, ['asset_id', 'qualification_required', 'lockup_days', 'jurisdiction_whitelist']);

  const ruleSet = await createOrUpdateRuleSet({
    asset_id,
    qualification_required: Boolean(qualification_required),
    lockup_days: Number(lockup_days),
    jurisdiction_whitelist: Array.isArray(jurisdiction_whitelist) ? jurisdiction_whitelist : [],
    transfer_whitelist: transfer_whitelist === null ? null : (Array.isArray(transfer_whitelist) ? transfer_whitelist : []),
  }, req.user?.userId);

  res.status(201).json(ruleSet);
}));

router.get('/:assetId', asyncHandler(async (req, res): Promise<void> => {
  const ruleSet = await getRuleSetForAsset(req.params.assetId);
  requireFound(ruleSet, 'Rules', req.params.assetId);
  res.json(ruleSet);
}));

router.get('/:assetId/versions', asyncHandler(async (req, res): Promise<void> => {
  const versions = await getRuleVersions(req.params.assetId);
  res.json(versions);
}));

export default router;
