import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { getDelegationsByFund, createDelegation, updateDelegation, deleteDelegation } from '../services/delegation-service.js';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { fundId } = req.params;
  const delegations = await getDelegationsByFund(fundId);
  res.json(delegations);
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { fundId } = req.params;
  const delegation = await createDelegation(fundId, req.body);
  res.status(201).json(delegation);
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const delegation = await updateDelegation(req.params.id, req.body);
  if (!delegation) { res.status(404).json({ error: 'Delegation not found' }); return; }
  res.json(delegation);
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const ok = await deleteDelegation(req.params.id);
  if (!ok) { res.status(404).json({ error: 'Delegation not found' }); return; }
  res.json({ success: true });
}));

export default router;
