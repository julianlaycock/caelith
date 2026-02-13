import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields } from '../middleware/validate.js';
import { ValidationError, AppError } from '../errors.js';
import { compileNaturalLanguageRule, NLRuleRequest } from '../services/nl-rule-compiler.js';

const router = Router();

router.post('/from-natural-language', asyncHandler(async (req, res) => {
  requireFields(req.body, ['description', 'asset_id']);
  const { description, asset_id, context } = req.body;

  if (typeof description !== 'string') {
    throw new ValidationError('Invalid "description" (must be a non-empty string)');
  }

  if (typeof asset_id !== 'string') {
    throw new ValidationError('Invalid "asset_id" (must be a non-empty string)');
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AppError(
      'AI rule compiler is not configured. Set ANTHROPIC_API_KEY.',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  const request: NLRuleRequest = { description, asset_id, context };
  const result = await compileNaturalLanguageRule(request);

  res.status(200).json(result);
}));

export default router;
