import { Router, Request, Response } from 'express';
import { checkEligibility } from '../services/eligibility-service.js';

const router = Router();

/**
 * POST /api/eligibility/check
 *
 * Check whether an investor is eligible to invest in a fund structure.
 * Returns detailed check results with regulatory citations and
 * writes an immutable decision record for audit trail.
 *
 * Body:
 *   investor_id: string (required)
 *   fund_structure_id: string (required)
 *   investment_amount?: number (in cents, optional — needed for minimum investment check)
 *
 * Response:
 *   eligible: boolean
 *   investor_type: string
 *   fund_legal_form: string
 *   jurisdiction: string
 *   checks: Array<{ rule, passed, message }>
 *   criteria_applied: EligibilityCriteria | null
 *   decision_record_id: string
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { investor_id, fund_structure_id, investment_amount } = req.body;

    if (!investor_id || !fund_structure_id) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'investor_id and fund_structure_id are required',
      });
    }

    const result = await checkEligibility({
      investor_id,
      fund_structure_id,
      investment_amount: investment_amount ? Number(investment_amount) : undefined,
    });

    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('not found')) {
      return res.status(404).json({ error: 'NOT_FOUND', message });
    }
    console.error('Eligibility check error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message });
  }
});

export default router;
