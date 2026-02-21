import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { getLmtsByFund, createLmt, updateLmt, deleteLmt, activateLmt, deactivateLmt } from '../services/lmt-service.js';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { fundId } = req.params;
  const lmts = await getLmtsByFund(fundId);
  res.json(lmts);
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { fundId } = req.params;
  const lmt = await createLmt(fundId, req.body);
  res.status(201).json(lmt);
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const lmt = await updateLmt(req.params.id, req.body);
  if (!lmt) { res.status(404).json({ error: 'LMT not found' }); return; }
  res.json(lmt);
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const ok = await deleteLmt(req.params.id);
  if (!ok) { res.status(404).json({ error: 'LMT not found' }); return; }
  res.json({ success: true });
}));

router.post('/:id/activate', asyncHandler(async (req: Request, res: Response) => {
  const lmt = await activateLmt(req.params.id);
  if (!lmt) { res.status(404).json({ error: 'LMT not found' }); return; }
  res.json(lmt);
}));

router.post('/:id/deactivate', asyncHandler(async (req: Request, res: Response) => {
  const lmt = await deactivateLmt(req.params.id);
  if (!lmt) { res.status(404).json({ error: 'LMT not found' }); return; }
  res.json(lmt);
}));

export default router;
