import { Router } from 'express';
import { checkEligibility } from '../services/eligibility-service.js';
import { createEligibilityCriteria } from '../repositories/eligibility-criteria-repository.js';
const router = Router();
/**
 * POST /api/eligibility/criteria
 *
 * Create a new eligibility criteria record for a fund structure.
 */
router.post('/criteria', async (req, res) => {
    try {
        const { fund_structure_id, investor_type, jurisdiction, minimum_investment, suitability_required, source_reference, effective_date, maximum_allocation_pct, documentation_required } = req.body;
        if (!fund_structure_id || !investor_type || !jurisdiction) {
            res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'fund_structure_id, investor_type, and jurisdiction are required',
            });
            return;
        }
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Create eligibility criteria error:', err);
        res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
});
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
router.post('/check', async (req, res) => {
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message.includes('not found')) {
            return res.status(404).json({ error: 'NOT_FOUND', message });
        }
        console.error('Eligibility check error:', err);
        return res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
});
export default router;
//# sourceMappingURL=eligibility-routes.js.map