import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields } from '../middleware/validate.js';
import { BusinessLogicError } from '../errors.js';
import { authorize } from '../middleware/auth.js';
import {
  simulateTransfer,
  executeTransfer,
  getPendingTransfers,
  approveTransfer,
  rejectTransfer,
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

  if (result.transfer?.status === 'pending_approval') {
    res.status(202).json(result.transfer);
    return;
  }

  res.status(201).json(result.transfer);
}));

router.get('/pending', authorize('admin', 'compliance_officer'), asyncHandler(async (req, res): Promise<void> => {
  const tenantId = req.user?.tenantId || '';
  const pending = await getPendingTransfers(tenantId);
  res.json(pending);
}));

router.post('/:id/approve', authorize('admin', 'compliance_officer'), asyncHandler(async (req, res): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new BusinessLogicError('Reviewer identity unavailable');
  }
  const tenantId = req.user?.tenantId || '';
  const transfer = await approveTransfer(req.params.id, userId, tenantId);
  res.status(200).json(transfer);
}));

router.post('/:id/reject', authorize('admin', 'compliance_officer'), asyncHandler(async (req, res): Promise<void> => {
  requireFields(req.body, ['reason']);
  const userId = req.user?.userId;
  if (!userId) {
    throw new BusinessLogicError('Reviewer identity unavailable');
  }
  const tenantId = req.user?.tenantId || '';
  const transfer = await rejectTransfer(req.params.id, String(req.body.reason), userId, tenantId);
  res.status(200).json(transfer);
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

router.get('/history', asyncHandler(async (req, res): Promise<void> => {
  const assetId = typeof req.query.assetId === 'string' ? req.query.assetId : undefined;
  const history = await getTransferHistory(assetId);
  res.json(history);
}));

router.get('/history/:assetId', asyncHandler(async (req, res) => {
  const history = await getTransferHistory(req.params.assetId);
  res.json(history);
}));

export default router;
