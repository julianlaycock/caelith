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
        error: 'Bad Request',
        message: 'investor_id and fund_structure_id are required',
      });
    }

    const result = await checkEligibility({
      investor_id,
      fund_structure_id,
      investment_amount: investment_amount ? Number(investment_amount) : undefined,
    });

    const status = result.eligible ? 200 : 200; // Always 200 — rejection is a valid business result
    return res.status(status).json(result);
  } catch (err: any) {
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: 'Not Found', message: err.message });
    }
    console.error('Eligibility check error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

export default router;
