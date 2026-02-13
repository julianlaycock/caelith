import express from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields } from '../middleware/validate.js';
import { ValidationError } from '../errors.js';
import {
  createCompositeRule,
  listCompositeRules,
  updateCompositeRule,
  deleteCompositeRule,
} from '../services/composite-rules-service.js';

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['asset_id', 'name', 'operator', 'conditions']);
  const { asset_id, name, description, operator, conditions, enabled } = req.body;

  if (!['AND', 'OR', 'NOT'].includes(operator)) {
    throw new ValidationError('Operator must be AND, OR, or NOT');
  }

  if (!Array.isArray(conditions) || conditions.length === 0) {
    throw new ValidationError('Conditions must be a non-empty array');
  }

  const rule = await createCompositeRule(
    asset_id,
    { name, description: description || '', operator, conditions, enabled },
    req.user?.userId
  );
  res.status(201).json(rule);
}));

router.get('/', asyncHandler(async (req, res) => {
  const { assetId } = req.query;
  if (!assetId) {
    throw new ValidationError('Required query parameter: assetId');
  }

  const rules = await listCompositeRules(assetId as string);
  res.json(rules);
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { name, description, operator, conditions, enabled } = req.body;
  await updateCompositeRule(req.params.id, {
    name,
    description,
    operator,
    conditions,
    enabled,
  });
  res.json({ status: 'updated' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await deleteCompositeRule(req.params.id);
  res.json({ status: 'deleted' });
}));

export default router;
