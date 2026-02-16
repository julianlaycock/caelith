import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields, requireFound } from '../middleware/validate.js';
import { ValidationError } from '../errors.js';
import type { CreateInvestorInput, UpdateInvestorInput, InvestorType, KycStatus } from '../models/index.js';
import {
  createInvestor,
  getInvestor,
  getAllInvestors,
  updateInvestor,
} from '../services/index.js';

const router = express.Router();

const VALID_INVESTOR_TYPES: InvestorType[] = [
  'institutional',
  'professional',
  'semi_professional',
  'well_informed',
  'retail',
];

const VALID_KYC_STATUSES: KycStatus[] = ['pending', 'verified', 'expired', 'rejected'];

function parseInvestorType(value: unknown): InvestorType | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !VALID_INVESTOR_TYPES.includes(value as InvestorType)) {
    throw new ValidationError('Invalid investor_type');
  }
  return value as InvestorType;
}

function parseKycStatus(value: unknown): KycStatus | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !VALID_KYC_STATUSES.includes(value as KycStatus)) {
    throw new ValidationError('Invalid kyc_status');
  }
  return value as KycStatus;
}

router.post('/', asyncHandler(async (req, res): Promise<void> => {
  const { name, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry, tax_id, lei, email } = req.body;
  requireFields(req.body, ['name', 'jurisdiction', 'accredited']);

  const input: CreateInvestorInput = {
    name,
    jurisdiction,
    accredited: Boolean(accredited),
    investor_type: parseInvestorType(investor_type),
    kyc_status: parseKycStatus(kyc_status),
    kyc_expiry: kyc_expiry ?? undefined,
    tax_id: tax_id ?? undefined,
    lei: lei ?? undefined,
    email: email ?? undefined,
  };

  const investor = await createInvestor(input);
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
  const { name, jurisdiction, accredited, investor_type, kyc_status, kyc_expiry, tax_id, lei, email } = req.body;

  const updateData: UpdateInvestorInput = {};

  if (name !== undefined) updateData.name = name;
  if (jurisdiction !== undefined) updateData.jurisdiction = jurisdiction;
  if (accredited !== undefined) updateData.accredited = Boolean(accredited);
  if (investor_type !== undefined) updateData.investor_type = parseInvestorType(investor_type);
  if (kyc_status !== undefined) updateData.kyc_status = parseKycStatus(kyc_status);
  if (kyc_expiry !== undefined) updateData.kyc_expiry = kyc_expiry || null;
  if (tax_id !== undefined) updateData.tax_id = tax_id || null;
  if (lei !== undefined) updateData.lei = lei || null;
  if (email !== undefined) updateData.email = email || null;

  const investor = await updateInvestor(req.params.id, updateData);
  requireFound(investor, 'Investor', req.params.id);
  res.json(investor);
}));

export default router;
