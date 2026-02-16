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
    investor_type_whitelist,
    minimum_investment,
    maximum_investors,
    concentration_limit_pct,
    kyc_required,
  } = req.body;

  requireFields(req.body, ['asset_id', 'qualification_required', 'lockup_days', 'jurisdiction_whitelist']);

  const ruleSet = await createOrUpdateRuleSet({
    asset_id,
    qualification_required: Boolean(qualification_required),
    lockup_days: Number(lockup_days),
    jurisdiction_whitelist: Array.isArray(jurisdiction_whitelist) ? jurisdiction_whitelist : [],
    transfer_whitelist: transfer_whitelist === null ? null : (Array.isArray(transfer_whitelist) ? transfer_whitelist : []),
    investor_type_whitelist: investor_type_whitelist === null || investor_type_whitelist === undefined ? undefined : (Array.isArray(investor_type_whitelist) ? investor_type_whitelist : []),
    minimum_investment: minimum_investment != null ? Number(minimum_investment) : undefined,
    maximum_investors: maximum_investors != null ? Number(maximum_investors) : undefined,
    concentration_limit_pct: concentration_limit_pct != null ? Number(concentration_limit_pct) : undefined,
    kyc_required: kyc_required != null ? Boolean(kyc_required) : undefined,
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
