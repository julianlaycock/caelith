import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { analyzeScenarioImpact } from '../services/scenario-service.js';

const router = Router();

router.post('/impact', asyncHandler(async (req, res) => {
  const result = await analyzeScenarioImpact(req.body);
  res.json(result);
}));

export default router;
