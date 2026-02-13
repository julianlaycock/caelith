import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields } from '../middleware/validate.js';
import { checkEligibility } from '../services/eligibility-service.js';
import { createEligibilityCriteria } from '../repositories/eligibility-criteria-repository.js';

const router = Router();

router.post('/criteria', asyncHandler(async (req, res) => {
  requireFields(req.body, ['fund_structure_id', 'investor_type', 'jurisdiction']);
  const { fund_structure_id, investor_type, jurisdiction, minimum_investment,
          suitability_required, source_reference, effective_date,
          maximum_allocation_pct, documentation_required } = req.body;

  const criteria = await createEligibilityCriteria({
    fund_structure_id,
    investor_type,
    jurisdiction,
    minimum_investment: minimum_investment ?? 0,
    suitability_required,
    source_reference,
    effective_date: effective_date ?? new Date().toISOString().slice(0, 10),
    maximum_allocation_pct,
    documentation_required,
  });

  res.status(201).json(criteria);
}));

router.post('/check', asyncHandler(async (req, res) => {
  requireFields(req.body, ['investor_id', 'fund_structure_id']);
  const { investor_id, fund_structure_id, investment_amount } = req.body;

  const result = await checkEligibility({
    investor_id,
    fund_structure_id,
    investment_amount: investment_amount ? Number(investment_amount) : undefined,
  });

  res.json(result);
}));

export default router;
