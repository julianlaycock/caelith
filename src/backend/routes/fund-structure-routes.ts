import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields, requireFound } from '../middleware/validate.js';
import { BusinessLogicError } from '../errors.js';
import {
  createFundStructure,
  findFundStructureById,
  findAllFundStructures,
  updateFundStructure,
} from '../repositories/fund-structure-repository.js';
import { query, execute } from '../db.js';

const router = Router();

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['name', 'legal_form', 'domicile', 'regulatory_framework']);
  const fund = await createFundStructure(req.body);
  res.status(201).json(fund);
}));

router.get('/', asyncHandler(async (_req, res) => {
  const funds = await findAllFundStructures();
  res.json(funds);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const fund = await findFundStructureById(req.params.id);
  requireFound(fund, 'Fund structure', req.params.id);
  res.json(fund);
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const fund = await updateFundStructure(req.params.id, req.body);
  requireFound(fund, 'Fund structure', req.params.id);
  res.json(fund);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  // Check for linked assets
  const assets = await query<{ count: number }>(
    'SELECT COUNT(*)::int as count FROM assets WHERE fund_structure_id = ?',
    [req.params.id]
  );
  if (assets.length > 0 && assets[0].count > 0) {
    throw new BusinessLogicError(
      `Cannot delete: this fund structure has ${assets[0].count} linked asset(s). Remove or reassign them first.`
    );
  }

  // Delete eligibility criteria (configuration, not audit data)
  await execute('DELETE FROM eligibility_criteria WHERE fund_structure_id = ?', [req.params.id]);

  // Delete the fund structure
  const result = await query<{ id: string }>(
    'DELETE FROM fund_structures WHERE id = ? RETURNING id',
    [req.params.id]
  );
  requireFound(result[0], 'Fund structure', req.params.id);

  res.json({ deleted: true, id: result[0].id });
}));

export default router;
