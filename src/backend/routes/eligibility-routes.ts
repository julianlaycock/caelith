import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields } from '../middleware/validate.js';
import { checkEligibility } from '../services/eligibility-service.js';
import { createEligibilityCriteria, findCriteriaById, supersedeCriteria } from '../repositories/eligibility-criteria-repository.js';

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

router.put('/criteria/:id/supersede', asyncHandler(async (req, res) => {
  const oldId = req.params.id;
  const oldCriteria = await findCriteriaById(oldId);
  if (!oldCriteria) {
    res.status(404).json({ error: 'NOT_FOUND', message: `Eligibility criteria not found: ${oldId}` });
    return;
  }

  // Supersede the old record
  await supersedeCriteria(oldId);

  // Create new criteria with overrides from req.body, keeping old values as defaults
  const newCriteria = await createEligibilityCriteria({
    fund_structure_id: req.body.fund_structure_id ?? oldCriteria.fund_structure_id,
    investor_type: req.body.investor_type ?? oldCriteria.investor_type,
    jurisdiction: req.body.jurisdiction ?? oldCriteria.jurisdiction,
    minimum_investment: req.body.minimum_investment ?? oldCriteria.minimum_investment,
    suitability_required: req.body.suitability_required ?? oldCriteria.suitability_required,
    source_reference: req.body.source_reference ?? oldCriteria.source_reference,
    effective_date: req.body.effective_date ?? new Date().toISOString().slice(0, 10),
    maximum_allocation_pct: req.body.maximum_allocation_pct ?? oldCriteria.maximum_allocation_pct,
    documentation_required: req.body.documentation_required ?? oldCriteria.documentation_required,
  });

  res.json(newCriteria);
}));

export default router;
