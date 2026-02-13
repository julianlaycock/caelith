import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields } from '../middleware/validate.js';
import { ValidationError } from '../errors.js';
import {
  allocateHolding,
  getHoldingsForAsset,
  getHoldingsForInvestor,
  getCapTable,
} from '../services/index.js';
import { generateCapTablePdf } from '../services/cap-table-pdf.js';

const router = express.Router();

router.post('/', asyncHandler(async (req, res): Promise<void> => {
  const { investor_id, asset_id, units, acquired_at } = req.body;
  requireFields(req.body, ['investor_id', 'asset_id', 'units', 'acquired_at']);

  const holding = await allocateHolding({
    investor_id,
    asset_id,
    units: Number(units),
    acquired_at,
  });

  res.status(201).json(holding);
}));

router.get('/', asyncHandler(async (req, res): Promise<void> => {
  const { assetId, investorId } = req.query;

  if (assetId) {
    const holdings = await getHoldingsForAsset(assetId as string);
    res.json(holdings);
    return;
  }

  if (investorId) {
    const holdings = await getHoldingsForInvestor(investorId as string);
    res.json(holdings);
    return;
  }

  throw new ValidationError('Required query parameter: assetId or investorId');
}));

router.get('/cap-table/:assetId/pdf', asyncHandler(async (req, res): Promise<void> => {
  const pdf = await generateCapTablePdf(req.params.assetId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="cap-table-${req.params.assetId.substring(0, 8)}.pdf"`);
  res.send(pdf);
}));

router.get('/cap-table/:assetId', asyncHandler(async (_req, res) => {
  const capTable = await getCapTable(_req.params.assetId);
  res.json(capTable);
}));

export default router;
