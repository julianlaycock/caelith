import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields } from '../middleware/validate.js';
import { BusinessLogicError } from '../errors.js';
import {
  simulateTransfer,
  executeTransfer,
} from '../services/index.js';
import {
  findAllTransfers,
  findTransfersByAsset,
  getTransferHistory,
} from '../repositories/index.js';

const router = express.Router();

router.post('/simulate', asyncHandler(async (req, res): Promise<void> => {
  const { asset_id, from_investor_id, to_investor_id, units, execution_date } = req.body;
  requireFields(req.body, ['asset_id', 'from_investor_id', 'to_investor_id', 'units', 'execution_date']);

  const result = await simulateTransfer({
    asset_id,
    from_investor_id,
    to_investor_id,
    units: Number(units),
    execution_date,
  });

  res.json(result);
}));

router.post('/', asyncHandler(async (req, res): Promise<void> => {
  const { asset_id, from_investor_id, to_investor_id, units, execution_date } = req.body;
  requireFields(req.body, ['asset_id', 'from_investor_id', 'to_investor_id', 'units', 'execution_date']);

  const result = await executeTransfer({
    asset_id,
    from_investor_id,
    to_investor_id,
    units: Number(units),
    execution_date,
  });

  if (!result.success) {
    throw new BusinessLogicError(result.error || 'Transfer validation failed');
  }

  res.status(201).json(result.transfer);
}));

router.get('/', asyncHandler(async (req, res): Promise<void> => {
  const { assetId } = req.query;
  if (!assetId) {
    const all = await findAllTransfers();
    res.json(all);
    return;
  }
  const transfers = await findTransfersByAsset(assetId as string);
  res.json(transfers);
}));

router.get('/history/:assetId', asyncHandler(async (req, res) => {
  const history = await getTransferHistory(req.params.assetId);
  res.json(history);
}));

export default router;
