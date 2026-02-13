import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields, requireFound } from '../middleware/validate.js';
import {
  createInvestor,
  getInvestor,
  getAllInvestors,
  updateInvestor,
} from '../services/index.js';

const router = express.Router();

router.post('/', asyncHandler(async (req, res): Promise<void> => {
  const { name, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry, tax_id, lei, email } = req.body;
  requireFields(req.body, ['name', 'jurisdiction', 'accredited']);

  const investor = await createInvestor({ name, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry, tax_id, lei, email });
  res.status(201).json(investor);
}));

router.get('/', asyncHandler(async (_req, res) => {
  const investors = await getAllInvestors();
  res.json(investors);
}));

router.get('/:id', asyncHandler(async (req, res): Promise<void> => {
  const investor = await getInvestor(req.params.id);
  requireFound(investor, 'Investor', req.params.id);
  res.json(investor);
}));

router.patch('/:id', asyncHandler(async (req, res): Promise<void> => {
  const { name, jurisdiction, accredited } = req.body;

  const updateData: {
    name?: string;
    jurisdiction?: string;
    accredited?: boolean;
  } = {};

  if (name !== undefined) updateData.name = name;
  if (jurisdiction !== undefined) updateData.jurisdiction = jurisdiction;
  if (accredited !== undefined) updateData.accredited = Boolean(accredited);

  const investor = await updateInvestor(req.params.id, updateData);
  requireFound(investor, 'Investor', req.params.id);
  res.json(investor);
}));

export default router;
