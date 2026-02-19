/**
 * Evidence Bundle Routes — Audit Evidence Package Download
 */

import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { generateEvidenceBundle } from '../services/evidence-bundle-service.js';

const router = express.Router();

/** GET /api/reports/evidence-bundle/:fundStructureId — Download evidence bundle JSON */
router.get('/:fundStructureId', asyncHandler(async (req, res) => {
  const { fundStructureId } = req.params;
  const startDate = req.query.start as string | undefined;
  const endDate = req.query.end as string | undefined;

  const bundle = await generateEvidenceBundle({
    fundStructureId,
    startDate,
    endDate,
  });

  const filename = `evidence-bundle-${fundStructureId.substring(0, 8)}-${bundle.reporting_period.end}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(bundle);
}));

export default router;
