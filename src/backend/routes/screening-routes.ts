import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { DEFAULT_TENANT_ID } from '../db.js';
import { screenInvestor, bulkScreenInvestors } from '../services/screening-service.js';

export function createScreeningRoutes(): Router {
  const router = Router();

  // POST /api/screening/:investorId — screen single investor
  router.post('/:investorId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const result = await screenInvestor(req.params.investorId, tenantId);
    res.json(result);
  }));

  // POST /api/screening/bulk — screen all investors (optionally for a fund)
  router.post('/bulk/run', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT_ID;
    const { fundStructureId } = req.body as { fundStructureId?: string };
    const result = await bulkScreenInvestors(tenantId, fundStructureId);
    res.json(result);
  }));

  return router;
}
