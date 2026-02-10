/**
 * Onboarding Routes — Slice 5
 *
 * POST   /api/onboarding                     — Apply (investor submits application)
 * POST   /api/onboarding/:id/check-eligibility — Run automated eligibility check
 * POST   /api/onboarding/:id/review          — Approve/reject (compliance officer)
 * POST   /api/onboarding/:id/allocate        — Allocate units (after approval)
 * GET    /api/onboarding/:id                  — Get onboarding record
 * GET    /api/onboarding?asset_id=X           — List by asset
 * GET    /api/onboarding?investor_id=X        — List by investor
 */

import { Router, Request, Response } from 'express';
import {
  applyToFund,
  checkEligibility,
  reviewApplication,
  allocateUnits,
  findOnboardingById,
  findOnboardingByAsset,
  findOnboardingByInvestor,
} from '../services/onboarding-service.js';

const router = Router();

// ── POST /api/onboarding — Apply ────────────────────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { investor_id, asset_id, requested_units } = req.body;

    if (!investor_id || !asset_id || !requested_units) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: investor_id, asset_id, requested_units',
      });
      return;
    }

    const result = await applyToFund(investor_id, asset_id, requested_units);

    if (!result.success) {
      res.status(400).json({ error: 'APPLICATION_ERROR', message: result.error });
      return;
    }

    res.status(201).json(result.onboarding);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to create application' });
  }
});

// ── POST /api/onboarding/:id/check-eligibility ─────────────

router.post('/:id/check-eligibility', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await checkEligibility(req.params.id);

    if (!result.success) {
      res.status(400).json({ error: 'ELIGIBILITY_ERROR', message: result.error });
      return;
    }

    res.status(200).json({
      onboarding: result.onboarding,
      eligible: result.eligible,
      checks: result.checks,
      decision_record_id: result.decision_record_id,
    });
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to check eligibility' });
  }
});

// ── POST /api/onboarding/:id/review ─────────────────────────

router.post('/:id/review', async (req: Request, res: Response): Promise<void> => {
  try {
    const { decision, rejection_reasons } = req.body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing or invalid "decision" (must be "approved" or "rejected")',
      });
      return;
    }

    // Get reviewer from auth token
    const reviewedBy = (req as any).user?.userId;
    if (!reviewedBy) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Cannot determine reviewer identity' });
      return;
    }

    const result = await reviewApplication(
      req.params.id,
      decision,
      reviewedBy,
      rejection_reasons
    );

    if (!result.success) {
      res.status(400).json({ error: 'REVIEW_ERROR', message: result.error });
      return;
    }

    res.status(200).json({
      onboarding: result.onboarding,
      decision_record_id: result.decision_record_id,
    });
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to review application' });
  }
});

// ── POST /api/onboarding/:id/allocate ───────────────────────

router.post('/:id/allocate', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await allocateUnits(req.params.id);

    if (!result.success) {
      res.status(400).json({ error: 'ALLOCATION_ERROR', message: result.error });
      return;
    }

    res.status(200).json(result.onboarding);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to allocate units' });
  }
});

// ── GET /api/onboarding/:id ─────────────────────────────────

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const record = await findOnboardingById(req.params.id);

    if (!record) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Onboarding record not found' });
      return;
    }

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch onboarding record' });
  }
});

// ── GET /api/onboarding?asset_id=X&investor_id=Y ───────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
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

    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Provide asset_id or investor_id query parameter',
    });
  } catch (error) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch onboarding records' });
  }
});

export default router;