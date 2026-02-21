/**
 * AIFMD II Readiness Assessment Routes
 */

import { Router, Request, Response } from 'express';
import { getReadinessAssessment, saveReadinessAnswer, getReadinessScore } from '../services/readiness-service.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { DEFAULT_TENANT_ID } from '../db.js';

const router = Router();

// GET /api/readiness — full assessment (questions + answers + score)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = DEFAULT_TENANT_ID;
  const result = await getReadinessAssessment(tenantId);
  res.json(result);
}));

// GET /api/readiness/score — score only (for dashboard card)
router.get('/score', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = DEFAULT_TENANT_ID;
  const score = await getReadinessScore(tenantId);
  res.json(score);
}));

// PUT /api/readiness/:questionKey — save/update one answer
router.put('/:questionKey', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = DEFAULT_TENANT_ID;
  const { questionKey } = req.params;
  const { status, notes } = req.body;

  if (!['yes', 'no', 'partial', 'na'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: yes, no, partial, na' });
  }

  await saveReadinessAnswer(tenantId, questionKey, { status, notes }, (req as any).userId);
  const result = await getReadinessAssessment(tenantId);
  res.json(result);
}));

export default router;
