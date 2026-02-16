import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields, requireFound } from '../middleware/validate.js';
import { ValidationError, UnauthorizedError } from '../errors.js';
import {
  applyToFund,
  checkEligibility,
  reviewApplication,
  allocateUnits,
  updateHandoffDetails,
  findOnboardingById,
  findOnboardingByAsset,
  findOnboardingByInvestor,
} from '../services/onboarding-service.js';

const router = Router();

router.post('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  requireFields(req.body, ['investor_id', 'asset_id', 'requested_units']);
  const { investor_id, asset_id, requested_units, owner_tag, handoff_notes } = req.body;

  const onboarding = await applyToFund(investor_id, asset_id, requested_units, owner_tag, handoff_notes);

  res.status(201).json(onboarding);
}));

router.patch('/:id/handoff', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const ownerTag = typeof req.body.owner_tag === 'string' ? req.body.owner_tag : null;
  const handoffNotes = typeof req.body.handoff_notes === 'string' ? req.body.handoff_notes : null;
  const updated = await updateHandoffDetails(req.params.id, ownerTag, handoffNotes);
  res.status(200).json(updated);
}));

router.post('/:id/check-eligibility', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await checkEligibility(req.params.id);

  res.status(200).json({
    onboarding: result.onboarding,
    eligible: result.eligible,
    checks: result.checks,
    decision_record_id: result.decision_record_id,
  });
}));

router.post('/:id/review', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { decision, rejection_reasons } = req.body;

  if (!decision || !['approved', 'rejected'].includes(decision)) {
    throw new ValidationError('Missing or invalid "decision" (must be "approved" or "rejected")');
  }

  const reviewedBy = req.user?.userId;
  if (!reviewedBy) {
    throw new UnauthorizedError('Cannot determine reviewer identity');
  }

  const result = await reviewApplication(
    req.params.id,
    decision,
    reviewedBy,
    rejection_reasons
  );

  res.status(200).json({
    onboarding: result.onboarding,
    decision_record_id: result.decision_record_id,
  });
}));

router.post('/:id/allocate', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const onboarding = await allocateUnits(req.params.id);

  res.status(200).json(onboarding);
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const record = await findOnboardingById(req.params.id);
  requireFound(record, 'Onboarding record', req.params.id);
  res.status(200).json(record);
}));

router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { asset_id, investor_id } = req.query;

  if (asset_id && typeof asset_id === 'string') {
    const records = await findOnboardingByAsset(asset_id);
    res.status(200).json(records);
    return;
  }

  if (investor_id && typeof investor_id === 'string') {
    const records = await findOnboardingByInvestor(investor_id);
    res.status(200).json(records);
    return;
  }

  throw new ValidationError('Provide asset_id or investor_id query parameter');
}));

export default router;
