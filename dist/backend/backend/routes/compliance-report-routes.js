/**
 * Compliance Report Routes — Slice 6
 *
 * GET /api/reports/compliance/:fundStructureId  — Full compliance status snapshot
 */
import { Router } from 'express';
import { generateComplianceReport } from '../services/compliance-report-service.js';
const router = Router();
/**
 * GET /api/reports/compliance/:fundStructureId
 *
 * Returns a comprehensive compliance status report for a fund:
 *   - Fund structure + assets summary
 *   - Eligibility criteria in force
 *   - Investor breakdown (type, jurisdiction, KYC status)
 *   - Onboarding pipeline
 *   - Recent decision records
 *   - Risk flags
 */
router.get('/compliance/:fundStructureId', async (req, res) => {
    try {
        const { fundStructureId } = req.params;
        if (!fundStructureId) {
            res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'Missing fundStructureId parameter',
            });
            return;
        }
        const report = await generateComplianceReport(fundStructureId);
        res.status(200).json(report);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({
                error: 'NOT_FOUND',
                message: error.message,
            });
            return;
        }
        console.error('Compliance report error:', error);
        res.status(500).json({
            error: 'INTERNAL_ERROR',
            message: 'Failed to generate compliance report',
        });
    }
});
export default router;
//# sourceMappingURL=compliance-report-routes.js.map